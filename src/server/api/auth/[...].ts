import CredentialsProvider from 'next-auth/providers/credentials';
import GitHubProvider from 'next-auth/providers/github';
import GoogleProvider from 'next-auth/providers/google';
import TestLocalProvider from '../../../shared/testing/oauth-local-provider';
import { AuthProvider, type IUserProfileInfo } from '../../../shared/interfaces';
import { maskLog } from '../../../shared/applogger';
import { type IAuthUserDto } from './../../dto';
import { wrapI18nRedirect } from './../../utils/i18n-redirect-wrapper';
import { isDevOrTestEnv, isQuickStartEnv } from './../../../shared/common';
import { NuxtAuthHandler } from '#auth';

function mapUserDto (user: IUserProfileInfo) : IAuthUserDto {
  return {
    id: user.id.toString(),
    firstName: user.firstName,
    lastName: user.lastName,
    avatarSlug: user.avatar?.slug,
    avatarTimestamp: user.avatar?.file.modifiedUtc.getTime()
  };
}

export default wrapI18nRedirect(NuxtAuthHandler({
  secret: process.env.AUTH_SECRET,
  pages: {
    signIn: '/login'
  },
  callbacks: {
    jwt: ({ token, user }) => {
      const isSignIn = user ?? false;
      if (isSignIn) {
        token.id = user ? user.id || '' : '';
      }
      return Promise.resolve(token);
    },
    session: ({ session, token }) => {
      (session as any).id = token.id;
      return Promise.resolve(session);
    }
  },
  providers: [
    ...(isQuickStartEnv()
      ? []
      : [
          // @ts-expect-error You need to use .default here for it to work during SSR. May be fixed via Vite at some point
          GoogleProvider.default({
            clientId: process.env.OAUTH_GOOGLE_CLIENT_ID,
            clientSecret: process.env.OAUTH_GOOGLE_CLIENT_SECRET,
            profile: async (profile: any /*, tokens: any */) => {
              const logger = CommonServicesLocator.getLogger();
              logger.info('(NuxtAuthHandler) setting up user Google profile');

              const providerIdentity = profile.sub.toString();
              const email = profile.email as string;
              const emailVerified = profile.email_verified ?? false;
              let firstName = profile.given_name?.toString();
              let lastName = profile.family_name?.toString();
              if (!firstName) {
                if (profile.name) {
                  firstName = profile.name;
                } else {
                  firstName = '.';
                }
                lastName = undefined;
              }

              const userLogic = ServerServicesLocator.getUserLogic();
              try {
                const user = await userLogic.ensureOAuthUser(AuthProvider.Google, providerIdentity, email, emailVerified, firstName, lastName);
                return mapUserDto(user);
              } catch (err: any) {
                logger.warn(`(NuxtAuthHandler) exception during Google sign in, email=${maskLog(email)}`, err);
              }
              return null;
            }
          }),
          // @ts-expect-error You need to use .default here for it to work during SSR. May be fixed via Vite at some point
          GitHubProvider.default({
            clientId: process.env.OAUTH_GITHUB_CLIENT_ID!,
            clientSecret: process.env.OAUTH_GITHUB_CLIENT_SECRET!,
            profile: async (profile: any /*, tokens: any */) => {
              const logger = CommonServicesLocator.getLogger();
              logger.info('(NuxtAuthHandler) setting up user GitHub profile');

              const providerIdentity = profile.id?.toString() ?? '';
              const email = undefined; // profile.email as string;
              const firstName = profile.login ?? '.';

              const userLogic = ServerServicesLocator.getUserLogic();
              try {
                const user = await userLogic.ensureOAuthUser(AuthProvider.GitHub, providerIdentity, firstName, undefined, email, false);
                return mapUserDto(user);
              } catch (err: any) {
                logger.warn(`(NuxtAuthHandler) exception during GitHub sign in, email=${maskLog(email)}`, err);
              }
              return null;
            }
          })]),
    ...((isDevOrTestEnv() || isQuickStartEnv()) ? [TestLocalProvider()] : []),
    // @ts-expect-error You need to use .default here for it to work during SSR. May be fixed via Vite at some point
    CredentialsProvider.default({
      name: 'Credentials',
      // You can specify whatever fields you are expecting to be submitted.
      // e.g. domain, username, password, 2FA token, etc.
      // You can pass any HTML attribute to the <input> tag through the object.
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize (credentials: any) {
        const logger = CommonServicesLocator.getLogger();

        const email = credentials?.username as string;
        const password = credentials?.password as string;
        logger.info(`(NuxtAuthHandler) signing in user, email=${maskLog(email)}`);
        if (!email || !password) {
          logger.warn('(NuxtAuthHandler) received empty sign in credentials, sign in failed');
          return null;
        }

        const userLogic = ServerServicesLocator.getUserLogic();
        try {
          const user = await userLogic.verifyUserPassword(email, password);
          if (user) {
            logger.info(`(NuxtAuthHandler) user sign in approved, email=${maskLog(email)}, id=${user.id}`);
            return mapUserDto(user);
          } else {
            logger.info(`(NuxtAuthHandler) user sign in rejected, email=${maskLog(email)}`);
          }
        } catch (err: any) {
          logger.warn(`(NuxtAuthHandler) exception during sign in, email=${maskLog(email)}`, err);
        }
        return null;
      }
    })
  ]
}), [/api\/auth\/signin/]);
