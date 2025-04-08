import { AppException, AppExceptionCodeEnum, spinWait, validateObject, HeaderAuthorization, HeaderContentType, HeaderCookies, lookupValueOrThrow, type IAppLogger, type IAcsysUserOptions } from '@golobe-demo/shared';
import { verify, type JwtPayload } from 'jsonwebtoken';
import { type UserData, type AuthStatus, type IAcsysAuthState, type IAcsysClientBase, UserRoleEnum } from './interfaces';
import { ApiResponseTypes } from './interfaces';
import type { RegisterUserDto, AuthenticateDto, AuthenticateResponseDto, RefreshTokenResponseDto, SetInitialLocalDatabaseConfigDto } from './dto';
import type { HTTPMethod } from 'h3';
import { CookieAcsysEmail, CookieAcsysMode, CookieAcsysRefreshToken, CookieAcsysRole, CookieAcsysSession, CookieAcsysUser, CookieAcsysUserId, RouteInitialLocalDatabaseConfig, RouteAuthenticate, AuthKeeperTimerIntervalSec, RefreshAuthTokenWindowSec, RouteRefreshToken, DefaultOperationTimeoutSec, RouteIsConnected, RouteHasAdmin, RouteRegister, HeaderFileLastModifiedUtc } from './constants';
import { parseURL, stringifyQuery } from 'ufo';
import { destr } from 'destr';
import type { ObjectSchema } from 'yup';
import { setInterval as scheduleTimer } from 'timers';
import dayjs from 'dayjs';

type YupAnyObject = { [k: string]: any; };
type TokenInfo = { jwt: string, payload: JwtPayload };
enum AuthEventEnum {
  AttempAuth = 'AttempAuth',
  AuthSucceeded = 'AuthSucceeded',
  AuthFailed = 'AuthFailed',
  RefreshToken = 'RefreshToken'
};

type AuthSucceededEventOptions = {
  accessToken: TokenInfo, 
  refreshToken: TokenInfo
};

type UserInfoJwtPayload = {
  acsys_id: string,
  role: UserRoleEnum
};

type AuthEventOptions = 
  { kind: AuthEventEnum.AttempAuth } |
  ({ kind: AuthEventEnum.AuthSucceeded } & AuthSucceededEventOptions & Partial<UserInfoJwtPayload>) |
  { kind: AuthEventEnum.AuthFailed } |
  { kind: AuthEventEnum.RefreshToken };

type FetchFileResponse = { bytes: Buffer, mimeType: string, lastModifiedUtc: Date };

export class AcsysClientBase implements IAcsysClientBase, IAcsysAuthState { 
  protected readonly logger: IAppLogger;
  protected readonly userOptions: IAcsysUserOptions;
  protected readonly roleKind: UserRoleEnum;

  private readonly apiSecret: string;
  private readonly baseUrl: string;
  private readonly host: string;

  private authStatus: AuthStatus | 'initial';

  private accessTokenInfo: TokenInfo | undefined;
  private refreshTokenInfo: TokenInfo | undefined;
  private userInfo: UserInfoJwtPayload | undefined;

  constructor (baseUrl: string, userOptions: IAcsysUserOptions, roleKind: UserRoleEnum, logger: IAppLogger) {
    this.logger = logger;
    this.roleKind = roleKind;
    this.userOptions = userOptions;
    this.baseUrl = baseUrl;
    this.authStatus = 'initial';

    this.apiSecret = process.env.ACSYS_SECRET as string;
    if(!this.apiSecret) {
      this.logger.error('api secret not specified', undefined, { roleKind: this.roleKind });
      throw new AppException(AppExceptionCodeEnum.ACSYS_INTEGRATION_ERROR, 'incorrect acsys configuration', 'error-page');
    }

    const parsedUrl = parseURL(baseUrl);
    if(!parsedUrl.host) {
      this.logger.error('cannot parse host', undefined, { baesUrl: baseUrl, roleKind: this.roleKind });
      throw new Error('cannot parse host');
    }
    this.host = parsedUrl.host;

    this.logger.debug('constructed', { baseUrl: this.baseUrl, host: this.host, roleKind: this.roleKind });
  }

  onClientUsersReady = () => {
    this.logger.debug('on client users ready', { roleKind: this.roleKind });
    this.startAuthKeeper();
  };

  hasAdmin = async (): Promise<boolean> => {
    this.logger.debug('sending has admin check', { roleKind: this.roleKind });
    const response = await this.fetch<ApiResponseTypes.json, any>(RouteHasAdmin, undefined, undefined, 'GET', undefined, false, ApiResponseTypes.json);
    const result = response?.value ?? false;
    this.logger.debug('has admin check sent', { roleKind: this.roleKind, result });
    return result;
  };

  sendInitialLocalDatabaseConfig = async (projectName: string): Promise<boolean> => {
    this.logger.debug('sending initial local database config', { roleKind: this.roleKind });

    const configDto: SetInitialLocalDatabaseConfigDto = {
      projectName
    };
    const response = await this.fetch<ApiResponseTypes.text>(RouteInitialLocalDatabaseConfig, undefined, configDto, 'POST', undefined, false, ApiResponseTypes.text);
    const result = response.toLowerCase() === 'true';

    this.logger.debug('initial local database config sent', { roleKind: this.roleKind, result });
    return result;
  };

  register = async (adminUser: UserData): Promise<boolean> => {
    this.logger.debug('registering admin user', { roleKind: this.roleKind });

    const registerDto: RegisterUserDto = {
      data: {
        email: adminUser.email,
        mode: adminUser.role.valueOf(),
        role: adminUser.role.valueOf(),
        password: adminUser.password,
        username: adminUser.username
      }
    };
    const response = await this.fetch<ApiResponseTypes.json, any>(RouteRegister, undefined, registerDto, 'POST', undefined, false, ApiResponseTypes.json);
    const isSuccessfull = !!(response?.acsys_id);

    this.logger.debug('admin user register request completed', { roleKind: this.roleKind, result: isSuccessfull });
    return isSuccessfull;
  };

  /** 
   * Auth 
   */
  getCurrentAccessToken = (): string | undefined => {
    return this.accessTokenInfo?.jwt;
  };

  parseAuthResponse = (response: { token: string, refreshToken: string }): {
    accessToken: TokenInfo, 
    refreshToken: TokenInfo
  } => {
    if(!response.token) {
      this.logger.warn('authentication response does not contain token', undefined, { roleKind: this.roleKind });
      throw new AppException(AppExceptionCodeEnum.ACSYS_INTEGRATION_ERROR, 'authentication failed', 'error-page');
    }
    if(!response.refreshToken) {
      this.logger.warn('authentication response does not contain refresh token', undefined, { roleKind: this.roleKind });
      throw new AppException(AppExceptionCodeEnum.ACSYS_INTEGRATION_ERROR, 'authentication failed', 'error-page');
    }
    let accessTokenPayload: JwtPayload, refreshTokenPayload: JwtPayload;
    try {
      accessTokenPayload = verify(response.token, this.apiSecret) as JwtPayload;
      refreshTokenPayload = verify(response.refreshToken, this.apiSecret) as JwtPayload;
    } catch(err: any) {
      this.logger.warn('failed to verify tokens payload', err, { roleKind: this.roleKind });
      throw new AppException(AppExceptionCodeEnum.ACSYS_INTEGRATION_ERROR, 'failed to verify auth tokens', 'error-page');
    }

    return {
      accessToken: {
        jwt: response.token,
        payload: accessTokenPayload
      },
      refreshToken: {
        jwt: response.refreshToken,
        payload: refreshTokenPayload
      }
    };
  };

  authenticate = async (): Promise<AuthSucceededEventOptions & UserInfoJwtPayload> => {
    this.logger.verbose('authenticating', { roleKind: this.roleKind });

    const authDto: AuthenticateDto = {
      username: {
        username: this.userOptions.name
      },
      password: {
        password: this.userOptions.password
      }
    };
    const response = await this.fetch<ApiResponseTypes.json, AuthenticateResponseDto>(RouteAuthenticate, undefined, authDto, 'POST', undefined, false, ApiResponseTypes.json);
    const result = this.parseAuthResponse(response);

    const expFormatted = result.accessToken.payload.exp ? (new Date(result.accessToken.payload.exp * 1000).toISOString()) : '(none)';
    this.logger.verbose('authenticated', { roleKind: this.roleKind, exp: expFormatted, role: response.role });
    return  {
      ...result,
      acsys_id: response.acsys_id,
      role: lookupValueOrThrow(UserRoleEnum, response.role)
    };
  };

  refreshToken = async (): Promise<AuthSucceededEventOptions> => {
    this.logger.verbose('refreshing token', { roleKind: this.roleKind });

    const response = await this.fetch<ApiResponseTypes.json, RefreshTokenResponseDto>(RouteRefreshToken, undefined, undefined, 'POST', undefined, 'accept-pending-status', ApiResponseTypes.json);
    const result = this.parseAuthResponse(response);

    const expFormatted = result.accessToken.payload.exp ? (new Date(result.accessToken.payload.exp * 1000).toISOString()) : '(none)';
    this.logger.verbose('token refreshed', { roleKind: this.roleKind, exp: expFormatted });
    return result;
  };

  waitForNonPendingState = async (): Promise<void> => {
    if(this.authStatus === 'pending') {
      this.logger.verbose('auth is in pending state, waiting', { roleKind: this.roleKind });
      await spinWait(() => Promise.resolve(this.authStatus !== 'pending'), DefaultOperationTimeoutSec * 1000);
      if(this.authStatus === 'pending') {
        this.logger.warn('timeout while waiting for auth non-pending state', undefined, { roleKind: this.roleKind });
        throw new AppException(AppExceptionCodeEnum.ACSYS_INTEGRATION_ERROR, 'authentication timeout', 'error-stub');
      }
      this.logger.verbose('auth now in non-pending state', { roleKind: this.roleKind, authStatus: this.authStatus });
    }
  };


  dispatchAuthEvent = async (eventOptions: AuthEventOptions): Promise<void> => {
    this.logger.verbose('dispatching event', { kind: eventOptions.kind.valueOf(), roleKind: this.roleKind });

    const dispatchAttempAuth = async (): Promise<void> => {
      await this.waitForNonPendingState(); // in case of another outstanding auth requests
      if(this.authStatus === 'authenticated' && this.accessTokenInfo && !this.isExpirationTriggering(this.accessTokenInfo)) {
        this.logger.debug('skipping dispatch, already authenticated', { roleKind: this.roleKind, event: AuthEventEnum.AttempAuth });
        return;
      }

      this.authStatus = 'pending';
      const authResult = await this.authenticate();
      await this.dispatchAuthEvent({ 
        kind: AuthEventEnum.AuthSucceeded, 
        accessToken: authResult.accessToken, 
        refreshToken: authResult.refreshToken,
        acsys_id: authResult.acsys_id,
        role: authResult.role 
      });
    };

    const dispatchRefreshToken = async (): Promise<void> => {
      await this.waitForNonPendingState(); // in case of another outstanding auth requests

      if(this.refreshTokenInfo === undefined) {
        this.logger.warn('cannot refresh token as it is not initialized, obtaining another access token', undefined, { roleKind: this.roleKind });
        await this.dispatchAuthEvent({ kind: AuthEventEnum.AttempAuth });
        return;
      }

      this.authStatus = 'pending';
      const authResult = await this.refreshToken();
      await this.dispatchAuthEvent({ 
        kind: AuthEventEnum.AuthSucceeded, 
        accessToken: authResult.accessToken, 
        refreshToken: authResult.refreshToken }
      );
    };

    const dispatchAuthSucceeded = async (eventOptions: AuthSucceededEventOptions & Partial<UserInfoJwtPayload>): Promise<void> => {
      this.accessTokenInfo = eventOptions.accessToken;
      this.refreshTokenInfo = eventOptions.refreshToken;
      if(eventOptions.acsys_id && eventOptions.role) {
        this.userInfo = {
          acsys_id: eventOptions.acsys_id,
          role: eventOptions.role
        };
      }
      this.authStatus = 'authenticated';
    };

    try {
      switch(eventOptions.kind) {
        case AuthEventEnum.AttempAuth:
          await dispatchAttempAuth();
          break;
        case AuthEventEnum.AuthSucceeded:
          await dispatchAuthSucceeded(eventOptions);
          break;
        case AuthEventEnum.AuthFailed: 
          this.accessTokenInfo = undefined;
          this.refreshTokenInfo = undefined;
          this.authStatus = 'failed';
          break;
        case AuthEventEnum.RefreshToken:
          await dispatchRefreshToken();
          break;
        default:
          this.logger.error('error unexpected event type', undefined, { roleKind: this.roleKind, event: (eventOptions as any).kind });
          if(this.authStatus !== 'failed') {
            await this.dispatchAuthEvent({ kind: AuthEventEnum.AuthFailed });
          }
      }

      this.logger.verbose('dispatch event completed', { roleKind: this.roleKind, event: eventOptions.kind.valueOf() });
    } catch(err: any) {
      this.logger.warn('exception occured while dispatching', err, { roleKind: this.roleKind, event: eventOptions.kind.valueOf() });
      if(this.authStatus !== 'failed') {
        await this.dispatchAuthEvent({ kind: AuthEventEnum.AuthFailed });
      }
      throw err;
    }
  };

  isExpirationTriggering = (token: TokenInfo): boolean => {
    if(!token.payload.exp) {
      return false;
    }

    const today = parseInt(new Date().getTime().toString().substring(0, 10));
    const difference = token.payload.exp - today;
    return difference <= RefreshAuthTokenWindowSec;
  };

  refreshAuthTimerCallback = async (): Promise<void> => {
    this.logger.debug('refreshing auth status', { roleKind: this.roleKind, current: this.authStatus });
    if(this.authStatus === 'pending') {
      this.logger.debug('skipping refresh because of pending auth status', { roleKind: this.roleKind });
      return;
    }

    try {
      if(!this.accessTokenInfo) {
        this.logger.verbose('access token not present, obtaining', { roleKind: this.roleKind });
        await this.dispatchAuthEvent({ kind: AuthEventEnum.AttempAuth });
      }
      if(this.authStatus === 'failed') {
        this.logger.debug('in failed state, postpone status refresh', { roleKind: this.roleKind });
        return;
      }
  
      if(!this.accessTokenInfo) {
        this.logger.warn('access token not initialized, postpone status refresh', undefined, { roleKind: this.roleKind });
        return;
      }
      if(!this.isExpirationTriggering(this.accessTokenInfo)) {
        this.logger.debug('auth token checked, no expiration triggering', { roleKind: this.roleKind });
        return;
      }
      this.logger.verbose('auth token expiration triggering, refreshing', { roleKind: this.roleKind });
      await this.dispatchAuthEvent({ kind: AuthEventEnum.RefreshToken });
  
      this.logger.debug('auth status refreshed', { roleKind: this.roleKind, result: this.authStatus });
    } catch(err: any) {
      this.logger.warn('exception occured while refreshing auth status in timer callback', err, { roleKind: this.roleKind });
    }
  };
  
  startAuthKeeper = () => {
    this.logger.verbose('starting auth keeper task', { roleKind: this.roleKind });
    scheduleTimer(this.refreshAuthTimerCallback, AuthKeeperTimerIntervalSec * 1000);
    this.refreshAuthTimerCallback();
  };

  /** 
   * Implementation 
   */
  verifyMinimumUserRole = (minimumUserRole: UserRoleEnum | undefined): boolean => {
    if(!minimumUserRole) {
      return true;
    }

    switch(minimumUserRole) {
      case UserRoleEnum.Viewer:
        return true;
      case UserRoleEnum.Standard:
        return this.roleKind === UserRoleEnum.Standard || this.roleKind === UserRoleEnum.Administrator;
      default:
        return this.roleKind === UserRoleEnum.Administrator;
    }
  };

  fetch = async <TRespType extends ApiResponseTypes, 
    TRes = TRespType extends ApiResponseTypes.text ? 'string' : 
      (TRespType extends ApiResponseTypes.bytes ? FetchFileResponse : unknown),
      TReqSchema extends ObjectSchema<YupAnyObject> = ObjectSchema<YupAnyObject>>
    (fullPath: string, query: any, body: any, method: HTTPMethod, minimumUserRole: UserRoleEnum | undefined, withAuth: boolean | 'accept-pending-status', respType: ApiResponseTypes, bodyValidationSchema?: TReqSchema): Promise<TRes> => 
  {
    this.logger.verbose('fetch', { roleKind: this.roleKind, path: fullPath, method, minRole: minimumUserRole, withAuth, status: this.authStatus });

    const authorizationPassed = this.verifyMinimumUserRole(minimumUserRole);
    if(!authorizationPassed) {
      this.logger.warn('authorization check failed', undefined, { roleKind: this.roleKind, path: fullPath, method, minRole: minimumUserRole, status: this.authStatus });
      throw new AppException(AppExceptionCodeEnum.ACSYS_INTEGRATION_ERROR, 'unexpected error', 'error-page');
    }

    const addAuthHeaders = withAuth;
    if(withAuth) {
      await this.ensureAuthenticated(withAuth === 'accept-pending-status');
    }
    const fetchParams: RequestInit = {
      headers: [
        ['Accept', '*/*'],
        ['Accept-Encoding', 'deflate, gzip, br'],
        ['Cache-Control', 'no-store'],
        ['Host', this.host],
        ...(addAuthHeaders ? 
          [[HeaderAuthorization, `Bearer ${this.accessTokenInfo?.jwt}`] as [string, string],
            [HeaderCookies, 
            [`${CookieAcsysEmail}=${this.userOptions.email}`,
              `${CookieAcsysMode}=${this.userInfo?.role}`, 
              `${CookieAcsysRefreshToken}=${this.refreshTokenInfo?.jwt}`, 
              `${CookieAcsysRole}=${this.roleKind.valueOf()}`,
              `${CookieAcsysSession}=${this.accessTokenInfo?.jwt}`, 
              `${CookieAcsysUserId}=${this.userInfo?.acsys_id}`,
              `${CookieAcsysUser}=${this.userOptions.name}`]
            .join('; ')] as [string, string]] : []),
        ...(body && !(body instanceof FormData) ? [['Content-Type', 'application/json']] as [string, string][]: [])
      ]
    };

    if(body) {
      if(!(body instanceof FormData) && bodyValidationSchema) {
        this.logger.debug('validating fetch body', { roleKind: this.roleKind, path: fullPath, method });
        const validationError = await validateObject(body, bodyValidationSchema);
        if (validationError) {
          this.logger.warn('fetch body validation failed', undefined, { roleKind: this.roleKind, path: fullPath, method, minRole: minimumUserRole, withAuth, status: this.authStatus, msg: validationError.message });
          throw new AppException(AppExceptionCodeEnum.BAD_REQUEST, 'invalid request parameters', 'error-stub');
        }
        this.logger.debug('fetch body validated', { roleKind: this.roleKind, path: fullPath, method });
      }

      if(!(body instanceof FormData)) {
        this.logger.debug('sending body as JSON', { roleKind: this.roleKind, path: fullPath, method });
        fetchParams.body = JSON.stringify(body);
      } else {
        this.logger.debug('sending body as FormData', { roleKind: this.roleKind, path: fullPath, method });
        fetchParams.body = body;
      }
    }
    fetchParams.method = method;
    const queryStr = query ? stringifyQuery(query) : '';
    const url = `${this.baseUrl}/${fullPath}${queryStr ? `?${queryStr}` : ''}`;
    const response = await fetch(url, fetchParams);
    if(!response.ok) {
      this.logger.warn('fetch failed', undefined, { roleKind: this.roleKind, path: fullPath, method, minRole: minimumUserRole, withAuth, status: this.authStatus, responseStatus: response.status, responseStatusText: response.statusText });
      throw new AppException(AppExceptionCodeEnum.ACSYS_INTEGRATION_ERROR, 'fetch failed', 'error-stub');
    }

    const parseBytesResponse = async (response: Response): Promise<FetchFileResponse> => {
      this.logger.verbose('parsing bytes response', { roleKind: this.roleKind, path: fullPath, method, minRole: minimumUserRole });

      const bytes = Buffer.from(await response.arrayBuffer());

      let lastModifiedUtc: Date;
      const lastModifiedUtcStr = response.headers.get(HeaderFileLastModifiedUtc);
      if(!lastModifiedUtcStr) {
        this.logger.warn('file response does not contain last modified time', undefined, { roleKind: this.roleKind, path: fullPath, method, minRole: minimumUserRole, responseStatus: response.status, responseStatusText: response.statusText });
        throw new AppException(AppExceptionCodeEnum.ACSYS_INTEGRATION_ERROR, 'Unexpected Acsys file response', 'error-stub');
      }
      try {
        lastModifiedUtc = dayjs().utc().toDate();
      } catch(err: any) {
        this.logger.warn('failed to parse file last modified time', err, { roleKind: this.roleKind, value: lastModifiedUtcStr, path: fullPath, method, minRole: minimumUserRole, responseStatus: response.status, responseStatusText: response.statusText });
        throw new AppException(AppExceptionCodeEnum.ACSYS_INTEGRATION_ERROR, 'Unexpected Acsys file last modified time value', 'error-stub');
      }
      
      const mimeType = response.headers.get(HeaderContentType);
      if(!mimeType) {
        this.logger.warn('file response does not contain mime type', undefined, { roleKind: this.roleKind, path: fullPath, method, minRole: minimumUserRole, responseStatus: response.status, responseStatusText: response.statusText });
        throw new AppException(AppExceptionCodeEnum.ACSYS_INTEGRATION_ERROR, 'Unexpected Acsys file response', 'error-stub');
      }

      const result: FetchFileResponse = {
        bytes,
        lastModifiedUtc: lastModifiedUtc,
        mimeType
      };

      this.logger.verbose('bytes response parsed', { roleKind: this.roleKind, path: fullPath, method, minRole: minimumUserRole, size: result.bytes.length, mime: result.mimeType, lastModified: lastModifiedUtc.toISOString() });
      return result;
    };

    let result: TRes;
    switch(respType) {
      case ApiResponseTypes.text:
        result = (await response.text()) as TRes;
        break;
      case ApiResponseTypes.json:
        result = destr<TRes>(await response.json());
        break;
      case ApiResponseTypes.bytes:
        result = await parseBytesResponse(response) as TRes;
        break;
      default:
        throw new Error('Not implemented');
    }

    this.logger.verbose('fetch completed', { roleKind: this.roleKind, path: fullPath, method, responseStatus: response.status, responseStatusText: response.statusText });
    return result;
  };

  getAuthStatus = (): AuthStatus => {
    return this.authStatus === 'initial' ? 'pending' : this.authStatus;
  };

  ensureAuthenticated = async (acceptPendingStatus?: boolean): Promise<void> => {
    acceptPendingStatus ??= false;
    this.logger.debug('ensure auth', { roleKind: this.roleKind, acceptPendingStatus, status: this.authStatus });
    switch(this.authStatus) {
      case 'initial':
      case 'failed':
        await this.dispatchAuthEvent({ kind: AuthEventEnum.AttempAuth });
        break;
    }
    if(this.authStatus !== 'authenticated') {
      if(this.authStatus === 'pending' && !acceptPendingStatus) {
        await this.waitForNonPendingState(); // in case of another outstanding auth requests
      }
      if((this.authStatus as any) !== 'authenticated') {
        this.logger.warn('failed to ensure autheticated status', undefined, { roleKind: this.roleKind });
        throw new AppException(AppExceptionCodeEnum.ACSYS_INTEGRATION_ERROR, 'authentication failed', 'error-stub'); 
      }
    }
    this.logger.debug('authentication ensured', { roleKind: this.roleKind, acceptPendingStatus, status: this.authStatus });
  };

  getClientType(): UserRoleEnum {
    return this.roleKind;
  }
  
  isConnected = async (): Promise<boolean> => {
    this.logger.debug('check connected', { roleKind: this.roleKind, status: this.authStatus });

    const response = await this.fetch<ApiResponseTypes.text>(RouteIsConnected, undefined, undefined, 'GET', undefined, false, ApiResponseTypes.text);
    const isConnectedStatus = response.toLowerCase() === 'true';
    
    this.logger.debug('connected checked', { roleKind: this.roleKind, result: isConnectedStatus, status: this.authStatus });
    return isConnectedStatus;
  };
}
