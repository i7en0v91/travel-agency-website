import { sign, verify } from 'jsonwebtoken';
import type { H3Event } from 'h3';
import { AuthProvider, type EntityId } from '../../../../../shared/interfaces';
import { OAUTH_SECRET, OAUTH_TESTUSER_PROFILE as testUserProfile } from '../../../../../shared/testing/common';
import { AppException, AppExceptionCodeEnum } from '../../../../../shared/exceptions';

interface User {
  username: string;
  name: string;
  picture: string;
}

interface JwtPayload extends User {
  scope: Array<'test' | 'user'>;
  exp: number;
}

async function ensureAppUser (): Promise<EntityId> {
  const logger = CommonServicesLocator.getLogger();
  logger.info('(oauth-stub:refresh) setting up user TestLocal profile');

  const userLogic = ServerServicesLocator.getUserLogic();
  const userId = (await userLogic.ensureOAuthUser(AuthProvider.TestLocal, testUserProfile.sub, testUserProfile.firstName, testUserProfile.lastName, testUserProfile.email, true)).id;
  logger.info(`(oauth-stub:refresh) test user exists in DB, userId=${userId}`);
  return userId;
}

export default defineWebApiEventHandler(async (event: H3Event) => {
  const logger = CommonServicesLocator.getLogger();
  logger.info('(oauth-stub:refresh) enter');

  const body = await readBody<{ refreshToken: string }>(event);

  if (!body.refreshToken) {
    logger.warn('(oauth-stub:login) Unauthorized, no refreshToken in payload');
    throw new AppException(AppExceptionCodeEnum.UNAUTHORIZED, 'refreshToken was not specified', 'error-page');
  }

  const decoded = verify(body.refreshToken, OAUTH_SECRET) as JwtPayload | undefined;

  if (!decoded) {
    logger.warn('(oauth-stub:login) Unauthorized, refreshToken can`t be verified');
    throw new AppException(AppExceptionCodeEnum.UNAUTHORIZED, 'refreshToken can`t be verified', 'error-page');
  }

  const expiresIn = 60 * 5; // 5 minutes
  const user = {
    name: testUserProfile.login,
    ...testUserProfile
  };

  const userId = await ensureAppUser();
  user.id = userId.toString();

  const accessToken = sign({ ...user, scope: ['test', 'user'] }, OAUTH_SECRET, {
    expiresIn
  });
  const refreshToken = sign({ ...user, scope: ['test', 'user'] }, OAUTH_SECRET, {
    expiresIn: 60 * 60 * 24
  });

  logger.info('(oauth-stub:refresh) exit');
  return {
    token: {
      accessToken,
      refreshToken
    }
  };
}, { logResponseBody: true, authorizedOnly: false, allowedEnvironments: ['test', 'development', 'quickstart'] });
