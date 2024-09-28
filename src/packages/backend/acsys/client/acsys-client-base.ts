import { AppException, AppExceptionCodeEnum, spinWait, validateObject, HeaderAuthorization, HeaderContentType, HeaderCookies, lookupValueOrThrow, type IAppLogger, type IAcsysUserOptions } from '@golobe-demo/shared';
import { verify, type JwtPayload } from 'jsonwebtoken';
import { type UserData, type AuthStatus, type IAcsysAuthState, type IAcsysClientBase, UserRoleEnum } from './interfaces';
import { ApiResponseTypes } from './interfaces';
import type { RegisterUserDto, AuthenticateDto, AuthenticateResponseDto, RefreshTokenResponseDto, SetInitialLocalDatabaseConfigDto } from './dto';
import type { HTTPMethod } from 'h3';
import { CookieAcsysEmail, CookieAcsysMode, CookieAcsysRefreshToken, CookieAcsysRole, CookieAcsysSession, CookieAcsysUser, CookieAcsysUserId, RouteInitialLocalDatabaseConfig, RouteAuthenticate, AuthKeeperTimerIntervalSec, RefreshAuthTokenWindowSec, RouteRefreshToken, DefaultOperationTimeoutSec, RouteIsConnected, RouteHasAdmin, RouteRegister, HeaderFileLastModifiedUtc } from './constants';
import { parseURL, stringifyQuery } from 'ufo';
import { destr } from 'destr';
import isObject from 'lodash-es/isObject';
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
      this.logger.error(`(AcsysClientBase) [${this.roleKind}] api secret not specified`);
      throw new AppException(AppExceptionCodeEnum.ACSYS_INTEGRATION_ERROR, 'incorrect acsys configuration', 'error-page');
    }

    const parsedUrl = parseURL(baseUrl);
    if(!parsedUrl.host) {
      this.logger.error(`(AcsysClientBase) [${this.roleKind}] cannot parse host baesUrl=${baseUrl}`);
      throw new Error('cannot parse host');
    }
    this.host = parsedUrl.host;

    this.logger.debug(`(AcsysClientBase) [${this.roleKind}] constructed, baseUrl=${this.baseUrl}, host=${this.host}`);
  }

  onClientUsersReady = () => {
    this.logger.debug(`(AcsysClientBase) [${this.roleKind}] on client users ready`);
    this.startAuthKeeper();
  };

  hasAdmin = async (): Promise<boolean> => {
    this.logger.debug(`(AcsysClientBase) [${this.roleKind}] sending has admin check`);
    const response = await this.fetch<ApiResponseTypes.json, any>(RouteHasAdmin, undefined, undefined, 'GET', undefined, false, ApiResponseTypes.json);
    const result = response?.value ?? false;
    this.logger.debug(`(AcsysClientBase) [${this.roleKind}] has admin check sent, result=${result}`);
    return result;
  };

  sendInitialLocalDatabaseConfig = async (projectName: string): Promise<boolean> => {
    this.logger.debug(`(AcsysClientBase) [${this.roleKind}] sending initial local database config`);

    const configDto: SetInitialLocalDatabaseConfigDto = {
      projectName
    };
    const response = await this.fetch<ApiResponseTypes.text>(RouteInitialLocalDatabaseConfig, undefined, configDto, 'POST', undefined, false, ApiResponseTypes.text);
    const result = response.toLowerCase() === 'true';

    this.logger.debug(`(AcsysClientBase) [${this.roleKind}] initial local database config sent, result=${result}`);
    return result;
  };

  register = async (adminUser: UserData): Promise<boolean> => {
    this.logger.debug(`(AcsysClientBase) [${this.roleKind}] registering admin user`);

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

    this.logger.debug(`(AcsysClientBase) [${this.roleKind}] admin user register request completed, result=${isSuccessfull}`);
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
      this.logger.warn(`(AcsysClientBase) [${this.roleKind}] authentication response does not contain token`);
      throw new AppException(AppExceptionCodeEnum.ACSYS_INTEGRATION_ERROR, 'authentication failed', 'error-page');
    }
    if(!response.refreshToken) {
      this.logger.warn(`(AcsysClientBase) [${this.roleKind}] authentication response does not contain refresh token`);
      throw new AppException(AppExceptionCodeEnum.ACSYS_INTEGRATION_ERROR, 'authentication failed', 'error-page');
    }
    let accessTokenPayload: JwtPayload, refreshTokenPayload: JwtPayload;
    try {
      accessTokenPayload = verify(response.token, this.apiSecret) as JwtPayload;
      refreshTokenPayload = verify(response.refreshToken, this.apiSecret) as JwtPayload;
    } catch(err: any) {
      this.logger.warn(`(AcsysClientBase) [${this.roleKind}] failed to verify tokens payload`, err);
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
    this.logger.verbose(`(AcsysClientBase) [${this.roleKind}] authenticating`);

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

    this.logger.verbose(`(AcsysClientBase) [${this.roleKind}] authenticated, exp=${result.accessToken.payload.exp ? (new Date(result.accessToken.payload.exp * 1000).toISOString()) : '(none)'}, role=${response.role}`);
    return  {
      ...result,
      acsys_id: response.acsys_id,
      role: lookupValueOrThrow(UserRoleEnum, response.role)
    };
  };

  refreshToken = async (): Promise<AuthSucceededEventOptions> => {
    this.logger.verbose(`(AcsysClientBase) [${this.roleKind}] refreshing token`);

    const response = await this.fetch<ApiResponseTypes.json, RefreshTokenResponseDto>(RouteRefreshToken, undefined, undefined, 'POST', undefined, 'accept-pending-status', ApiResponseTypes.json);
    const result = this.parseAuthResponse(response);

    this.logger.verbose(`(AcsysClientBase) [${this.roleKind}] token refreshed, exp=${result.accessToken.payload.exp ? (new Date(result.accessToken.payload.exp * 1000).toISOString()) : '(none)'}`);
    return result;
  };

  waitForNonPendingState = async (): Promise<void> => {
    if(this.authStatus === 'pending') {
      this.logger.verbose(`(AcsysClientBase) [${this.roleKind}] auth is in pending state, waiting`);
      await spinWait(() => Promise.resolve(this.authStatus !== 'pending'), DefaultOperationTimeoutSec * 1000);
      if(this.authStatus === 'pending') {
        this.logger.warn(`(AcsysClientBase) [${this.roleKind}] timeout while waiting for auth non-pending state`);
        throw new AppException(AppExceptionCodeEnum.ACSYS_INTEGRATION_ERROR, 'authentication timeout', 'error-stub');
      }
      this.logger.verbose(`(AcsysClientBase) [${this.roleKind}] auth now in non-pending state ${this.authStatus}`);
    }
  };


  dispatchAuthEvent = async (eventOptions: AuthEventOptions): Promise<void> => {
    this.logger.verbose(`(AcsysClientBase) [${this.roleKind}] dispatching event ${eventOptions.kind.valueOf()}`);

    const dispatchAttempAuth = async (): Promise<void> => {
      await this.waitForNonPendingState(); // in case of another outstanding auth requests
      if(this.authStatus === 'authenticated' && this.accessTokenInfo && !this.isExpirationTriggering(this.accessTokenInfo)) {
        this.logger.debug(`(AcsysClientBase) [${this.roleKind}] skipping ${AuthEventEnum.AttempAuth} dispatch, already authenticated`);
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
        this.logger.warn(`(AcsysClientBase) [${this.roleKind}] cannot refresh token as it is not initialized, obtaining another access token`);
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
          this.logger.error(`(AcsysClientBase) [${this.roleKind}] error unexpected event type ${(eventOptions as any).kind}`);
          if(this.authStatus !== 'failed') {
            await this.dispatchAuthEvent({ kind: AuthEventEnum.AuthFailed });
          }
      }

      this.logger.verbose(`(AcsysClientBase) [${this.roleKind}] dispatch ${eventOptions.kind.valueOf()} event completed`);
    } catch(err: any) {
      this.logger.warn(`(AcsysClientBase) [${this.roleKind}] exception occured while dispatching event ${eventOptions.kind.valueOf()}`, err);
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
    this.logger.debug(`(AcsysClientBase) [${this.roleKind}] refreshing auth status, current=${this.authStatus}`);
    if(this.authStatus === 'pending') {
      this.logger.debug(`(AcsysClientBase) [${this.roleKind}] skipping refresh because of pending auth status`);
      return;
    }

    try {
      if(!this.accessTokenInfo) {
        this.logger.verbose(`(AcsysClientBase) [${this.roleKind}] access token not present, obtaining`);
        await this.dispatchAuthEvent({ kind: AuthEventEnum.AttempAuth });
      }
      if(this.authStatus === 'failed') {
        this.logger.debug(`(AcsysClientBase) [${this.roleKind}] in failed state, postpone status refresh`);
        return;
      }
  
      if(!this.accessTokenInfo) {
        this.logger.warn(`(AcsysClientBase) [${this.roleKind}] access token not initialized, postpone status refresh`);
        return;
      }
      if(!this.isExpirationTriggering(this.accessTokenInfo)) {
        this.logger.debug(`(AcsysClientBase) [${this.roleKind}] auth token checked, no expiration triggering`);
        return;
      }
      this.logger.verbose(`(AcsysClientBase) [${this.roleKind}] auth token expiration triggering, refreshing`);
      await this.dispatchAuthEvent({ kind: AuthEventEnum.RefreshToken });
  
      this.logger.debug(`(AcsysClientBase) [${this.roleKind}] auth status refreshed, result=${this.authStatus}`);
    } catch(err: any) {
      this.logger.warn(`(AcsysClientBase) [${this.roleKind}] exception occured while refreshing auth status in timer callback`, err);
    }
  };
  
  startAuthKeeper = () => {
    this.logger.verbose(`(AcsysClientBase) [${this.roleKind}] starting auth keeper task`);
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
    this.logger.verbose(`(AcsysClientBase) [${this.roleKind}] fetch, path=${fullPath}, method=${method}, minRole=${minimumUserRole}, withAuth=${withAuth}, auth status=${this.authStatus}`, (isObject(body) && !(body instanceof FormData)) ? { query, body } : { query });

    const authorizationPassed = this.verifyMinimumUserRole(minimumUserRole);
    if(!authorizationPassed) {
      this.logger.warn(`(AcsysClientBase) [${this.roleKind}] authorization check failed, path=${fullPath}, method=${method}, minRole=${minimumUserRole}, auth status=${this.authStatus}, `, (isObject(body) && !(body instanceof FormData)) ? { query, body } : { query });
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
        this.logger.debug(`(AcsysClientBase) [${this.roleKind}] validating fetch body, path=${fullPath}, method=${method}`, isObject(body) ? { body } : {  });
        const validationError = await validateObject(body, bodyValidationSchema);
        if (validationError) {
          this.logger.warn(`(AcsysClientBase) [${this.roleKind}] fetch body validation failed, path=${fullPath}, method=${method}, minRole=${minimumUserRole}, withAuth=${withAuth}, auth status=${this.authStatus}, msg=${validationError.message}, issues=${validationError.errors?.join('; ') ?? '[empty]'}]`, isObject(body) ? { query, body } : { query });
          throw new AppException(AppExceptionCodeEnum.BAD_REQUEST, 'invalid request parameters', 'error-stub');
        }
        this.logger.debug(`(AcsysClientBase) [${this.roleKind}] fetch body validated, path=${fullPath}, method=${method}`, isObject(body) ? { body } : {  });
      }

      if(!(body instanceof FormData)) {
        this.logger.debug(`(AcsysClientBase) [${this.roleKind}] sending body as JSON, path=${fullPath}, method=${method}`);
        fetchParams.body = JSON.stringify(body);
      } else {
        this.logger.debug(`(AcsysClientBase) [${this.roleKind}] sending body as FormData, path=${fullPath}, method=${method}`);
        fetchParams.body = body;
      }
    }
    fetchParams.method = method;
    const queryStr = query ? stringifyQuery(query) : '';
    const url = `${this.baseUrl}/${fullPath}${queryStr ? `?${queryStr}` : ''}`;
    const response = await fetch(url, fetchParams);
    if(!response.ok) {
      this.logger.warn(`(AcsysClientBase) [${this.roleKind}] fetch failed, path=${fullPath}, method=${method}, minRole=${minimumUserRole}, withAuth=${withAuth}, auth status=${this.authStatus}, responseStatus=${response.status}, responseStatusText=${response.statusText}`, (isObject(body) && !(body instanceof FormData)) ? { query, body } : { query });
      throw new AppException(AppExceptionCodeEnum.ACSYS_INTEGRATION_ERROR, 'fetch failed', 'error-stub');
    }

    const parseBytesResponse = async (response: Response): Promise<FetchFileResponse> => {
      this.logger.verbose(`(AcsysClientBase) [${this.roleKind}] parsing bytes response, path=${fullPath}, method=${method}, minRole=${minimumUserRole}`);

      const bytes = Buffer.from(await response.arrayBuffer());

      let lastModifiedUtc: Date;
      const lastModifiedUtcStr = response.headers.get(HeaderFileLastModifiedUtc);
      if(!lastModifiedUtcStr) {
        this.logger.warn(`(AcsysClientBase) [${this.roleKind}] file response does not contain last modified time, path=${fullPath}, method=${method}, minRole=${minimumUserRole}, responseStatus=${response.status}, responseStatusText=${response.statusText}`, (isObject(body) && !(body instanceof FormData)) ? { query, body } : { query });
        throw new AppException(AppExceptionCodeEnum.ACSYS_INTEGRATION_ERROR, 'Unexpected Acsys file response', 'error-stub');
      }
      try {
        lastModifiedUtc = dayjs().utc().toDate();
      } catch(err: any) {
        this.logger.warn(`(AcsysClientBase) [${this.roleKind}] failed to parse file last modified time, value=${lastModifiedUtcStr}, path=${fullPath}, method=${method}, minRole=${minimumUserRole}, responseStatus=${response.status}, responseStatusText=${response.statusText}`, (isObject(body) && !(body instanceof FormData)) ? { query, body } : { query }, err);
        throw new AppException(AppExceptionCodeEnum.ACSYS_INTEGRATION_ERROR, 'Unexpected Acsys file last modified time value', 'error-stub');
      }
      
      const mimeType = response.headers.get(HeaderContentType);
      if(!mimeType) {
        this.logger.warn(`(AcsysClientBase) [${this.roleKind}] file response does not contain mimie type, path=${fullPath}, method=${method}, minRole=${minimumUserRole}, responseStatus=${response.status}, responseStatusText=${response.statusText}`, (isObject(body) && !(body instanceof FormData)) ? { query, body } : { query });
        throw new AppException(AppExceptionCodeEnum.ACSYS_INTEGRATION_ERROR, 'Unexpected Acsys file response', 'error-stub');
      }

      const result: FetchFileResponse = {
        bytes,
        lastModifiedUtc: lastModifiedUtc,
        mimeType
      };

      this.logger.verbose(`(AcsysClientBase) [${this.roleKind}] bytes response parsed, path=${fullPath}, method=${method}, minRole=${minimumUserRole}, size=${result.bytes.length}, mime=${result.mimeType}, lastModified=${lastModifiedUtc.toISOString()}`);
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

    this.logger.verbose(`(AcsysClientBase) [${this.roleKind}] fetch completed, path=${fullPath}, method=${method}, responseStatus=${response.status}, responseStatusText=${response.statusText}`);
    return result;
  };

  getAuthStatus = (): AuthStatus => {
    return this.authStatus === 'initial' ? 'pending' : this.authStatus;
  };

  ensureAuthenticated = async (acceptPendingStatus?: boolean): Promise<void> => {
    acceptPendingStatus ??= false;
    this.logger.debug(`(AcsysClientBase) [${this.roleKind}] ensure auth, acceptPendingStatus=${acceptPendingStatus}, current status=${this.authStatus}`);
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
        this.logger.warn(`(AcsysClientBase) [${this.roleKind}] failed to ensure autheticated status`);
        throw new AppException(AppExceptionCodeEnum.ACSYS_INTEGRATION_ERROR, 'authentication failed', 'error-stub'); 
      }
    }
    this.logger.debug(`(AcsysClientBase) [${this.roleKind}] authentication ensured, acceptPendingStatus=${acceptPendingStatus}, current status=${this.authStatus}`);
  };

  getClientType(): UserRoleEnum {
    return this.roleKind;
  }
  
  isConnected = async (): Promise<boolean> => {
    this.logger.debug(`(AcsysClientBase) [${this.roleKind}] check connected, current status=${this.authStatus}`);

    const response = await this.fetch<ApiResponseTypes.text>(RouteIsConnected, undefined, undefined, 'GET', undefined, false, ApiResponseTypes.text);
    const isConnectedStatus = response.toLowerCase() === 'true';
    
    this.logger.debug(`(AcsysClientBase) [${this.roleKind}] connected checked result=${isConnectedStatus}, current status=${this.authStatus}`);
    return isConnectedStatus;
  };
}
