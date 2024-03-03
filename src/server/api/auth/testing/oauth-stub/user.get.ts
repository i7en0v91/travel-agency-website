import { verify, type JwtPayload } from 'jsonwebtoken';
import { H3Event } from 'h3';
import { OAUTH_SECRET, OAUTH_TOKEN_TYPE } from '../../../../../shared/testing/common';

const extractToken = (authHeaderValue: string) => {
  const [, token] = authHeaderValue.split(`${OAUTH_TOKEN_TYPE} `);
  return token;
};

const ensureAuth = (event: H3Event) => {
  const logger = CommonServicesLocator.getLogger();
  logger.verbose('(oauth-stub:user) ensuring auth');
  const authHeaderValue = getRequestHeader(event, 'authorization');
  if (typeof authHeaderValue === 'undefined') {
    const msg = 'Need to pass valid Bearer-authorization header to access this endpoint';
    logger.warn(`(oauth-stub:user) ${msg}`);
    throw createError({ statusCode: 403, statusMessage: msg });
  }

  const extractedToken = extractToken(authHeaderValue);
  try {
    const verificationResult = verify(extractedToken, OAUTH_SECRET);
    logger.verbose('(oauth-stub:user) verified successfully', verificationResult);
    return verificationResult;
  } catch (error) {
    logger.warn('(oauth-stub:user) Login failed', error);
    throw createError({ statusCode: 403, statusMessage: 'You must be logged in to use this endpoint' });
  }
};

export default defineWebApiEventHandler((event: H3Event): Promise<string | JwtPayload> => {
  const logger = CommonServicesLocator.getLogger();
  logger.verbose('(oauth-stub:user) enter');
  const user = ensureAuth(event);
  logger.verbose('(oauth-stub:user) exit');
  return Promise.resolve(user);
}, { logResponseBody: false, authorizedOnly: false, allowedEnvironments: ['test', 'development', 'quickstart'] });
