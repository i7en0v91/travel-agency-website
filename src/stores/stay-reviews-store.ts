import orderBy from 'lodash-es/orderBy';
import isString from 'lodash-es/isString';
import type { NuxtApp } from '#app';
import { AppException, AppExceptionCodeEnum } from '../shared/exceptions';
import { type EntityId, type ILocalizableValue } from './../shared/interfaces';
import { NuxtDataKeys, WebApiRoutes } from './../shared/constants';
import { get, post, del } from './../shared/rest-utils';
import { type IAppLogger } from './../shared/applogger';
import type { IUserAccount } from './user-account-store';
import type { ICreateOrUpdateStayReviewDto, IModifyStayReviewResultDto, IStayReviewsDto } from './../server/dto';
import { addPayload, getPayload } from './../shared/payload';

interface IStayReviewUser {
  avatar?: {
    slug: string,
    timestamp?: number,
  },
  firstName: string,
  lastName: string
}

export interface IStayReviewItem {
  user: IStayReviewUser | 'current',
  text: ILocalizableValue,
  score: number
}

interface IStayReviewItemInternal extends IStayReviewItem {
  user: (IStayReviewUser & { id: EntityId }) | 'current',
  id: EntityId
}

interface IStayReviewsPayload {
  reviewItems: IStayReviewItemInternal[],
  stayId: EntityId
}

export interface IStayReviewsStore {
  stayId: EntityId,
  status: 'pending' | 'success' | 'error',
  items: IStayReviewItemInternal[],
  fetchReviews: () => Promise<void>,
  createOrUpdateReview: (text: string, score: number) => Promise<void>,
  deleteReview: () => Promise<void>,
  getUserReview: () => IStayReviewItem | undefined
}

interface IStayReviewsStoreInternal extends IStayReviewsStore {
  onAuth: (userId: EntityId) => void,
  onSignOut: () => void
}

declare type StayReviewsStoreRef = ReturnType<typeof reactive<IStayReviewsStore>>;
declare type StayReviewsStoreInternalRef = ReturnType<typeof reactive<IStayReviewsStoreInternal>>;
export interface IStayReviewsStoreFactory {
  getInstance: (stayId: EntityId) => Promise<StayReviewsStoreRef>;
}

async function sendCreateOrUpdateReviewRequest (stayId: EntityId, textOrHtml: string, score: number, logger: IAppLogger): Promise<EntityId> {
  const bodyDto: ICreateOrUpdateStayReviewDto = {
    score,
    textOrHtml
  };
  logger.debug(`(stay-reviews-store) sending create or update HTTP request, stayId=${stayId}`);
  const resultDto = await post(WebApiRoutes.StayReviews(stayId), undefined, bodyDto, true, 'default') as IModifyStayReviewResultDto;
  if (!resultDto) {
    logger.warn(`(stay-reviews-store) error occured while sending create or update HTTP request, stayId=${stayId}, textOrHtml=${textOrHtml}`);
    throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'unexpeted HTTP request error', 'error-stub');
  }
  logger.debug(`(stay-reviews-store) create or update HTTP request completed, stayId=${stayId}, result=${JSON.stringify(resultDto)}`);
  return resultDto.reviewId;
}

async function sendDeleteReviewRequest (stayId: EntityId, logger: IAppLogger): Promise<void> {
  logger.debug(`(stay-reviews-store) sending delete HTTP request, stayId=${stayId}`);
  const resultDto = await del(WebApiRoutes.StayReviews(stayId), undefined, true, 'default') as IModifyStayReviewResultDto;
  if (!resultDto) {
    logger.warn(`(stay-reviews-store) error occured while sending delete HTTP request, stayId=${stayId}`);
    throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'unexpeted HTTP request error', 'error-stub');
  }
  logger.debug(`(stay-reviews-store) delete HTTP request completed, stayId=${stayId}, result=${JSON.stringify(resultDto)}`);
}

async function sendFetchReviewsRequest (stayId: EntityId, logger: IAppLogger): Promise<IStayReviewItemInternal[]> {
  logger.debug(`(stay-reviews-store) sending get HTTP request, stayId=${stayId}`);
  const resultDto = await get(WebApiRoutes.StayReviews(stayId), undefined, undefined, true, 'default') as IStayReviewsDto;
  if (!resultDto) {
    logger.warn(`(stay-reviews-store) error occured while sending get HTTP request, stayId=${stayId}`);
    throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'unexpeted HTTP request error', 'error-stub');
  }

  const result: IStayReviewItemInternal[] = orderBy(resultDto.reviews, ['order'], ['asc']).map((r) => {
    return {
      id: r.id,
      score: r.score,
      text: r.text,
      user: {
        id: r.user.id,
        firstName: r.user.firstName,
        lastName: r.user.lastName,
        avatar: r.user.avatar
          ? {
              slug: r.user.avatar.slug,
              timestamp: r.user.avatar.timestamp
            }
          : undefined
      }
    };
  });

  logger.debug(`(stay-reviews-store) get HTTP request completed, stayId=${stayId}, count=${result.length}`);
  return result;
}

async function getReviewItems (stayId: EntityId, nuxtApp: NuxtApp, logger: IAppLogger): Promise<IStayReviewItemInternal[] | undefined> {
  logger.debug(`(stay-reviews-store) get review data, stayId=${stayId}`);
  let reviewItems: IStayReviewItemInternal[] | undefined;
  const payload = getPayload<IStayReviewsPayload>(nuxtApp, NuxtDataKeys.StayDetailsReviews);
  if (process.client && nuxtApp.isHydrating && payload) {
    logger.verbose(`(stay-reviews-store) retrieving review data from payload, stayId=${stayId}`);
    if (payload.stayId === stayId) {
      reviewItems = payload.reviewItems;
    }
  } else if (process.server) {
    const payload = await useAsyncData(NuxtDataKeys.StayDetailsReviews, async () => { return { stayId, reviewItems: await sendFetchReviewsRequest(stayId, logger) }; }, {
      server: true,
      lazy: false,
      immediate: true
    });
    if (payload.error.value || !payload.data.value) {
      logger.warn(`(stay-reviews-store) failed to fetch review data, stayId=${stayId}`, payload.error.value);
    } else {
      reviewItems = payload.data.value!.reviewItems;
    }
  } else {
    try {
      reviewItems = await sendFetchReviewsRequest(stayId, logger);
    } catch (err: any) {
      logger.warn(`(stay-reviews-store) failed to fetch review data, stayId=${stayId}`, err);
    }
  }
  logger.verbose(`(stay-reviews-store) get review data, stayId=${stayId}, result=${reviewItems?.length}`);
  return reviewItems;
}

export const useStayReviewsStoreFactory = defineStore('stay-reviews-store-factory', () => {
  const allInstances = new Map<EntityId, StayReviewsStoreInternalRef>();

  const logger = CommonServicesLocator.getLogger();
  const userAccountStore = useUserAccountStore();
  let userAccount: IUserAccount | undefined;

  const { status } = useAuth();

  const createInstance = (stayId: EntityId): StayReviewsStoreInternalRef => {
    logger.verbose(`(stay-reviews-store) creating instance, stayId=${stayId}`);

    const nuxtApp = useNuxtApp();
    const result: StayReviewsStoreInternalRef = reactive({
      stayId,
      status: 'pending',
      items: [],
      fetchReviews: async (): Promise<void> => {
        logger.verbose(`(stay-reviews-store) obtaining reviews, stayId=${stayId}, userId=${userAccount?.userId}`);
        result.status = 'pending';
        try {
          let itemsData = await getReviewItems(stayId, nuxtApp, logger);
          logger.verbose(`(stay-reviews-store) reviews obtained, stayId=${stayId}, count=${itemsData?.length}`);

          const isAuthenticated = status.value === 'authenticated';
          if (isAuthenticated) {
            if (!userAccount) {
              try {
                userAccount = await userAccountStore.initializeUserAccount();
              } catch (err: any) {
                logger.warn('(stay-reviews-store) failed to process current user review when fetching reviews, cannot obtain user account data', err);
              }
            }
            logger.verbose(`(stay-reviews-store) checking current user review, stayId=${stayId}, userId=${userAccount?.userId}`);
            const userId = userAccount?.userId;
            if (userId) {
              const currentUserReview = itemsData?.find(i => !isString(i.user) && i.user.id === userId);
              if (currentUserReview) {
                logger.debug(`(stay-reviews-store) updating current user's review, stayId=${stayId}, userId=${userId}, reviewId=${currentUserReview.id}`);
                itemsData!.splice(itemsData!.indexOf(currentUserReview), 1);
                if (process.client) {
                  currentUserReview.user = 'current';
                  itemsData = [currentUserReview, ...itemsData!];
                } else {
                  itemsData = [currentUserReview, ...itemsData!];
                  addPayload<IStayReviewsPayload>(nuxtApp, NuxtDataKeys.StayDetailsReviews,
                    {
                      stayId,
                      reviewItems: itemsData
                    });
                }
              }
            } else {
              logger.verbose(`(stay-reviews-store) skipping current user's review data update, user info is empty, stayId=${stayId}`);
            }
          }
          result.items = itemsData!;

          result.status = 'success';
        } catch (err: any) {
          logger.warn(`(stay-reviews-store) failed to obtain reviews, stayId=${stayId}`, err);
          result.status = 'error';
          result.items = [];
        }
      },
      createOrUpdateReview: async (text: string, score: number): Promise<void> => {
        logger.verbose(`(stay-reviews-store) create or update review, stayId=${stayId}, text=${text}, score=${score}`);
        if (result.status === 'error') {
          logger.warn(`(stay-reviews-store) cannot create or update review, store is in error state, stayId=${stayId}`);
          return;
        }

        if (status.value !== 'authenticated') {
          logger.warn(`(stay-reviews-store) cannot create or update review, user must be authneticated, stayId=${stayId}`);
          return;
        }

        result.status = 'pending';
        let reviewId: EntityId;
        try {
          reviewId = await sendCreateOrUpdateReviewRequest(stayId, text, score, logger);
          result.status = 'success';
        } catch (err: any) {
          logger.warn(`(stay-reviews-store) failed to create or update review, stayId=${stayId}`, err);
          result.status = 'error';
          throw err;
        }

        let reviewInStore = result.items.find(i => i.user === 'current');
        if (!reviewInStore) {
          logger.debug(`(stay-reviews-store) creating reviews in store, stayId=${stayId}, userId=${userAccount?.userId}`);
          reviewInStore = <IStayReviewItemInternal>{
            id: reviewId,
            score,
            text: { ru: text, en: text, fr: text },
            user: 'current'
          };
          result.items = [reviewInStore, ...result.items];
        } else {
          logger.debug(`(stay-reviews-store) review in store updated, stayId=${stayId}, userId=${userAccount?.userId}`);
          reviewInStore.text = { ru: text, en: text, fr: text };
          reviewInStore.score = score;
        }

        logger.verbose(`(stay-reviews-store) create or update review succeeded, stayId=${stayId}, text=${text}, reviewId=${reviewId}`);
      },
      deleteReview: async (): Promise<void> => {
        logger.verbose(`(stay-reviews-store) delete review, stayId=${stayId}`);
        if (result.status === 'error') {
          logger.warn(`(stay-reviews-store) cannot delete review, store is in error state, stayId=${stayId}`);
          return;
        }

        if (status.value !== 'authenticated') {
          logger.warn(`(stay-reviews-store) cannot delete review, user must be authneticated, stayId=${stayId}`);
          return;
        }

        result.status = 'pending';
        try {
          await sendDeleteReviewRequest(stayId, logger);
          result.status = 'success';
        } catch (err: any) {
          logger.warn(`(stay-reviews-store) failed to delete review, stayId=${stayId}`, err);
          throw err;
        }

        result.items = result.items.filter(i => i.user !== 'current');
        logger.verbose(`(stay-reviews-store) delete review succeeded, stayId=${stayId}`);
      },
      onAuth: (userId: EntityId): void => {
        logger.debug(`(stay-reviews-store) onAuth, stayId=${stayId}, userId=${userId}`);
        if (result.status === 'success') {
          const userReview = result.items.find(i => !isString(i.user) && i.user.id === userId);
          if (userReview) {
            logger.verbose(`(stay-reviews-store) setting user's current review, stayId=${stayId}, reviewId=${userReview.id}`);
            userReview.user = 'current';
            result.items.splice(result.items.indexOf(userReview), 1);
            result.items = [userReview, ...result.items];
          }
        }
      },
      onSignOut: () => {
        logger.debug(`(stay-reviews-store) onSignOut, stayId=${stayId}`);
        if (result.status === 'success') {
          const userReview = result.items.find(i => i.user === 'current');
          if (userReview) {
            logger.verbose(`(stay-reviews-store) actualizing review user, stayId=${stayId}, reviewId=${userReview.id}`);
            if (!userAccount) {
              logger.warn(`(stay-reviews-store) cannot handle singOut event, user data in empty, stayId=${stayId}`);
              result.items = [];
              result.status = 'error';
              return;
            }

            userReview.user = {
              id: userAccount.userId!,
              firstName: userAccount.firstName!,
              lastName: userAccount.lastName!,
              avatar: userAccount.avatar
                ? {
                    slug: userAccount.avatar.slug,
                    timestamp: userAccount.avatar.timestamp
                  }
                : undefined
            };
          }
        }
      },
      getUserReview: (): IStayReviewItem | undefined => {
        logger.debug(`(stay-reviews-store) get user review, stayId=${stayId}, userId=${userAccount?.userId}`);
        const review = result.items.find(i => i.user === 'current');
        logger.debug(`(stay-reviews-store) get user review, stayId=${stayId}, userId=${userAccount?.userId}, reviewId=${review?.id}`);
        return review;
      }
    });

    return result;
  };

  const getInstance = async (stayId: EntityId): Promise<IStayReviewsStore> => {
    logger.debug(`(stay-reviews-store) get instance, stayId=${stayId}`);

    let instance = allInstances.get(stayId);
    if (!instance) {
      instance = createInstance(stayId);
      if (process.client) {
        instance.fetchReviews();
      } else {
        await instance.fetchReviews();
      }
      allInstances.set(stayId, instance);
    }

    logger.debug(`(stay-reviews-store) get instance - ok, stayId=${stayId}`);
    return instance;
  };

  const notifyInstancesOnAuthEvent = (userId: EntityId | 'sign-out') => {
    const instances = [...allInstances.values()];
    for (let i = 0; i < instances.length; i++) {
      if (userId === 'sign-out') {
        instances[i].onSignOut();
      } else {
        instances[i].onAuth(userId);
      }
    }
  };

  if (process.client) {
    watch(status, async () => {
      logger.info(`(stay-reviews-store) auth status changed, status=${status.value}`);
      if (status.value === 'authenticated') {
        try {
          userAccount = await userAccountStore.initializeUserAccount();
        } catch (err: any) {
          logger.warn('(stay-reviews-store) failed to process auth status change, cannot obtain user account data', err);
          return;
        }
        notifyInstancesOnAuthEvent(userAccount.userId!);
      } else if (status.value === 'unauthenticated') {
        notifyInstancesOnAuthEvent('sign-out');
        userAccount = undefined;
      }
    });
  }

  logger.verbose('(stay-reviews-store) factory created');
  const result: IStayReviewsStoreFactory = {
    getInstance
  };
  return result;
});
