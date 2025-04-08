import { type ILocalizableValue, type IAppLogger, AppException, AppExceptionCodeEnum, type EntityId } from '@golobe-demo/shared';
import { type IModifyStayReviewResultDto, type ICreateOrUpdateStayReviewDto, type IStayReviewsDto, ApiEndpointStayReviews } from './../server/api-definitions';
import { buildStoreDefinition, type PublicStore } from './../helpers/stores/pinia';
import { LOADING_STATE, StoreKindEnum } from './../helpers/constants';
import { getObject, post, del } from './../helpers/rest-utils';
import orderBy from 'lodash-es/orderBy';

interface IStayReviewUser {
  id: EntityId,
  avatar?: {
    slug: string,
    timestamp?: number,
  },
  firstName: string,
  lastName: string
}

export interface IStayReviewItem {
  id: EntityId,
  user: IStayReviewUser,
  text: ILocalizableValue,
  score: number
}

declare type LOADING = typeof LOADING_STATE;
export type StayReviewsProcessingStatus = 'pending' | 'success' | 'error';

export type StayReviewsState = {
  status: StayReviewsProcessingStatus,
  items: IStayReviewItem[] | LOADING | undefined,
};

declare type ReviewsState = ReadonlyMap<EntityId, StayReviewsState>;

declare type State = {
  s_reviews: Map<EntityId, StayReviewsState>
};

const StoreId = StoreKindEnum.StayReviews;

function throwIfExecutingActionOnServer() {
  if(import.meta.server) {
    const store = useStayReviewsStore();
    store.getLogger().error('operations with reviews via store is not possible on server');
    throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'illegal operation', 'error-page');
  }
}

async function sendFetchReviewsRequest (stayId: EntityId, logger: IAppLogger): Promise<IStayReviewsDto> {
  logger.debug(`sending fetch stay reviews HTTP request`, { stayId });
  const resultDto = await getObject(`/${ApiEndpointStayReviews(stayId)}`, undefined, 'no-store', true, undefined, 'throw') as IStayReviewsDto;
  logger.debug(`fetch stay reviews request completed`, { stayId, resultDto });
  return resultDto;
}

async function sendCreateOrUpdateReviewRequest (stayId: EntityId, textOrHtml: string, score: number, logger: IAppLogger): Promise<EntityId> {
  const bodyDto: ICreateOrUpdateStayReviewDto = {
    score,
    textOrHtml
  };
  logger.debug(`sending create or update stay review HTTP request`, { stayId });
  const resultDto = await post(`/${ApiEndpointStayReviews(stayId)}`, undefined, bodyDto, undefined, true, undefined, 'throw') as IModifyStayReviewResultDto;
  logger.debug(`create or update stay review HTTP request completed`,  { stayId, resultDto });
  return resultDto.reviewId;
}

async function sendDeleteReviewRequest (stayId: EntityId, logger: IAppLogger): Promise<EntityId> {
  logger.debug(`sending delete stay review HTTP request`, { stayId });
  const resultDto = await del(`/${ApiEndpointStayReviews(stayId)}`, undefined, true, 'throw') as IModifyStayReviewResultDto;
  logger.debug(`delete stay review HTTP request completed`, { stayId, resultDto });
  return resultDto.reviewId;
}

function moveUserReviewToTopIfAny(reviews: IStayReviewItem[], userId: EntityId): IStayReviewItem[] {
  const userReviewIdx = reviews.findIndex(r => r.user.id === userId);
  if(userReviewIdx < 0) {
    return reviews;
  }

  const userReview = reviews.splice(userReviewIdx, 1)[0];
  reviews.unshift(userReview);
  return reviews;
}

const storeDefBuilder = () => buildStoreDefinition(StoreId, 
  () => { 
    return {};
  },
  {
    state: (): State => {
      return {
        s_reviews: new Map<EntityId, StayReviewsState>([])
      };
    },
    getters: {
      /**
       * List of reviews broken down by hotel identifiers. For reviews to appear in this list 
       * a hotel must be first marked for tracking by calling {@link trackStayReviews}
       */
      reviews(): ReviewsState {
        return this.s_reviews;
      }
    },
    actions: {
      /**
       * Marks hotel for tracking so that its reviews appear in {@link reviews} collection
       * @param stayId Hotel identifier whose reviews are required
       */
      async trackStayReviews(stayId: EntityId): Promise<void> {
        const logger = this.getLogger();
        if(!this.startTrackingStayReviews(stayId)) {
          return;
        }

        try {
          const resultDto = await sendFetchReviewsRequest(stayId, logger);
          this.stayReviewsRequestSucceeded({ stayId, resultDto });
        } catch(err: any) {
          this.stayReviewsRequestFailed({ stayId, err });
        }
      },

      /**
       * Creates new or updates existing hotel review for currently authenticated user
       */
      async createOrUpdateReview(stayId: EntityId, text: string, score: number): Promise<void> {
        const logger = this.getLogger();
        if(!this.setStartChangeStayReviewState(stayId)) {
          return;
        }

        let reviewId: EntityId;
        try {
          reviewId = await sendCreateOrUpdateReviewRequest(stayId, text, score, logger);
          this.changeStayReviewRequestSucceeded({
            reviewId,
            stayId,
            score,
            text
          });
        } catch (err: any) {
          this.changeStayReviewRequestFailed({ stayId, err });
          throw err;
        }
      },

      /**
       * Deletes hotel review for currently authenticated user
       */
      async deleteReview(stayId: EntityId): Promise<void> {
        const logger = this.getLogger();
        if(!this.setStartChangeStayReviewState(stayId)) {
          return;
        }

        try {
          const reviewId = await sendDeleteReviewRequest(stayId, logger);
          this.deleteStayReviewRequestSucceeded({
            reviewId,
            stayId
          });
        } catch (err: any) {
          this.deleteStayReviewRequestFailed({ stayId,  err });
          throw err;
        }
      },
    },
    patches: {

      startTrackingStayReviews(stayId: EntityId): boolean {
        const logger = this.getLogger();
        if(import.meta.server) {
          logger.verbose('tracking stay reviews is not available on server', { stayId });
          return false;
        }

        if(this.s_reviews.has(stayId)) {
          logger.verbose('skipping track stay reviews request, already tracking', { stayId });
          return false;
        }

        logger.verbose('starting to track stay reviews', { stayId });
        this.$patch((s) => {
          s.s_reviews.set(stayId, {
            items: LOADING_STATE,
            status: 'pending'
          });
        });
        return true;
      },

      setStartChangeStayReviewState(stayId: EntityId): boolean {
        throwIfExecutingActionOnServer();
        const logger = this.getLogger();
        const userAccountStore = useUserAccountStore();

        const currentState = this.s_reviews.get(stayId);
        if(currentState?.status === 'pending') {
          logger.info('skipping stay reviews change as there is already exists an operation in a pending state', { stayId });
          return false;
        }

        if(currentState?.status === 'error') {
          logger.warn('cannot create or update review, currently in a failed state', undefined, { stayId });
          return false;
        }

        if (!userAccountStore.isAuthenticated) {
          logger.warn(`cannot create or update review, user must be authneticated`, undefined, { stayId });
          return false;
        }

        logger.verbose('starting stay review change', { stayId });  
        this.$patch((s) => { 
          s.s_reviews.set(stayId, {
            items: s.s_reviews.get(stayId)?.items,
            status: 'pending'
          });
        });
        return true;
      },

      changeStayReviewRequestSucceeded(args: { stayId: EntityId, reviewId: EntityId, text: string, score: number }) {
        throwIfExecutingActionOnServer();
        const logger = this.getLogger();
        const userAccountStore = useUserAccountStore();

        logger.verbose('change stay review request succeeded', { ...args, userId: userAccountStore.userId });
        const { stayId } = args;

        const stayReviews = this.s_reviews.get(stayId);
        let userReview: IStayReviewItem | undefined;
        if(stayReviews?.items && stayReviews.items !== LOADING_STATE) {
          userReview = stayReviews.items.find(r => r.user.id === userAccountStore.userId);
        }
        if(userReview) {
          logger.debug('existing stay review will be patched', { ...args, userId: userAccountStore.userId });
          this.$patch((s) => {
            userReview!.text = { en: args.text, ru: args.text, fr: args.text };
            userReview!.score = args.score;
            s.s_reviews.set(stayId, {
              status: 'success',
              items: stayReviews?.items
            });
          });
        } else {
          if(stayReviews?.items && stayReviews.items !== LOADING_STATE && userAccountStore.userId && userAccountStore.isAuthenticated && userAccountStore.name !== LOADING_STATE && userAccountStore.avatar !== LOADING_STATE) {
            logger.verbose('adding new stay review with user info available to model', { ...args, userId: userAccountStore.userId });
            userReview = {
              text: { en: args.text, ru: args.text, fr: args.text },
              score: args.score,
              id: args.reviewId,
              user: {
                id: userAccountStore.userId!,
                firstName: userAccountStore.name!.firstName ?? '',
                lastName: userAccountStore.name!.lastName ?? '',
                avatar: userAccountStore.avatar ?? undefined
              }
            };

            let newItems = stayReviews.items;
            newItems.push(userReview);
            newItems = moveUserReviewToTopIfAny(newItems, userAccountStore.userId);
            this.$patch((s) => { 
              s.s_reviews.set(stayId, {
                status: 'success',
                items: newItems
              });
            });        
          } else {
            logger.info('reloading reviews instead of patching model with new review data as user info is not available', { ...args, userId: userAccountStore.userId });
            this.$patch((s) => { 
              s.s_reviews.set(stayId, {
                status: 'success',
                items: stayReviews?.items
              });
            });        

            if(!this.setStartStayReviewsFetchState(stayId)) {
              logger.warn('failed to start reviews reload after changes made', undefined, { ...args, userId: userAccountStore.userId });
              throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'failed to reload reviews', 'error-stub');
            }

            sendFetchReviewsRequest(stayId, logger)
              .then((resultDto) => this.stayReviewsRequestSucceeded({ stayId, resultDto }))
              .catch((err) => this.stayReviewsRequestFailed({ stayId, err }));
          }
        }
      },

      changeStayReviewRequestFailed(args: {
        stayId: EntityId,
        err: any
      }) {
        throwIfExecutingActionOnServer();
        const logger = this.getLogger();
        const userAccountStore = useUserAccountStore();

        logger.warn('change stay review request failed', args.err, { stayId: args.stayId, userId: userAccountStore.userId });
        this.$patch((s) => { 
          s.s_reviews.set(args.stayId, {
            status: 'success', // fallback to previous set of reviews, which was before the failed operation
            items: s.s_reviews.get(args.stayId)?.items
          });
        });
      },

      deleteStayReviewRequestSucceeded(args: { stayId: EntityId, reviewId: EntityId }) {
        throwIfExecutingActionOnServer();
        const logger = this.getLogger();
        const userAccountStore = useUserAccountStore();

        logger.verbose('delete stay review request succeeded', { ...args, userId: userAccountStore.userId });

        const { stayId, reviewId } = args;
        const stayReviews = this.s_reviews.get(stayId);
        this.$patch(() => {
          if(stayReviews) {
            if(stayReviews.items && stayReviews.items !== LOADING_STATE) {
              const deletedReviewIdx = stayReviews.items.findIndex(i => i.id === reviewId);
              if(deletedReviewIdx >= 0) {
                logger.debug('removing deleted review from model', { stayId, reviewId, userId: userAccountStore.userId });
                stayReviews.items.splice(deletedReviewIdx, 1);
              } else {
                logger.warn('review was successfully deleted on server but not found in model', undefined, { stayId, reviewId, userId: userAccountStore.userId });
              }
            }
            stayReviews.status = 'success';
          } else {
            logger.warn('review was successfully deleted on server but model is empty', undefined, { stayId, reviewId, userId: userAccountStore.userId });
          }
        });
      },

      deleteStayReviewRequestFailed(args: {
        stayId: EntityId,
        err: any
      }) {
        throwIfExecutingActionOnServer();
        const logger = this.getLogger();
        const userAccountStore = useUserAccountStore();

        logger.warn('delete stay review request failed', args.err, { stayId: args.stayId, userId: userAccountStore.userId });
        this.$patch((s) => { 
          s.s_reviews.set(args.stayId, {
            status: 'success', // fallback to previous set of reviews, which was before the failed operation
            items: s.s_reviews.get(args.stayId)?.items
          });
        });
      },

      setStartStayReviewsFetchState(stayId: EntityId): boolean {
        throwIfExecutingActionOnServer();
        const logger = this.getLogger();

        const currentState = this.s_reviews.get(stayId);
        if(currentState?.status === 'pending') {
          logger.info('skipping stay reviews fetch as there is already exists an operation in a pending state', { stayId });
          return false;
        }

        logger.verbose('starting stay reviews fetch', { stayId });  
        this.$patch((s) => { 
          s.s_reviews.set(stayId, {
            items: s.s_reviews.get(stayId)?.items,
            status: 'pending'
          });
        });
        return true;
      },

      stayReviewsRequestSucceeded(args: { stayId: EntityId, resultDto: IStayReviewsDto }) {
        throwIfExecutingActionOnServer();
        const logger = this.getLogger();
        const userAccountStore = useUserAccountStore();

        const { stayId, resultDto } = args;

        logger.debug('mapping fetched stay reviews data', args);
        const mappedResult: IStayReviewItem[] = orderBy(
          resultDto.reviews, ['order'], ['asc']).map((r) => {
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

        const userId = userAccountStore.userId;
        logger.verbose('updating model with actual stay reviews data', { stayId, reviews: mappedResult, userId });
        this.$patch((s) => { 
          s.s_reviews.set(stayId, {
            status: 'success',
            items: userId ? moveUserReviewToTopIfAny(mappedResult, userId) : mappedResult
          });
        });        
      },

      stayReviewsRequestFailed(args: {
        stayId: EntityId,
        err: any
      }) {
        throwIfExecutingActionOnServer();
        const logger = this.getLogger();

        logger.warn('stay reviews fetch request failed', args.err, { stayId: args.stayId });
        this.$patch((s) => { 
          s.s_reviews.set(args.stayId, {
            status: 'error',
            items: undefined
          });
        });  
        
        throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'failed to fetch stay reviews', 'error-stub');
      },
    }
  }
);
const StoreDef = storeDefBuilder();
const useStayReviewsStoreInternal = defineStore(StoreId, StoreDef);
export declare type StayReviewsStoreInternal = ReturnType<typeof useStayReviewsStoreInternal>;
export declare type StayReviewsStore = ReturnType<PublicStore<typeof storeDefBuilder>>;
export const useStayReviewsStore = useStayReviewsStoreInternal as PublicStore<typeof storeDefBuilder>;