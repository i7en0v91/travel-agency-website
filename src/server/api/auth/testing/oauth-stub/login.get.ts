 
import { sign } from 'jsonwebtoken';
import type { H3Event } from 'h3';
import { withQuery } from 'ufo';
import { OAUTH_SECRET, OAUTH_TESTUSER_PROFILE as testUserProfile } from '../../../../../shared/testing/common';
import { AuthProvider, type EntityId } from '../../../../../shared/interfaces';
import { AppException, AppExceptionCodeEnum } from '../../../../../shared/exceptions';

const refreshTokens: Record<number, Record<string, any>> = {};

declare type LoginResult = {
  token: {
      accessToken: string;
      refreshToken: number;
  }
};

async function ensureAppUser (): Promise<EntityId> {
  const logger = CommonServicesLocator.getLogger();
  logger.info('(oauth-stub:login) setting up user TestLocal profile');

  const userLogic = ServerServicesLocator.getUserLogic();
  const userId = (await userLogic.ensureOAuthUser(AuthProvider.TestLocal, testUserProfile.sub, testUserProfile.firstName, testUserProfile.lastName, testUserProfile.email, true)).id;
  logger.info(`(oauth-stub:login) test user exists in DB, userId=${userId}`);
  return userId;
}

function buildRedirectUrl (event: H3Event): string {
  const requestQuery = getQuery(event);
  const logger = CommonServicesLocator.getLogger();
  logger.verbose('(oauth-stub:login) building redirect uri');

  const { redirect_uri, response_type, state } = requestQuery;
  if (!redirect_uri) {
    logger.warn('(oauth-stub:login) redirect_uri was not specified');
    throw new AppException(AppExceptionCodeEnum.BAD_REQUEST, 'redirect_uri was not specified', 'error-page');
  }

  if (!state) {
    logger.warn(`(oauth-stub:login) state was not specified, redirect_uri=${redirect_uri}`);
    throw new AppException(AppExceptionCodeEnum.BAD_REQUEST, 'redirect_uri was not specified', 'error-page');
  }

  if (response_type !== 'code') {
    logger.warn(`(oauth-stub:login) currently only [code] response type is supported, got response_type=${response_type}, redirect_uri=${redirect_uri}`);
    throw new AppException(AppExceptionCodeEnum.BAD_REQUEST, 'only response_type [code] is supported at them moment by TestLocal provider', 'error-page');
  }

  const result = withQuery(redirect_uri as string, { response_type, state });
  logger.verbose(`(oauth-stub:login) result redirect_uri, address=${redirect_uri}`);
  return result;
}

export default defineWebApiEventHandler(async (event: H3Event): Promise<LoginResult> => {
  const logger = CommonServicesLocator.getLogger();
  logger.info('(oauth-stub:login) enter');

  const expiresIn = 15;
  const refreshToken = Math.floor(Math.random() * (1000000000000000 - 1 + 1)) + 1;
  const user = {
    name: testUserProfile.login,
    ...testUserProfile
  };

  const userId = await ensureAppUser();
  user.id = userId.toString();

  const accessToken = sign({ ...user, scope: ['test', 'user'] }, OAUTH_SECRET, { expiresIn });
  refreshTokens[refreshToken] = {
    accessToken,
    user
  };

  setResponseStatus(event, 302);
  setHeader(event, 'location', buildRedirectUrl(event));

  logger.info('(oauth-stub:login) exit');
  return {
    token: {
      accessToken,
      refreshToken
    }
  };
}, { logResponseBody: true, authorizedOnly: false, allowedEnvironments: ['test', 'development', 'quickstart'] });
