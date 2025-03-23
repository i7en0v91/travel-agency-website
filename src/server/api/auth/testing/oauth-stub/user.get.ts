import type { IAppLogger } from '@golobe-demo/shared';
import { OAUTH_SECRET, OAUTH_TOKEN_TYPE } from './../../../../../helpers/testing';
import { verify, type JwtPayload } from 'jsonwebtoken';
import type { H3Event } from 'h3';
import { getLogger as getWebApiLogger } from '../../../../utils/webapi-event-handler';

const extractToken = (authHeaderValue: string) => {
  const [, token] = authHeaderValue.split(`${OAUTH_TOKEN_TYPE} `);
  return token;
};

const ensureAuth = (logger: IAppLogger, event: H3Event) => {
  logger.verbose('ensuring auth');
  const authHeaderValue = getRequestHeader(event, 'authorization');
  if (typeof authHeaderValue === 'undefined') {
    logger.warn('need to pass valid Bearer-authorization header to access this endpoint');
    throw createError({ statusCode: 403, statusMessage: 'Need to pass valid Bearer-authorization header to access this endpoint' });
  }

  const extractedToken = extractToken(authHeaderValue);
  try {
    const verificationResult = verify(extractedToken, OAUTH_SECRET);
    logger.verbose('verified successfully');
    return verificationResult;
  } catch (error) {
    logger.warn('Login failed', error);
    throw createError({ statusCode: 403, statusMessage: 'You must be logged in to use this endpoint' });
  }
};

export default defineWebApiEventHandler((event: H3Event): Promise<string | JwtPayload> => {
  const logger = getWebApiLogger();
  logger.verbose('enter');
  const user = ensureAuth(logger, event);
  logger.verbose('exit');
  return Promise.resolve(user);
}, { logResponseBody: false, authorizedOnly: false, allowedEnvironments: ['test', 'development', 'quickstart', 'electron'] });
