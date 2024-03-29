import assign from 'lodash-es/assign';
import keys from 'lodash-es/keys';
import { WebApiRoutes } from '../shared/constants';
import { useFetchEx } from '../shared/fetch-ex';
import { type IImageEntitySrc, type EntityId } from '../shared/interfaces';
import { type IUserAccountDto } from './../server/dto';

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
  const { status, data } = useAuth();
  const userAccountFetch = useFetchEx<IUserAccountDto, IUserAccountDto>(WebApiRoutes.UserAccount, 'error-stub',
    {
      server: true,
      lazy: false, // lazy - false - important becase user cover slug must be known during page setup to be editable via EditableImage component
      immediate: status.value === 'authenticated',
      cache: 'no-cache',
      transform: (response: IUserAccountDto) => {
        logger.verbose(`(userAccountStore) received user account data: ${JSON.stringify(response)}`);
        const dto = response as IUserAccountDto;
        if (!dto) {
          logger.warn('(userAccountStore) server didnt return user account dto');
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
    logger.verbose(`(userAccountStore) fetching user account data, userId=${userId}`);
    try {
      const accountFetch = await userAccountFetch;
      const fetchResult = await accountFetch;
      if (fetchResult.data?.value) {
        logger.info(`(userAccountStore) user account data loaded, userId=${userId}`, fetchResult.data.value);
        const resultDto = mapUserAccountDto(fetchResult.data.value);
        assign(userAccountValue, resultDto);
        userAccountInitialized = true;
        logger.verbose(`(userAccountStore) user account data fetched, userId=${userId}`);
      }
    } catch (err: any) {
      logger.warn(`(userAccountStore) exception during initialization of user account data, setting empty, userId=${userId}`, err);
      setUserAccountEmptyValues();
    } finally {
      if (!userAccountInitialized) {
        logger.warn(`(userAccountStore) failed to initialize user account data, setting empty, userId=${userId}`);
        setUserAccountEmptyValues();
      }
    }
  };

  const userAccountValue = reactive<IUserAccount>({});
  let userAccountInitialized = false;

  const initializeUserAccount = async (): Promise<IUserAccount> => {
    if (!userAccountInitialized) {
      if (status.value === 'authenticated') {
        const userId = (data.value as any)?.id;
        logger.info(`(userAccountStore) initializing user account data, fetching, userId=${userId}`);
        await fetchUserAccountData(userId);
      } else {
        logger.info('(userAccountStore) initializing user account data - user is unauthenticated');
        setUserAccountEmptyValues();
      }
    }
    return userAccountValue;
  };

  const notifyUserAccountChanged = (data: Partial<IUserAccount>) => {
    logger.debug('(userAccountStore) notifying components about user account data changes');
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
    initializeUserAccount,
    notifyUserAccountChanged,
    userAccountValue
  };
});
