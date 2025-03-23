import { AppException, AppExceptionCodeEnum, AuthProvider, type EntityId, type IAppLogger } from '@golobe-demo/shared';
import { OAUTH_SECRET, OAUTH_TESTUSER_PROFILE as testUserProfile } from '../../../../../helpers/testing'; 
import { sign } from 'jsonwebtoken';
import type { H3Event } from 'h3';
import { withQuery } from 'ufo';
import { getServerServices } from '../../../../../helpers/service-accessors';
import { getLogger as getWebApiLogger } from '../../../../utils/webapi-event-handler';

const refreshTokens: Record<number, Record<string, any>> = {};

declare type LoginResult = {
  token: {
      accessToken: string;
      refreshToken: number;
  }
};

async function ensureAppUser (logger: IAppLogger): Promise<EntityId> {
  logger.info('setting up user TestLocal profile');

  const userLogic = getServerServices()!.getUserLogic();
  const userId = (await userLogic.ensureOAuthUser(AuthProvider.TestLocal, testUserProfile.sub, testUserProfile.firstName, testUserProfile.lastName, testUserProfile.email, true)).id;
  logger.info('test user exists in DB', userId);
  return userId;
}

function buildRedirectUrl (logger: IAppLogger, event: H3Event): string {
  const requestQuery = getQuery(event);
  logger.verbose('building redirect uri');

  const { redirect_uri: redirectUri, response_type: responseType, state } = requestQuery;
  if (!redirectUri) {
    logger.warn('redirectUri was not specified');
    throw new AppException(AppExceptionCodeEnum.BAD_REQUEST, 'redirectUri was not specified', 'error-page');
  }

  if (!state) {
    logger.warn('state was not specified', undefined, redirectUri);
    throw new AppException(AppExceptionCodeEnum.BAD_REQUEST, 'redirectUri was not specified', 'error-page');
  }

  if (responseType !== 'code') {
    logger.warn('currently only [code] response type is supported, got', undefined, { responseType, redirectUri });
    throw new AppException(AppExceptionCodeEnum.BAD_REQUEST, 'only responseType [code] is supported at them moment by TestLocal provider', 'error-page');
  }

  const result = withQuery(redirectUri as string, { responseType, state });
  logger.verbose('result redirectUri', { address: redirectUri });
  return result;
}

export default defineWebApiEventHandler(async (event: H3Event): Promise<LoginResult> => {
  const logger = getWebApiLogger();
  logger.info('enter');

  const expiresIn = 15;
  const refreshToken = Math.floor(Math.random() * (1000000000000000 - 1 + 1)) + 1;
  const user = {
    name: testUserProfile.login,
    ...testUserProfile
  };

  const userId = await ensureAppUser(logger);
  user.id = userId.toString();

  const accessToken = sign({ ...user, scope: ['test', 'user'] }, OAUTH_SECRET, { expiresIn });
  refreshTokens[refreshToken] = {
    accessToken,
    user
  };

  setResponseStatus(event, 302);
  setHeader(event, 'location', buildRedirectUrl(logger, event));

  logger.info('exit');
  return {
    token: {
      accessToken,
      refreshToken
    }
  };
}, { logResponseBody: true, authorizedOnly: false, allowedEnvironments: ['test', 'development', 'quickstart', 'electron'] });
