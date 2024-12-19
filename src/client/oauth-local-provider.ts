import { AppException, AppExceptionCodeEnum, AuthProvider, type EntityId } from '@golobe-demo/shared';
import type { OAuthConfig } from 'next-auth/providers/oauth';
import { type ITestLocalProfile, OAUTH_TESTUSER_PROFILE as testUserProfile } from '../helpers/testing';
import { getCommonServices, getServerServices } from '../helpers/service-accessors';

async function getTestUserId () : Promise<EntityId> {
  const logger = getCommonServices().getLogger();
  logger.verbose('(OAuthLocalProvider) loading test user id from DB');

  const userLogic = getServerServices()!.getUserLogic();
  const user = await userLogic.findUser(AuthProvider.TestLocal, testUserProfile.sub, 'minimal');
  if (!user) {
    logger.warn('(OAuthLocalProvider) test user was not found in DB');
    throw new AppException(AppExceptionCodeEnum.OBJECT_NOT_FOUND, 'test user was not found', 'error-page');
  }
  return user.id;
}

export default function TestLocal<P extends ITestLocalProfile> (): OAuthConfig<P> {
  const config = useRuntimeConfig();
  const authBaseUrl = (config.public.auth as any).baseURL;
  return {
    id: 'testlocal',
    name: AuthProvider.TestLocal.toString(),
    type: 'oauth',
    clientId: 'clientid',
    clientSecret: 'clientsecret',
    authorization: {
      url: `${authBaseUrl}/testing/oauth-stub/login`,
      params: { scope: 'test user' }
    },
    requestTokenUrl: `${authBaseUrl}/testing/oauth-stub/refresh`,
    token: `${authBaseUrl}/testing/oauth-stub/login`,
    userinfo: {
      url: `${authBaseUrl}/testing/oauth-stub/user`,
      async request () {
        return {
          testUserProfile,
          ...{
            id: await getTestUserId()
          }
        };
      }
    },
    async profile () {
      return {
        testUserProfile,
        ...{
          id: await getTestUserId()
        }
      };
    }
  } as any;
}
