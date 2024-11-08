import { QueryPagePreviewModeParam, AppConfig, type IAppLogger, AppException, AppExceptionCodeEnum, mapAppExceptionToHttpStatus, validateObject, isQuickStartEnv, HeaderAppVersion, testHeaderValue } from '@golobe-demo/shared';
import type { H3Event, EventHandler, EventHandlerRequest, EventHandlerResponse } from 'h3';
import axios from 'axios';
import { withQuery } from 'ufo';
import { type ObjectSchema } from 'yup';
import omit from 'lodash-es/omit';
import { type IApiErrorDto, type ICaptchaVerificationDto } from '../api-definitions';
import { getServerSession } from '#auth';
import { getCommonServices } from '../../helpers/service-accessors';

type YupMaybe<T> = T | null | undefined;
type YupAnyObject = { [k: string]: any; };

export interface IWebApiEventHandlerOptions<TBodySchema extends YupMaybe<YupAnyObject> = any> {
  logResponseBody: boolean,
  authorizedOnly: boolean,
  validationSchema?: ObjectSchema<TBodySchema>,
  captchaProtected?: boolean,
  allowedEnvironments?: ('development' | 'test' | 'production' | 'quickstart')[]
}

function wrapHandler<Request extends EventHandlerRequest = EventHandlerRequest, Response = EventHandlerResponse, TBodySchema extends YupMaybe<YupAnyObject> = any> (
  originalHandler: EventHandler<Request, Promise<Response>>,
  options: IWebApiEventHandlerOptions<TBodySchema>)
    : EventHandler<Request, Promise<Response | IApiErrorDto>> {
  return defineEventHandler(async (event) => {
    const logger = getCommonServices().getLogger();

    const { logResponseBody, authorizedOnly, validationSchema, captchaProtected, allowedEnvironments } = options;

    let requestAppVersion: string = '';

    try {
      requestAppVersion = getRequestHeader(event, HeaderAppVersion) ?? '';

      if (!checkAllowedEnvironments(allowedEnvironments)) {
        logger.warn(`endpoint is not available in current environment, url=${event.node.req.url}, env=${process.env.NODE_ENV}`);
        throw new AppException(AppExceptionCodeEnum.FORBIDDEN, 'endpoint is not available', 'error-page');
      }

      if (authorizedOnly) {
        await ensureAuthorization(event);
      }

      let reqBody = null as any;
      let contentType: 'json' | 'text' | 'any';
      if (testHeaderValue(event.node.req.headers['content-type'] ?? '', 'application/json')) {
        contentType = 'json';
      } else if (testHeaderValue(event.node.req.headers['content-type'] ?? '', 'text/plain')) {
        contentType = 'text';
      } else {
        contentType = 'any';
      }
      if (contentType === 'json' || contentType === 'text') {
        reqBody = await readBody(event);
      }
      
      const isAuthorized = !!(await getServerSession(event));
      logger.info(`received request (appVer=${requestAppVersion}) - ${event.node.req.url} (auth=${isAuthorized})`, reqBody ?? '');

      if (contentType === 'json' && validationSchema) {
        const validationError = await validateObject(omit(reqBody, QueryPagePreviewModeParam), validationSchema);
        if (validationError) {
          logger.warn(`input data does not match schema, url=${event.node.req.url}, msg=${validationError.message}, issues=${validationError.errors.join('; ')}]`, undefined, reqBody);
          throw new AppException(AppExceptionCodeEnum.BAD_REQUEST, 'input data does not match schema', 'error-stub');
        }
      }

      if (captchaProtected && AppConfig.reCaptcha.enabled) {
        if (contentType !== 'json') {
          logger.warn(`endpoint requires captcha verification but received content is not in a JSON format, url=${event.node.req.url}, contentType=${contentType}`);
          throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'unexpected content type', 'error-stub');
        }
        await verifyCaptcha(reqBody as ICaptchaVerificationDto, event, logger);
      }

      const result = await originalHandler(event);
      const logMsg = `request finished - ${event.node.req.url} - code ${event.node.res.statusCode}` +
        (event.node.res?.statusMessage ? `(msg: ${event.node.res?.statusMessage})` : '');
      if (event.node.res.statusCode < 400) {
        logger.info(logMsg, logResponseBody ? (result as object) : undefined);
      } else {
        logger.warn(logMsg, logResponseBody ? (result as object) : undefined);
      }
      return result;
    } catch (err: any) {
      const { errorDto, httpStatus } = handleErrorResponse(event, err, requestAppVersion, logger);
      setResponseStatus(event, httpStatus);
      return errorDto;
    }
  });
}

function handleErrorResponse (event: H3Event, err: any, requestAppVersion: string, logger: IAppLogger): { errorDto: IApiErrorDto, httpStatus: number } {
  let httpStatus: number = 500;
  let errorDto: IApiErrorDto;

  if (AppException.isAppException(err)) {
    const appException = err as AppException;
    logger.warn(`app exception at ${event.node.req.url} (appVer=${requestAppVersion}) - ${appException.internalMsg}, code: ${appException.code}, stack: [${appException.stack}]`, err);
    errorDto = buildErrorResponseDtoFromAppException(appException);
    httpStatus = mapAppExceptionToHttpStatus(appException.code);
  } else {
    const errd = new Error(err as any);
    logger.warn(`exception occured at ${event.node.req.url} - ${errd.message}, cause ${errd.cause}, stack: [${err?.stack ?? errd.stack}]`);
    errorDto = buildErrorResponseDto(err);
  }

  return { errorDto, httpStatus };
}

function checkAllowedEnvironments (environments?: ('development' | 'test' | 'production' | 'quickstart')[]): boolean {
  if (!environments) {
    return true;
  }

  if (environments.includes('test') && process.env.VITEST) {
    return true;
  }

  if (environments.includes('quickstart') && isQuickStartEnv()) {
    return true;
  }

  return environments.includes(process.env.NODE_ENV.toLowerCase() as any);
}

function buildErrorResponseDto (err: any): IApiErrorDto {
  let appException: AppException;
  if (AppException.isAppException(err)) {
    appException = err as AppException;
  } else {
    appException = new AppException(
      AppExceptionCodeEnum.UNKNOWN,
      'unhandled exception occured on server',
      'error-stub');
  }

  return buildErrorResponseDtoFromAppException(appException);
}

function buildErrorResponseDtoFromAppException (appException: AppException): IApiErrorDto {
  return {
    code: appException.code,
    appearance: appException.appearance,
    internalMsg: appException.internalMsg,
    params: appException.params
  };
}

async function verifyCaptcha (captchaDto: ICaptchaVerificationDto, event: H3Event, logger: IAppLogger): Promise<void> {
  if (!captchaDto.captchaToken) {
    logger.warn(`captcha token is not present, url=${event.node.req.url}`);
    throw new AppException(AppExceptionCodeEnum.CAPTCHA_VERIFICATION_FAILED, 'captcha verification failed (token not present)', 'error-stub');
  }

  let verificationResponse: any;
  try {
    const captchaVerificationParams = {
      secret: import.meta.env.GOOGLE_RECAPTCHA_SECRETKEY,
      response: captchaDto.captchaToken
    };
    const verificationUrl = withQuery('https://www.google.com/recaptcha/api/siteverify', captchaVerificationParams);
    verificationResponse = await axios.post(verificationUrl);
  } catch (err: any) {
    logger.warn(`captcha server verification exception, url=${event.node.req.url}`, err);
    throw new AppException(AppExceptionCodeEnum.CAPTCHA_VERIFICATION_FAILED, 'captcha verification exception', 'error-stub');
  }

  const success = (verificationResponse as any)?.data?.success;
  const score = (verificationResponse as any)?.data?.score;
  if (success) {
    logger.info(`captcha verified on server successfully, url=${event.node.req.url}, score=${score}`);
  } else {
    logger.warn(`captcha server verification failed, url=${event.node.req.url}, score=${score}`, verificationResponse?.data);
    throw new AppException(AppExceptionCodeEnum.CAPTCHA_VERIFICATION_FAILED, 'captcha verification failed', 'error-stub');
  }
}

async function ensureAuthorization (event: H3Event) : Promise<void> {
  const session = await getServerSession(event);
  if (!session) {
    throw new AppException(AppExceptionCodeEnum.UNAUTHENTICATED, `Unauthenticated access attempt at route: url=${event.node.req.url}`, 'error-stub');
  }
}

const defineWebApiEventHandler = function defineWebApiEventHandler<Request extends EventHandlerRequest = EventHandlerRequest, Response = EventHandlerResponse, TBodySchema extends YupMaybe<YupAnyObject> = any> (handler: EventHandler<Request, Promise<Response>>, options: IWebApiEventHandlerOptions<TBodySchema>) : EventHandler<Request, Promise<Response | IApiErrorDto>> {
  return defineEventHandler(wrapHandler(handler, options));
};

export { defineWebApiEventHandler };
