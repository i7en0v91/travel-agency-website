import { spinWait, type IImageEntitySrc, type EntityId } from '@golobe-demo/shared';
import { type IUserAccountDto, ApiEndpointUserAccount } from '../server/api-definitions';
import { getObject }  from './../helpers/rest-utils';
import assign from 'lodash-es/assign';
import keys from 'lodash-es/keys';
import { getCommonServices } from '../helpers/service-accessors';

export interface IUserAccount {
  userId?: EntityId,
  firstName?: string,
  lastName?: string,
  emails?: string[],
  cover?: IImageEntitySrc,
  avatar?: IImageEntitySrc
}

export const useUserAccountStore = defineStore('userAccountStore', () => {
  const logger = getCommonServices().getLogger();
  const { status, data, getSession } = useAuth();

  const userAccountValue = reactive<IUserAccount>({});
  let accountInitStatus: 'not-initialized' | 'initialized' | 'initializing' = 'not-initialized';

  const nuxtApp = useNuxtApp();
  
  const mapUserAccountDto = (dto?: IUserAccountDto): IUserAccount => {
    return {
      userId: dto?.userId,
      firstName: dto?.firstName,
      lastName: dto?.lastName,
      emails: dto?.emails,
      avatar: dto?.avatarSlug ? { slug: dto.avatarSlug, timestamp: dto.avatarTimestamp } : undefined,
      cover: dto?.coverSlug ? { slug: dto.coverSlug, timestamp: dto.coverTimestamp } : undefined
    };
  };

  const setUserAccountEmptyValues = () => {
    keys(userAccountValue).forEach((k: any) => { (userAccountValue as any)[k] = undefined; });
  };

  const fetchUserAccountData = async(): Promise<IUserAccount> => {
    const dto = await getObject<IUserAccountDto>(`/${ApiEndpointUserAccount}`, undefined, 'no-store', true, nuxtApp?.ssrContext?.event, 'throw');
    if (!dto) {
      // logger.warn('(user-account-store) server didnt return user account dto');
      return {}; // error should have been logged inside fetch
    }
    return mapUserAccountDto(dto);       
  };

  const getUserAccount = async (): Promise<IUserAccount> => {
    if(accountInitStatus === 'initializing') {
      await spinWait(() => {
        return Promise.resolve(accountInitStatus !== 'initializing');
      }, 30000, 50);
    }

    if (accountInitStatus !== 'initialized') {
      accountInitStatus = 'initializing';
      try {
        await nuxtApp.runWithContext(async () => {
          await getSession({ force: true });
          if (status.value === 'authenticated') {
            const userId = (data.value as any)?.id;
            try {
              // logger.info(`(user-account-store) initializing user account data, fetching, userId=${userId}`);
              const userData = await fetchUserAccountData();
              assign(userAccountValue, userData);
              accountInitStatus = 'initialized';
              // logger.verbose(`(user-account-store) user account data fetched, userId=${userId}`);
            } catch(err: any) {
              // logger.warn(`(user-account-store) exception during initialization of user account data, setting empty, userId=${userId}`, err);
              accountInitStatus = 'not-initialized';
              setUserAccountEmptyValues();
            }
          } else {
            // logger.info('(user-account-store) initializing user account data - user is unauthenticated');
            accountInitStatus = 'not-initialized';
            setUserAccountEmptyValues();
          }
        });
      } catch(err: any) {
        if(accountInitStatus) { 
          // workaround for async & concurrent component setup methods during SSR which requires access to Nuxt instance
          accountInitStatus = 'initialized';
          return userAccountValue;
        } 
        accountInitStatus = 'not-initialized';
        throw err;
      }
    }

    return userAccountValue;
  };

  watch(status, async () => {
    // logger.info(`(user-account-store) auth status changed, current=${status.value}`);
    if (accountInitStatus !== 'initialized') {
      return;
    }

    if (status.value === 'authenticated') {
      await getUserAccount();
    } else {
      setUserAccountEmptyValues();
    }
  });

  const notifyUserAccountChanged = (data: Partial<IUserAccount>) => {
    // logger.debug('(user-account-store) notifying components about user account data changes');
    if (data.avatar) {
      userAccountValue.avatar = data.avatar;
    }
    if (data.cover) {
      userAccountValue.cover = data.cover;
    }
    if (data.emails !== undefined) {
      userAccountValue.emails = data.emails;
    }
    if (data.firstName !== undefined) {
      userAccountValue.firstName = data.firstName;
    }
    if (data.lastName !== undefined) {
      userAccountValue.lastName = data.lastName;
    }
  };

  return {
    getUserAccount,
    notifyUserAccountChanged
  };
});
