import { DefaultLocale, CookieI18nLocale, type Locale, HeaderLocation, patchUrlWithLocale, getLocaleFromUrl, isDevOrTestEnv, isQuickStartEnv, maskLog, AuthProvider, type IUserProfileInfo, isElectronBuild } from '@golobe-demo/shared';
import CredentialsProvider from 'next-auth/providers/credentials';
import GitHubProvider from 'next-auth/providers/github';
import GoogleProvider from 'next-auth/providers/google';
import TestLocalProvider from '../../../client/oauth-local-provider';
import type { IAuthUserDto } from '../../api-definitions';
import { NuxtAuthHandler } from '#auth';
import { type EventHandler, type EventHandlerRequest, type EventHandlerResponse, getCookie } from 'h3';
import onHeaders from 'on-headers';
import { getCommonServices, getServerServices } from '../../../helpers/service-accessors';

function mapUserDto (user: IUserProfileInfo) : IAuthUserDto {
  return {
    id: user.id.toString(),
    firstName: user.firstName,
    lastName: user.lastName,
    avatarSlug: user.avatar?.slug,
    avatarTimestamp: user.avatar?.file.modifiedUtc.getTime()
  };
}

function wrapI18nRedirect<Request extends EventHandlerRequest = EventHandlerRequest, Response = EventHandlerResponse> (
  originalHandler: EventHandler<Request, Promise<Response>>, affectedUrls: RegExp[])
    : EventHandler<Request, Promise<Response>> {
  return defineEventHandler(async (event) => {
    const url = event.node.req.url;

    const serverServices = getServerServices();
    if (!serverServices || !url) {
      return await originalHandler(event); // skipping as nuxt hasn't been fully started
    }

    const logger = serverServices.getLogger();
    logger.verbose(`(wrapI18nRedirect) called for url=${event.node.req.url}`);

    let currentLocale: Locale | undefined;
    if (event.node.req.url) {
      currentLocale = getCookie(event, CookieI18nLocale) as Locale;
      if (!currentLocale) {
        currentLocale = getLocaleFromUrl(event.node.req.url!);
        logger.debug(`(wrapI18nRedirect) cookie has no locale info, obtained from url: url=${url}, locale=${currentLocale}`);
      } else {
        logger.debug(`(wrapI18nRedirect) locale obtained from cookie: url=${url}, locale=${currentLocale}`);
      }
    }

    if (!currentLocale || currentLocale === DefaultLocale) {
      logger.debug(`(wrapI18nRedirect) skipping as current locale is the default one: url=${url}`);
      return await originalHandler(event);
    }

    onHeaders(event.node.res, () => {
      try {
        const response = event.node.res;
        const responseStatus = event.node.res.statusCode;
        const location = response.getHeader(HeaderLocation)?.toString();
        if (responseStatus === 302 && location && affectedUrls.some(r => r.test(url!))) {
          if (currentLocale) {
            logger.info(`(wrapI18nRedirect) updating redirect location with locale path: url=${url}, location=${location}, locale=${currentLocale}`);
            const patchedLocation = patchUrlWithLocale(location!.toString(), currentLocale);
            if (!patchedLocation) {
              logger.warn(`(wrapI18nRedirect) failed to parse url, skipping: url=${url}, location${url}`);
              return;
            }
            logger.verbose(`(wrapI18nRedirect) updated redirect location is: location=${patchedLocation}`);
            response.setHeader(HeaderLocation, patchedLocation);
          } else {
            logger.warn(`(wrapI18nRedirect) failed to update redirect location as cannot detect current locale: url=${url}, location=${location}`);
          }
        }
      } catch (err: any) {
        logger.warn(`(wrapI18nRedirect) exception occured while processing headers, url=${url}`, err);
      }
    });

    return await originalHandler(event);
  });
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
    ...((isQuickStartEnv() || isElectronBuild())
      ? []
      : [
          // @ts-expect-error You need to use .default here for it to work during SSR. May be fixed via Vite at some point
          GoogleProvider.default({
            clientId: process.env.OAUTH_GOOGLE_CLIENT_ID,
            clientSecret: process.env.OAUTH_GOOGLE_CLIENT_SECRET,
            profile: async (profile: any /*, tokens: any */) => {
              const logger = getCommonServices().getLogger();
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

              const userLogic = getServerServices()!.getUserLogic();
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
              const logger = getCommonServices().getLogger();
              logger.info('(NuxtAuthHandler) setting up user GitHub profile');

              const providerIdentity = profile.id?.toString() ?? '';
              const email = undefined; // profile.email as string;
              const firstName = profile.login ?? '.';

              const userLogic = getServerServices()!.getUserLogic();
              try {
                const user = await userLogic.ensureOAuthUser(AuthProvider.GitHub, providerIdentity, firstName, undefined, email, false);
                return mapUserDto(user);
              } catch (err: any) {
                logger.warn(`(NuxtAuthHandler) exception during GitHub sign in, email=${maskLog(email)}`, err);
              }
              return null;
            }
          })]),
    ...((isDevOrTestEnv() || isQuickStartEnv() || isElectronBuild()) ? [TestLocalProvider()] : []),
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
        const logger = getCommonServices().getLogger();

        const email = credentials?.username as string;
        const password = credentials?.password as string;
        logger.info(`(NuxtAuthHandler) signing in user, email=${maskLog(email)}`);
        if (!email || !password) {
          logger.warn('(NuxtAuthHandler) received empty sign in credentials, sign in failed');
          return null;
        }

        const userLogic = getServerServices()!.getUserLogic();
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
