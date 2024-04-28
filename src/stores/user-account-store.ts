import assign from 'lodash-es/assign';
import keys from 'lodash-es/keys';
import { ApiEndpointUserAccount } from '../shared/constants';
import { useFetchEx } from '../shared/fetch-ex';
import { type IImageEntitySrc, type EntityId } from '../shared/interfaces';
import { type IUserAccountDto } from './../server/dto';
import type { UnwrapRef } from 'vue';

export interface IUserAccount {
  userId?: EntityId,
  firstName?: string,
  lastName?: string,
  emails?: string[],
  cover?: IImageEntitySrc,
  avatar?: IImageEntitySrc
}

export const useUserAccountStore = defineStore('userAccountStore', () => {
  const logger = CommonServicesLocator.getLogger();
  const { status, data, getSession } = useAuth();
  const userAccountFetch = useFetchEx<IUserAccountDto, IUserAccountDto>(ApiEndpointUserAccount, 'error-page',
    {
      server: false, // prevent user data injection into html (potential personal data leaking via html page caching on the web)
      lazy: false, // lazy - false - important becase user cover slug must be known during page setup to be editable via EditableImage component
      immediate: false,
      cache: 'no-cache',
      transform: (response: IUserAccountDto) => {
        logger.verbose(`(user-account-store) received user account data: ${JSON.stringify(response)}`);
        const dto = response as IUserAccountDto;
        if (!dto) {
          logger.warn('(user-account-store) server didnt return user account dto');
          return {}; // error should be logged by fetchEx
        }
        return dto;
      }
    });

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

  const fetchUserAccountData = async (userId: EntityId): Promise<void> => {
    logger.verbose(`(user-account-store) fetching user account data, userId=${userId}`);
    let fetchStatus: UnwrapRef<Awaited<ReturnType<typeof useFetchEx>>['status']> | undefined;
    try {
      const accountFetch = await userAccountFetch;
      fetchStatus = accountFetch.status.value;
      switch(fetchStatus) {
        case 'idle':
          logger.verbose(`(user-account-store) executing user account data fetch, userId=${userId}`);
          await accountFetch.execute();
          break;
        case 'success':
        case 'error':
          logger.verbose(`(user-account-store) refetching user account data, userId=${userId}`);
          await accountFetch.refresh();
          break;
        case 'pending':
          logger.debug(`(user-account-store) skipping account data fetch request, as it is currently in progress, userId=${userId}`);
          return;
      }
      
      const fetchResult = await accountFetch;
      if (fetchResult.data?.value) {
        logger.info(`(user-account-store) user account data loaded, userId=${userId}`, fetchResult.data.value);
        const resultDto = mapUserAccountDto(fetchResult.data.value);
        assign(userAccountValue, resultDto);
        userAccountInitialized = true;
        logger.verbose(`(user-account-store) user account data fetched, userId=${userId}`);
      } else {
        fetchStatus = accountFetch.status.value;
      }
    } catch (err: any) {
      logger.warn(`(user-account-store) exception during initialization of user account data, setting empty, userId=${userId}, initialFetchStatus=${fetchStatus}`, err);
      setUserAccountEmptyValues();
    } finally {
      if (!userAccountInitialized && fetchStatus !== 'pending') {
        logger.warn(`(user-account-store) failed to initialize user account data, setting empty, userId=${userId}, initialFetchStatus=${fetchStatus}`);
        setUserAccountEmptyValues();
      }
    }
  };

  const userAccountValue = reactive<IUserAccount>({});
  let userAccountInitialized = false;

  const getUserAccount = async (): Promise<IUserAccount> => {
    if (!userAccountInitialized) {
      await getSession({ force: true });
      if (status.value === 'authenticated') {
        const userId = (data.value as any)?.id;
        logger.info(`(user-account-store) initializing user account data, fetching, userId=${userId}`);
        fetchUserAccountData(userId);
      } else {
        logger.info('(user-account-store) initializing user account data - user is unauthenticated');
        setUserAccountEmptyValues();
      }
    }
    return userAccountValue;
  };

  watch(status, async () => {
    logger.info(`(user-account-store) auth status changed, current=${status.value}`);
    if (!userAccountInitialized) {
      return;
    }

    if (status.value === 'authenticated') {
      const userId = (data.value as any)?.id;
      await fetchUserAccountData(userId);
    } else {
      setUserAccountEmptyValues();
    }
  });

  const notifyUserAccountChanged = (data: Partial<IUserAccount>) => {
    logger.debug('(user-account-store) notifying components about user account data changes');
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
