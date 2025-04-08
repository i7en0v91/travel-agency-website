import { AppConfig, getI18nResName2, UserNotificationLevel, type IEntityCacheCityItem, type IAppLogger, AppException, AppExceptionCodeEnum, type EntityId, QueryPagePreviewModeParam } from '@golobe-demo/shared';
import { ApiEndpointPopularCityTravelDetails, ApiEndpointPopularCitiesList, type ITravelDetailsDto, type IPopularCityDto } from './../server/api-definitions';
import type { ITravelDetailsData } from './../types';
import { buildStoreDefinition, type PublicStore } from './../helpers/stores/pinia';
import type { EntityCacheStore } from './../stores/entity-cache-store';
import type { UserNotificationStore } from './../stores/user-notification-store';
import { Decimal } from 'decimal.js';
import { StoreKindEnum } from './../helpers/constants';
import { getObject } from './../helpers/rest-utils';
import type { H3Event } from 'h3';
import set from 'lodash-es/set';

declare type State = {
  s_current: ITravelDetailsData | undefined,
  s_upcoming: Partial<ITravelDetailsData> | undefined,
  s_idPlaylist: EntityId[] | undefined,
  s_loadCityIdx: number | undefined,
  s_isError: boolean
};

const StoreId = StoreKindEnum.TravelDetails;

const TimerLoopIterationInterval = 1000;

declare type ScheduledTask = {
  action: () => void,
  scheduledTime: number
};

interface ITimePlayer {
  start: () => void,
  setMainLineTask: (action: () => void, delay: number | 'immediate') => void
}

function createTimePlayer(): ITimePlayer {
  let mainLineTask: ScheduledTask | undefined;
  let firstTimeOfIdle: number | undefined;

  const executeTaskSafe = (taskAction: () => void) => {
    const logger = useTravelDetailsStore().getLogger();
    try {
      taskAction();
    } catch (err: any) {
      logger.warn('exception during task execution', err);
    }
  };

  const ensurePlayingIfIdle = () => {
    const logger = useTravelDetailsStore().getLogger();
    if (!mainLineTask) {
      const currentTime = new Date().getTime();
      if (!firstTimeOfIdle) {
        firstTimeOfIdle = currentTime;
      } else if ((currentTime - firstTimeOfIdle) > AppConfig.fallIntoTravel.autoplayPeriodMs) {
        const store = useTravelDetailsStoreInternal();
        const cityId = store.upcoming?.cityId ?? store.current?.cityId;
        logger.debug(`idle state detected, resuming play`, { time: currentTime, cityId });
        firstTimeOfIdle = undefined;
        if (cityId && store.s_idPlaylist?.length) {
          store.$patch((s) => {
            s.s_loadCityIdx = (store.s_idPlaylist!.indexOf(cityId) + 1) % store.s_idPlaylist!.length;
          });
        } else {
          store.$patch((s) => {
            s.s_loadCityIdx = (s.s_loadCityIdx !== undefined ? s.s_loadCityIdx : -1) + 1;
          });
        }
        setMainLineTask(() => {
          store.startLoadUpcomingCity();
        }, 'immediate');
      }
    } else {
      firstTimeOfIdle = undefined;
    }
  };

  const timerLoopIteration = () => {
    const logger = useTravelDetailsStore().getLogger();
    const currentTime = new Date().getTime();
    logger.debug(`timer loop iteration started`, { time: currentTime });
    try {
      ensurePlayingIfIdle();

      if (mainLineTask && mainLineTask.scheduledTime < currentTime) {
        logger.debug(`executing main line task`, { scheduledTime: mainLineTask.scheduledTime });
        executeTaskSafe(mainLineTask.action);
        mainLineTask = undefined;
      }
    } catch (err: any) {
      logger.warn('exception during timer loop iteration', err);
    } finally {
      logger.debug(`timer loop iteration finished`, { time: currentTime });
      setTimeout(timerLoopIteration, TimerLoopIterationInterval);
    }
  };

  const setMainLineTask = (action: () => void, delay: number | 'immediate') => {
    const logger = useTravelDetailsStore().getLogger();
    if (delay === 'immediate') {
      logger.debug('setting main task and executing immediately');
      mainLineTask = undefined;
      executeTaskSafe(action);
    } else {
      const currentTime = (new Date()).getTime();
      logger.debug(`setting main task`, { scheduledTime: currentTime, delay });
      mainLineTask = { action, scheduledTime: (currentTime + delay) };
    }
  };

  const start = () => {
    if(!mainLineTask) {
      timerLoopIteration();
    }
  };

  return {
    start,
    setMainLineTask
  };
};

function throwIfExecutingOnServer() {
  if(import.meta.server) {
    const store = useTravelDetailsStore();
    store.getLogger().error('operation is not supposed to run on server');
    throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'illegal operation', 'error-page');
  }
}

async function getCityFromUrl (
  userNotificationStore: UserNotificationStore,
  entityCacheStore: EntityCacheStore, 
  router: ReturnType<typeof useRouter>, 
  logger: IAppLogger
): Promise<IEntityCacheCityItem | undefined> {
  const route = router.currentRoute.value;
  logger.debug(`parsing city from url`, { query: route.query });

  const citySlug = route.query?.citySlug?.toString();
  if (!citySlug) {
    logger.debug('city slug parameter was not specified', { query: route.query });
    return undefined;
  }

  let cacheResult: IEntityCacheCityItem[] = [];
  try {
    cacheResult = await entityCacheStore.get({ slugs: [citySlug] }, 'City', true);
  } catch(err: any) {
    logger.warn(`exception occured looking up city by slug`, err, { slug: citySlug });
    if(import.meta.client) {
      userNotificationStore.show({
        level: UserNotificationLevel.ERROR,
        resName: getI18nResName2('appErrors', 'unknown')
      });
      return undefined;  
    }
  }
  
  if (!cacheResult || cacheResult.length === 0) {
    logger.warn(`city not found`, undefined, { slug: citySlug });
    if(import.meta.client) {
      userNotificationStore.show({
        level: UserNotificationLevel.WARN,
        resName: getI18nResName2('appErrors', 'objectNotFound')
      });
      return undefined;
    } else {
      logger.warn('failed to lookup city by slug', undefined, { slug: citySlug });
      throw new AppException(AppExceptionCodeEnum.OBJECT_NOT_FOUND, 'city not found', 'error-page');
    }
  }

  const result = cacheResult[0];
  logger.debug(`city from url parsed`, { query: route.query, id: result.id });
  return result;
}

async function sendFetchPopularCitiesRequestOnServer (event: H3Event, logger: IAppLogger): Promise<IPopularCityDto[]> {
  logger.debug('sending fetch popular cities HTTP request');
  const resultDto = await getObject(`/${ApiEndpointPopularCitiesList}`, undefined, 'default', false, event, 'throw') as IPopularCityDto[];
  logger.debug(`popular cities fetch request completed`, { resultDto });
  return resultDto;
}

async function sendFetchTravelDetailsRequestOnServer(cityId: EntityId, event: H3Event, logger: IAppLogger): Promise<ITravelDetailsDto> {
  logger.debug('sending fetch travel details HTTP request', { cityId });
  const resultDto = await getObject<ITravelDetailsDto>(`/${ApiEndpointPopularCityTravelDetails}`, { cityId }, 'default', false, event, 'throw') as ITravelDetailsDto;
  logger.debug(`travel details fetch request completed`, { cityId, resultDto });
  return resultDto;
}

async function ensureInitializedOnServer (
  store: TravelDetailsStoreInternal, 
  initialCityId: EntityId | undefined,
  event: H3Event,
  logger: IAppLogger
): Promise<void> {
  if(store.s_idPlaylist?.length) {
    logger.debug('initializing store on server - already initialized', { playlist: store.s_idPlaylist });
    return;
  }
  logger.verbose('initializing store on server');

  try {
    const popularCitiesDto = await sendFetchPopularCitiesRequestOnServer(event, logger);
    store.popularCitiesFetchSucceeded({ popularCitiesDto, initialCityId });
  } catch(err: any) {
    store.popularCitiesFetchFailed(err);
    throw err;
  }

  try {
    const fetchCityId = store.s_idPlaylist![store.s_loadCityIdx!];
    const travelDetailsDto = await sendFetchTravelDetailsRequestOnServer(fetchCityId, event, logger);
    store.travelDetailsFetchSucceeded(travelDetailsDto);
  } catch(err: any) {
    store.travelDetailsFetchFailed(err);
    throw err;
  }

  logger.verbose('completed store initialization on server');
};

const storeDefBuilder = () => buildStoreDefinition(StoreId, 
  (clientSideOptions) => { 
    const { enabled } = usePreviewState();

    const nuxtApp = clientSideOptions.nuxtApp;
    const popularCitiesFetch = 
      useFetch(`/${ApiEndpointPopularCitiesList}`, {
        server: false,
        lazy: true,
        immediate: !nuxtApp.isHydrating,
        cache: enabled ? 'no-cache' : 'default',
        dedupe: 'defer',
        query: set({ }, QueryPagePreviewModeParam, enabled),
        $fetch: clientSideOptions!.fetchEx({ defautAppExceptionAppearance: 'error-page' })
      });
    
    const travelDetailsFetchCityId = ref<EntityId>();
    const travelDetailsFetch = 
      useFetch(`/${ApiEndpointPopularCityTravelDetails}`, {
        server: false,
        lazy: true,
        immediate: false,
        cache: enabled ? 'no-cache' : 'default',
        dedupe: 'defer',
        query: set({ cityId: travelDetailsFetchCityId }, QueryPagePreviewModeParam, enabled),
        watch: false,
        $fetch: clientSideOptions!.fetchEx({ defautAppExceptionAppearance: 'error-stub' })
      });

    watch([popularCitiesFetch.status, popularCitiesFetch.data], () => {
      const logger = useTravelDetailsStore().getLogger();
      logger.verbose('popular cities fetch status changed', { status: popularCitiesFetch.status.value });
      const store = useTravelDetailsStoreInternal();
      switch(popularCitiesFetch.status.value) {
        case 'success':
          if(popularCitiesFetch.data.value) {
            store.popularCitiesFetchSucceeded({ 
               popularCitiesDto: popularCitiesFetch.data.value as IPopularCityDto[],
               initialCityId: initialCityId.value
            });
          }
          break;
        case 'error':
          store.popularCitiesFetchFailed(popularCitiesFetch.error.value);
          break;
      }
    }, { immediate: false });

    watch([travelDetailsFetch.status, travelDetailsFetch.data], () => {
      const logger = useTravelDetailsStore().getLogger();
      logger.verbose('travel details fetch status changed', { status: travelDetailsFetch.status.value });
      const store = useTravelDetailsStoreInternal();
      switch(travelDetailsFetch.status.value) {
        case 'success':
          if(travelDetailsFetch.data.value) {
            store.travelDetailsFetchSucceeded(travelDetailsFetch.data.value as ITravelDetailsDto);
          }
          break;
        case 'error':
          store.travelDetailsFetchFailed(travelDetailsFetch.error.value);
          break;
      }
    }, { immediate: false });

    const timePlayer = createTimePlayer();
    const initialCityId = ref<EntityId>();

    return {
      nuxtApp,
      popularCitiesFetch,
      travelDetailsFetchCityId,
      travelDetailsFetch,
      timePlayer,
      initialCityId
    };
  },
  {
    state: (): State => {
      return {
        s_current: undefined,
        s_upcoming: undefined,
        s_idPlaylist: undefined,
        s_loadCityIdx: undefined,
        s_isError: false
      };
    },
    getters: {
      /**
       * Travel information about currently active city in a slideshow
       */
      current(): ITravelDetailsData | undefined {
        return this.s_current;
      },

      /**
       * All currently loaded city information which is about to display next in a slideshow
       */
      upcoming(): Partial<ITravelDetailsData> | undefined {
        return this.s_upcoming;
      },

      /**
       * Whether store is in an error state
       */
      isError(): boolean {
        return this.s_isError;
      }
    },
    actions: {
      /**
       * Rewinds the slideshow to the specified city and makes it currently displayed
       */
      async setDisplayingCity(cityId: EntityId): Promise<void> {
        this.setCity(cityId);
      },

      /**
       * Notifies store that all images for an upcoming city have been loaded 
       * in background (into <img> elements) and are about to be brought to front.
       * Store treats this notification as a signal that it can proceed with the slideshow
       */
      async onPreRenderCompleted(cityId: EntityId): Promise<void> {
        this.preRenderCompleted(cityId);
      },

      /**
       * Signals to the store that a UI component was mounted and is about to start displaying the slideshow
       */
      async onComponentAttached(): Promise<void> {
        const logger = this.getLogger();
        const event = import.meta.server ? useRequestEvent() : undefined;

        let cityFromUrl: IEntityCacheCityItem | undefined;
        try {
          cityFromUrl = await getCityFromUrl(
            useUserNotificationStore(),
            useEntityCacheStore(),
            useRouter(),
            logger
          );
        } catch(err: any) {
          logger.warn('failed to obtain city from url', err);
        }
        
        this.handleComponentAttach(cityFromUrl?.id);
        if(import.meta.server) {
          await ensureInitializedOnServer(this, cityFromUrl?.id, event!, logger);
        }
      },

      /**
       * Signals to the store that a UI component which has been displaying the slideshow was unmounted
       */
      async onComponentDetached(): Promise<void> {
        this.handleComponentDetach();
      }
    },
    patches: {
      handleComponentAttach(initialCityId: EntityId | undefined) {
        const logger = this.getLogger();
        logger.verbose('handling component attach');
        this.ensureInitialized(initialCityId);
      },

      handleComponentDetach() {
        const logger = this.getLogger();
        logger.verbose('component detached');
      },

      setCity(cityId: EntityId) {
        const logger = this.getLogger();
        if(import.meta.server) {
          logger.debug('ignoring setting displaying city call on server');
          return;
        }
        
        const manualCityIdx = this.s_idPlaylist?.indexOf(cityId) ?? -1;
        if(manualCityIdx < 0) {
          logger.warn('failed to manually set displaying city - not found', { manualCityId: cityId, currentCityId: this.s_current?.cityId, upcomingCityId: this.s_upcoming?.cityId });
          return;
        }

        logger.info('manually setting city to display', { manualCityId: cityId, manualCityIdx, currentCityId: this.s_current?.cityId, upcomingCityId: this.s_upcoming?.cityId });
        this.$patch((s) => {
          s.s_loadCityIdx = manualCityIdx;
        });
        this.startLoadUpcomingCity();
      },

      preRenderCompleted(cityId: EntityId) {
        const logger = this.getLogger();
        if(import.meta.server) {
          logger.debug('ignoring preRender completed call on server');
          return;
        }
        
        const timePlayer = this.clientSetupVariables().timePlayer;
        const store = useTravelDetailsStoreInternal();

        logger.verbose('preRender completed', { cityId, currentCityId: this.current?.cityId, upcomingCityId: this.upcoming?.cityId });
        if (this.upcoming?.cityId === cityId) {
          this.$patch((s) => {
            s.s_current = s.s_upcoming as ITravelDetailsData;
            s.s_upcoming = undefined;
          });
          
          timePlayer!.setMainLineTask(() => {
            store.startLoadUpcomingCity();
          }, AppConfig.fallIntoTravel.autoplayPeriodMs);
        } else if (this.s_current?.cityId === cityId) {
          logger.verbose(`initial data prerendered`, {cityId});
          timePlayer!.setMainLineTask(() => {
            store.startLoadUpcomingCity();
          }, AppConfig.fallIntoTravel.autoplayPeriodMs);
        } else {
          logger.verbose(`preRender completed will be ignore as preRendered city is out of sync`, { cityId, upcomingCityId: this.s_upcoming?.cityId });
        }
      },

      startFetchPopularCities() {
        throwIfExecutingOnServer();
        const logger = this.getLogger();

        const popularCitiesFetch = this.clientSetupVariables().popularCitiesFetch;
        if(popularCitiesFetch.status.value === 'pending') {
          logger.debug('skipping popular cities fetch request, currently pending');
          return;
        }
        logger.debug('executing popular cities fetch request');
        popularCitiesFetch.execute();
      },

      popularCitiesFetchSucceeded(args: { 
        popularCitiesDto: IPopularCityDto[], 
        initialCityId: EntityId | undefined
      }) {
        const logger = this.getLogger();
        logger.verbose('popular cities fetch succeeded', { result: args.popularCitiesDto });
        
        if (!(args.popularCitiesDto?.length ?? 0)) {
          logger.warn('server state initialization failed - popular cities fetch returned empty list');
          this.$patch((s) => {
            s.s_idPlaylist = undefined;
            s.s_loadCityIdx = undefined;
            s.s_isError = true;
          });
          return;
        }

        const idPlaylist = args.popularCitiesDto!.map(c => (c as IPopularCityDto).id);
        const initialCityIdx = args.initialCityId ? idPlaylist.indexOf(args.initialCityId) : -1;
        const loadCityIdx: number = (initialCityIdx >= 0 ? initialCityIdx : undefined) ?? this.s_loadCityIdx ?? 0;
        this.$patch((s) => {
          s.s_idPlaylist = idPlaylist;
          s.s_loadCityIdx = loadCityIdx;
        });

        logger.verbose('loading initial city details', { loadCityIdx: this.s_loadCityIdx });
        if(import.meta.client) {
          this.startLoadUpcomingCity();
        }
      },

      popularCitiesFetchFailed(err: any) {
        const logger = this.getLogger();
        logger.warn('popular cities fetch failed', err);
        
        this.$patch((s) => {
          s.s_idPlaylist = undefined;
          s.s_loadCityIdx = undefined;
          s.s_isError = true;
        });
      },

      ensureInitialized(initialCityId: EntityId | undefined) {
        const logger = this.getLogger();
        if(import.meta.client) {
          this.clientSetupVariables().initialCityId.value = initialCityId;
          this.clientSetupVariables().timePlayer.start();

          if(!this.s_idPlaylist?.length) {
            logger.verbose('initializing - starting to fetch popular cities');
            this.startFetchPopularCities();
          }
        }
      },
      
      startFetchTravelDetails() {
        throwIfExecutingOnServer();
        const logger = this.getLogger();

        if(!this.s_idPlaylist?.length) {
          logger.verbose(`skipping load travel details - playlist is not initialized`, { currentCityIdx: this.s_loadCityIdx, currentCityId: this.s_current?.cityId, upcomingCityId: this.s_upcoming?.cityId });
          return;
        }

        const travelDetailsFetch = this.clientSetupVariables().travelDetailsFetch;
        if (travelDetailsFetch.status.value === 'pending') {
          logger.verbose(`skipping load travel details request as it is currently in a pending state`, { currentCityIdx: this.s_loadCityIdx, currentCityId: this.s_current?.cityId, upcomingCityId: this.s_upcoming?.cityId });
          return;
        }
    
        const cityIdx = (this.s_loadCityIdx ?? 0) % this.s_idPlaylist.length;
        const cityId = this.s_idPlaylist[cityIdx];
        logger.info(`starting to load travel details`, { cityIdx, cityId: cityId, currentCityId: this.s_current?.cityId, upcomingCityId: this.s_upcoming?.cityId });
        this.$patch((s) => {
          s.s_upcoming = {
            cityId,
            images: undefined,
            texting: undefined
          };
        });

        this.clientSetupVariables().travelDetailsFetchCityId.value = cityId;
        logger.debug('executing travel details fetch request', { cityId: cityId });
        travelDetailsFetch.execute();
      },

      travelDetailsFetchSucceeded(travelDetailsDto: ITravelDetailsDto) {
        const logger = this.getLogger();

        logger.debug('travel details fetch request succeeded', { result: travelDetailsDto });
        const travelDetailsData : ITravelDetailsData = {
          cityId: travelDetailsDto.city.id,
          images: travelDetailsDto.images ?? [],
          texting: {
            header: travelDetailsDto.header,
            text: travelDetailsDto.text,
            price: new Decimal(travelDetailsDto.price),
            slug: travelDetailsDto.city.slug
          }
        };

        let nextCityIdx = (this.s_idPlaylist?.indexOf(travelDetailsData.cityId) ?? -1) + 1;
        nextCityIdx = nextCityIdx >= (this.s_idPlaylist?.length ?? 0) ? 0 : nextCityIdx;
        const nextCityId = this.s_idPlaylist?.length ? this.s_idPlaylist[nextCityIdx] : undefined;
        logger.verbose(`patching model with fetched travel details data`, { currentCityId: this.s_current?.cityId, upcomingCityId: travelDetailsData.cityId, nextCityIdx, nextCityId });
        this.$patch((s) => {  
          if (s.s_current) {
            if (travelDetailsData.cityId !== this.s_current?.cityId) {
              s.s_upcoming = travelDetailsData;
            }
          } else {
            s.s_current = travelDetailsData;
          }          
          s.s_loadCityIdx = nextCityIdx;
        });
      },

      travelDetailsFetchFailed(err: any) {
        const logger = this.getLogger();
        const loadCityId = (this.s_loadCityIdx && this.s_idPlaylist) ? this.s_idPlaylist[this.s_loadCityIdx] : undefined;
        logger.warn('travel details fetch request failed', err, { loadCityIdx: this.s_loadCityIdx, loadCityId });
        
        if(import.meta.client) {
          const timePlayer = this.clientSetupVariables().timePlayer;
          let nextCityIdx = (this.s_loadCityIdx !== undefined ? this.s_loadCityIdx : -1) + 1;
          nextCityIdx = nextCityIdx >= (this.s_idPlaylist?.length ?? 0) ? 0 : nextCityIdx;
          this.$patch((s) => {
            s.s_loadCityIdx = nextCityIdx;
            if(!s.s_current) {
              // set error stub if failed on the very first request (i.e. there is no city displayed)
              s.s_isError = true;
            }
          });
          timePlayer.setMainLineTask(() => {
            const store = useTravelDetailsStoreInternal();
            store.startLoadUpcomingCity();
          }, AppConfig.fallIntoTravel.retryTimeoutMs);
        }
      },

      startLoadUpcomingCity() {
        const logger = this.getLogger();
        if(import.meta.server) {
          logger.debug('ignoring start load upcoming call on server', { nextCityIdx: this.s_loadCityIdx });
          return;
        }
    
        if(this.s_isError) {
          logger.debug(`skipping loading upcoming - store is in error state`, { nextCityIdx: this.s_loadCityIdx });
          return;
        }

        if(!this.s_idPlaylist?.length) {
          logger.verbose(`skipping loading upcoming - playlist is not initialized`, { nextCityIdx: this.s_loadCityIdx, currentCityIdx: this.s_loadCityIdx });
          this.ensureInitialized(undefined);
          return;
        }
        
        this.startFetchTravelDetails();
      }
    }
  }
);

const StoreDef = storeDefBuilder();
const useTravelDetailsStoreInternal = defineStore(StoreId, StoreDef);
export declare type TravelDetailsStoreInternal = ReturnType<typeof useTravelDetailsStoreInternal>;
export declare type TravelDetailsStore = ReturnType<PublicStore<typeof storeDefBuilder>>;
export const useTravelDetailsStore = useTravelDetailsStoreInternal as PublicStore<typeof storeDefBuilder>;