import { getI18nResName2, AppConfig, type EntityId, type IEntityCacheCityItem, AppException, AppExceptionCodeEnum, AppPage, type Locale, UserNotificationLevel } from '@golobe-demo/shared';
import { TravelDetailsHtmlAnchor } from './../helpers/constants';
import type { ITravelDetailsData } from './../types';
import { ApiEndpointPopularCityTravelDetails, ApiEndpointPopularCitiesList, type IPopularCityDto, type ITravelDetailsDto } from '../server/api-definitions';
import once from 'lodash-es/once';
import { withQuery, encodeHash, stringifyParsedURL, type ParsedURL } from 'ufo';
import { getObject } from '../helpers/rest-utils';
import { usePreviewState } from './../composables/preview-state';
import { Decimal } from 'decimal.js';
import type { AsyncDataRequestStatus } from 'nuxt/app';
import { getClientServices, getCommonServices, getServerServices } from '../helpers/service-accessors';

interface ITravelDetailsStoreState {
  current?: ITravelDetailsData | undefined,
  upcoming?: ITravelDetailsData | undefined,
  idPlaylist?: EntityId[],
  isError: boolean,
  manuallySetCityId?: EntityId | undefined
};

export interface ITravelDetailsStoreMethods {
  onPreRenderCompleted: (cityId: EntityId) => void,
  increaseTimeoutOnCurrentSlideOnce: () => void,
  startLoadingNewUpcoming: (cityId: EntityId) => void,
  onComponentAttached: () => void,
  onComponentDetached: () => void
}

const TimerLoopIterationInterval = 1000;

declare type ScheduledTask = {
  action: () => void,
  scheduledTime: number
};

interface ITimePlayer {
  start: () => void,
  setMainLineTask: (action: () => void, delay: number | 'immediate') => void
}

export const useTravelDetailsStore = defineStore('travel-details-store', () => {
  const logger = getCommonServices().getLogger();
  logger.info('(travel-details-store) start store construction');

  const userNotificationStore = useUserNotificationStore();
  const navLinkBuilder = useNavLinkBuilder();
  const router = useRouter();
  const { locale } = useI18n();

  const { enabled } = usePreviewState();

  async function getCityFromUrl (): Promise<IEntityCacheCityItem | undefined> {
    const route = router.currentRoute.value;
    logger.debug(`(travel-details-store) parsing city from url, query=${JSON.stringify(route.query)}`);

    const citySlug = route.query?.citySlug?.toString();
    if (!citySlug) {
      logger.debug('(travel-details-store) city slug parameter was not specified');
      return undefined;
    }

    let cacheResult: IEntityCacheCityItem[] | undefined;
    try {
      if (import.meta.client) {
        cacheResult = await getClientServices().getEntityCache().get<'City'>([], [citySlug], 'City', { expireInSeconds: AppConfig.caching.clientRuntime.expirationsSeconds.default });
      } else {
        cacheResult = await getServerServices()!.getEntityCacheLogic().get<'City'>([], [citySlug], 'City', enabled);
      }
    } catch(err: any) {
      logger.warn(`(travel-details-store) exception occured looking up city by slug, slug=${citySlug}`, err);
      if(import.meta.client) {
        userNotificationStore.show({
          level: UserNotificationLevel.ERROR,
          resName: getI18nResName2('appErrors', 'unknown')
        });
        return undefined;  
      }
    }
    
    if (!cacheResult || cacheResult.length === 0) {
      logger.warn(`(travel-details-store) city not found, slug=${citySlug}`);
      if(import.meta.client) {
        userNotificationStore.show({
          level: UserNotificationLevel.WARN,
          resName: getI18nResName2('appErrors', 'objectNotFound')
        });
        return undefined;
      } else {
        logger.warn(`(travel-details-store) failed to lookup city by slug, slug=${citySlug}`);
        throw new AppException(AppExceptionCodeEnum.OBJECT_NOT_FOUND, 'city not found', 'error-page');
      }
    }

    const result = cacheResult[0];
    logger.debug(`(travel-details-store) city from url parsed, query=${route.query}, id=${result.id}`);
    return result;
  }

  function buildTravelCityUrl (citySlug: string): string {
    logger.debug(`(travel-details-store) build city url, slug=${citySlug}`);

    const url: Partial<ParsedURL> = {
      pathname: navLinkBuilder.buildPageLink(AppPage.Flights, locale.value as Locale),
      hash: encodeHash(`#${TravelDetailsHtmlAnchor}`)
    };
    const result = withQuery(stringifyParsedURL(url), { citySlug });

    logger.debug(`(travel-details-store) city url, slug=${citySlug}, url=${result}`);
    return result;
  }

  const fetchCityId = ref<EntityId>();
  const nuxtApp = useNuxtApp();
  const popularCitiesFetch = useFetch(`/${ApiEndpointPopularCitiesList}`,
    {
      server: true,
      lazy: true,
      immediate: true,
      cache: enabled ? 'no-cache' : 'default',
      query: { drafts: enabled },
      transform: (response: IPopularCityDto[] | null[]) => {
        logger.verbose('(travel-details-store) received popular cities list response');
        if (!response) {
          logger.warn('(travel-details-store) got empty popular cities list response');
          return []; // error should be logged by fetchEx
        }
        return response[0] ? (response as IPopularCityDto[]) : response as null[];
      },
      $fetch: nuxtApp.$fetchEx({ defautAppExceptionAppearance: 'error-page' })
    });

  const instance = reactive<ITravelDetailsStoreState & ITravelDetailsStoreMethods>({
    current: undefined,
    upcoming: undefined,
    idPlaylist: undefined,
    isError: false,
    onPreRenderCompleted: (_: EntityId) => {},
    increaseTimeoutOnCurrentSlideOnce: () => {},
    startLoadingNewUpcoming: (_: EntityId) => {},
    onComponentAttached: () => {},
    onComponentDetached: () => {},
    manuallySetCityId: undefined
  });

  const travelDetails = ref<{ data: ITravelDetailsDto | null, status: AsyncDataRequestStatus }>({ data: null, status: 'idle' });
  let timePlayer: ITimePlayer | undefined;

  const createTimePlayer = (): ITimePlayer => {
    logger.debug('(travel-details-store) creating time player');

    let mainLineTask: ScheduledTask | undefined;
    let firstTimeOfIdle: number | undefined;

    const executeTaskSafe = (taskAction: () => void) => {
      try {
        taskAction();
      } catch (err: any) {
        logger.warn('(travel-details-store) exception during task execution', err);
      }
    };

    const ensurePlayingIfIdle = () => {
      if (!mainLineTask) {
        const currentTime = new Date().getTime();
        if (!firstTimeOfIdle) {
          firstTimeOfIdle = currentTime;
        } else if ((currentTime - firstTimeOfIdle) > AppConfig.fallIntoTravel.autoplayPeriodMs) {
          const cityId = instance.upcoming?.cityId ?? instance.current?.cityId;
          logger.debug(`(travel-details-store) idle state detected, resuming play, time=${currentTime}, cityId=${cityId}`);
          firstTimeOfIdle = undefined;
          if (cityId) {
            instance.manuallySetCityId = undefined;
            setMainLineTask(() => {
              startLoadingNextUpcoming(cityId);
            }, 'immediate');
          }
          // else { } .. - don't log to prevent spamming
        }
      } else {
        firstTimeOfIdle = undefined;
      }
    };

    const timerLoopIteration = () => {
      const currentTime = new Date().getTime();
      logger.debug(`(travel-details-store) timer loop iteration started, time=${currentTime}`);
      try {
        ensurePlayingIfIdle();

        if (mainLineTask && mainLineTask.scheduledTime < currentTime) {
          logger.debug(`(travel-details-store) executing main line task, scheduled time=${mainLineTask.scheduledTime}`);
          executeTaskSafe(mainLineTask.action);
          mainLineTask = undefined;
        }
      } catch (err: any) {
        logger.warn('(travel-details-store) exception during timer loop iteration', err);
      } finally {
        logger.debug(`(travel-details-store) timer loop iteration finished, time=${currentTime}`);
        setTimeout(timerLoopIteration, TimerLoopIterationInterval);
      }
    };

    const setMainLineTask = (action: () => void, delay: number | 'immediate') => {
      if (delay === 'immediate') {
        logger.debug('(travel-details-store) setting main task and executing immediately');
        mainLineTask = undefined;
        executeTaskSafe(action);
      } else {
        const currentTime = (new Date()).getTime();
        logger.debug(`(travel-details-store) setting main task, scheduled time=${currentTime} (delay: ${delay})`);
        mainLineTask = { action, scheduledTime: (currentTime + delay) };
      }
    };

    const start = () => {
      timerLoopIteration();
    };

    return {
      start,
      setMainLineTask
    };
  };

  const ensurePopularCities = (popularCitiesFetch: Awaited<ReturnType<typeof useFetch<IPopularCityDto[] | null[] | null>>>): Promise<IPopularCityDto[] | null[] | null> => {
    logger.debug('(travel-details-store) ensuring popular cities initialization data fetched');
    return new Promise<IPopularCityDto[] | null[] | null>((resolve, _) => {
      if (['pending', 'idle'].includes(popularCitiesFetch.status.value)) {
        watch(popularCitiesFetch.status, () => {
          if (!['pending', 'idle'].includes(popularCitiesFetch.status.value)) {
            const isError = popularCitiesFetch.status.value === 'error';
            const msg = `(travel-details-store) popular cities initialization data fetch finished, success=${!isError}`;
            if (isError) {
              logger.warn(msg);
            } else {
              logger.info(msg);
            }
            resolve(popularCitiesFetch.data.value);
          }
        });
      } else {
        const isError = popularCitiesFetch.status.value === 'error';
        const msg = `(travel-details-store) popular cities initialization data fetch finished, success=${!isError}`;
        if (isError) {
          logger.warn(msg);
        } else {
          logger.info(msg);
        }
        resolve(popularCitiesFetch.data.value);
      }
    });
  };

  const fetchTravelDetails = async (): Promise<void> => {
    const cityId = fetchCityId.value;
    logger.verbose(`(travel-details-store) fetch travel details, cityId=${cityId}`);

    try {
      travelDetails.value.status = 'pending';
      const fetchResult = await getObject<ITravelDetailsDto>(`/${ApiEndpointPopularCityTravelDetails}`, { cityId }, 'default', false, nuxtApp?.ssrContext?.event, 'throw');
      if (!fetchResult) {
        logger.warn(`(travel-details-store) failed to fetch travel details, empty response, cityId=${cityId}`);
        travelDetails.value.status = 'error';
        return;
      }

      travelDetails.value = {
        data: fetchResult,
        status: 'success'
      };
    } catch (err: any) {
      logger.warn(`(travel-details-store) failed to fetch travel details, cityId=${cityId}`, err);
      travelDetails.value.status = 'error';
      return;
    }

    logger.verbose(`(travel-details-store) fetch travel details completed, cityId=${cityId}`);
  };

  const initializeStateOnClient = once(async (): Promise<void> => {
    logger.info('(travel-details-store) starting client state initialization');
    timePlayer = createTimePlayer();
    timePlayer.start();

    await popularCitiesFetch;

    const onPopularCitiesLoaded = async (popularCities: IPopularCityDto[]) => {
      logger.verbose(`(travel-details-store) popular cities loaded, continuing client state initialization, length=${popularCities.length}`);
      if (!(popularCities?.length ?? 0) || !popularCities[0]) {
        logger.warn('(travel-details-store) client state initialization failed - popular cities load failed');
        instance.isError = true;
        return;
      }

      instance.idPlaylist = popularCities.map(c => (c as IPopularCityDto).id);
      const cityFromUrl = await getCityFromUrl();
      if (cityFromUrl) {
        logger.verbose(`(travel-details-store) initializing first travel details popular city from url, url cityId=${cityFromUrl.id}`);
        fetchCityId.value = cityFromUrl.id;
      } else if (instance.manuallySetCityId) {
        logger.verbose(`(travel-details-store) initializing first travel details popular city from manually set city, manual cityId=${fetchCityId.value}`);
        fetchCityId.value = instance.manuallySetCityId!;
      } else {
        fetchCityId.value = instance.idPlaylist[0];
        logger.verbose(`(travel-details-store) initializing first travel details popular city, cityId=${fetchCityId.value}`);
      }

      await fetchTravelDetails();

      if (travelDetails.value.status === 'error') {
        logger.warn('(travel-details-store) client state initialization failed - travel details load failed');
        instance.isError = true;
        return;
      }

      watch(travelDetails, () => {
        logger.verbose(`(travel-details-store) travel details fetch status changed, current cityId=${fetchCityId.value}, status=${travelDetails.value.status}`);
        handleTravelDetailsStatusChange(travelDetails.value.status);
      });
      handleTravelDetailsStatusChange(travelDetails.value.status);
    };

    if (['pending', 'idle'].includes(popularCitiesFetch.status.value)) {
      const stopWatch = watch(popularCitiesFetch.status, () => {
        if (!['pending', 'idle'].includes(popularCitiesFetch.status.value)) {
          stopWatch();
          const isError = popularCitiesFetch.status.value === 'error' || !popularCitiesFetch.data.value || !popularCitiesFetch.data.value[0];
          const msg = `(travel-details-store) popular cities initialization data fetch finished, success=${!isError}`;
          if (isError) {
            logger.warn(msg);
          } else {
            logger.verbose(msg);
            onPopularCitiesLoaded(<IPopularCityDto[]>(popularCitiesFetch.data.value!));
          }
        }
      });
      logger.verbose('(travel-details-store) client state initialization launched');
    } else {
      const isError = popularCitiesFetch.status.value === 'error' || !popularCitiesFetch.data.value || !popularCitiesFetch.data.value[0];
      const msg = `(travel-details-store) popular cities initialization data fetch finished, success=${!isError}`;
      if (isError) {
        logger.warn(msg);
      } else {
        logger.verbose(msg);
        await onPopularCitiesLoaded(<IPopularCityDto[]>(popularCitiesFetch.data.value!));
      }
    }
  });

  const initializeStateOnServer = async (): Promise<void> => {
    logger.info('(travel-details-store) initializing server state');
    const popularCities = await ensurePopularCities(await popularCitiesFetch);
    if (!(popularCities?.length ?? 0) || !(popularCities![0])) {
      logger.warn('(travel-details-store) server state initialization failed - popular cities load failed');
      throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'popular cities load failed', 'error-stub');
    }
    instance.idPlaylist = popularCities!.map(c => (c as IPopularCityDto).id);

    const cityFromUrl = await getCityFromUrl();
    if (cityFromUrl) {
      logger.verbose(`(travel-details-store) initializing first travel details popular city from url, url cityId=${cityFromUrl.id}`);
      fetchCityId.value = cityFromUrl.id;
    } else {
      fetchCityId.value = instance.idPlaylist[0];
      logger.verbose(`(travel-details-store) initializing first travel details popular city, cityId=${fetchCityId.value}`);
    }
    logger.verbose(`(travel-details-store) setting on server new city travel details to load, cityId=${fetchCityId.value}`);

    await fetchTravelDetails();

    if (travelDetails.value.status === 'error') {
      logger.warn('(travel-details-store) server state initialization failed - travel details load failed');
      throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'travel details load failed', 'error-stub');
    }

    const travelDetailsDto = travelDetails.value.data!;
    instance.current = {
      cityId: fetchCityId.value,
      texting: {
        header: travelDetailsDto.header,
        text: travelDetailsDto.text,
        price: new Decimal(travelDetailsDto.price),
        slug: travelDetailsDto.city.slug
      },
      images: travelDetailsDto.images
    };
    logger.info('(travel-details-store) server state initialization finished');
  };

  const onPreRenderCompletedInternal = (cityId: EntityId): void => {
    logger.verbose(`(travel-details-store) onPreRenderCompleted, cityId=${cityId}, current cityId=${instance.current?.cityId}, upcoming cityId=${instance.upcoming?.cityId}`);
    if (instance.upcoming?.cityId === cityId) {
      instance.current = instance.upcoming;
      instance.upcoming = undefined;
      const nextCityId = instance.current!.cityId;
      if (!instance.manuallySetCityId) {
        timePlayer!.setMainLineTask(() => {
          startLoadingNextUpcoming(nextCityId);
        }, AppConfig.fallIntoTravel.autoplayPeriodMs);
      }
    } else if (instance.current?.cityId === cityId) {
      logger.verbose(`(travel-details-store) initial data prerendered, cityId=${cityId}`);
      const nextCityId = instance.current!.cityId;
      if (!instance.manuallySetCityId) {
        timePlayer!.setMainLineTask(() => {
          startLoadingNextUpcoming(nextCityId);
        }, AppConfig.fallIntoTravel.autoplayPeriodMs);
      }
    } else {
      logger.verbose(`(travel-details-store) onPreRenderCompleted will be ignore as preRendered city is out of sync, cityId=${cityId}, store upcoming cityId=${instance.upcoming?.cityId}`);
    }
  };

  const startLoadingTravelDetails = (cityId: EntityId) => {
    if (travelDetails.value.status === 'pending') {
      logger.verbose(`(travel-details-store) skipping load travel details request, still in initialization state, new cityId=${cityId}, current cityId=${instance.current?.cityId}, upcoming cityId=${instance.upcoming?.cityId}`);
      return;
    }

    if (instance.manuallySetCityId && cityId !== instance.manuallySetCityId) {
      logger.info(`(travel-details-store) skipping travel details load as displayed city has been manually set, manually cityId=${instance.manuallySetCityId}, cityId=${cityId}, current cityId=${instance.current?.cityId}, upcoming cityId=${instance.upcoming?.cityId}`);
      return;
    }

    logger.info(`(travel-details-store) starting to load travel details, new cityId=${cityId}, current cityId=${instance.current?.cityId}, upcoming cityId=${instance.upcoming?.cityId}`);
    instance.upcoming = {
      cityId,
      images: undefined,
      texting: undefined
    };
    fetchCityId.value = cityId;
    fetchTravelDetails();
    handleTravelDetailsStatusChange(travelDetails.value.status);
  };

  const onComponentAttachedInternal = () => {
    logger.verbose('(travel-details-store) onComponentAttachedInternal');
    instance.manuallySetCityId = undefined;
  };

  const onComponentDetachedInternal = () => {
    logger.verbose('(travel-details-store) onComponentDetachedInternal');
    instance.manuallySetCityId = undefined;
  };

  const startLoadingNextUpcoming = (prevCityId: EntityId, rescheduledOnUncompletedInitiaization?: boolean) => {
    rescheduledOnUncompletedInitiaization ??= false;

    if (rescheduledOnUncompletedInitiaization) {
      // client completed initialization and has been scheduled another loading request
      return;
    }

    if (!instance.isError) {
      const currentCityIdx = instance.idPlaylist!.indexOf(prevCityId);
      const nextCityId = instance.idPlaylist![(currentCityIdx + 1) % instance.idPlaylist!.length];
      logger.verbose(`(travel-details-store) starting to load next upcoming city details, prev cityId=${prevCityId}, next cityId=${nextCityId}`);
      startLoadingTravelDetails(nextCityId);
    }
  };

  const checkManualCityLoadIfNeeded = () : 'pending' | 'none' => {
    if (!instance?.manuallySetCityId) {
      return 'none';
    }

    if (travelDetails.value.status === 'pending') {
      logger.debug(`(travel-details-store), manually set city needs load, but currently another fetch is in progress, manually cityId=${instance.manuallySetCityId}`);
      return 'none';
    }

    if (['pending', 'success'].includes(travelDetails.value.status) && fetchCityId.value === instance.manuallySetCityId) {
      // already loading
      return 'pending';
    }

    logger.verbose(`(travel-details-store) starting to load manually set city, manually cityId=${instance.manuallySetCityId}`);
    const cityId = instance.manuallySetCityId;
    timePlayer!.setMainLineTask(() => {
      startLoadingTravelDetails(cityId);

      timePlayer!.setMainLineTask(() => {
        if (instance.manuallySetCityId && instance.manuallySetCityId !== cityId) {
          logger.verbose(`(travel-details-store) manually set city changed, switching to new: prev manually cityId=${cityId}, new manually cityId=${instance.manuallySetCityId}`);
          checkManualCityLoadIfNeeded();
          return;
        } else {
          logger.verbose(`(travel-details-store) moving from manually displayed city: manually cityId=${cityId}`);
          instance.manuallySetCityId = undefined;
        }
        startLoadingNextUpcoming(cityId);
      }, AppConfig.fallIntoTravel.worldMapFocusedCityDelayMs);
    }, 'immediate');
    return 'pending';
  };

  const handleTravelDetailsStatusChange = (status: AsyncDataRequestStatus) => {
    logger.debug(`(travel-details-store) travel details status change handler, current cityId=${fetchCityId.value}, status=${status}`);
    if (status === 'error') {
      const cityId = fetchCityId.value!;
      timePlayer!.setMainLineTask(() => {
        startLoadingNextUpcoming(cityId);
      }, AppConfig.fallIntoTravel.retryTimeoutMs);
    } else if (travelDetails.value.status === 'success' && fetchCityId.value! === travelDetails.value?.data?.city.id) {
      const travelDetailsDto = travelDetails.value?.data;
      const travelDetailsData : ITravelDetailsData = {
        cityId: fetchCityId.value!,
        images: travelDetailsDto?.images ?? [],
        texting: travelDetailsDto
          ? {
              header: travelDetailsDto.header,
              text: travelDetailsDto.text,
              price: new Decimal(travelDetailsDto.price),
              slug: travelDetailsDto.city.slug
            }
          : undefined
      };
      logger.verbose(`(travel-details-store) upcoming data fetched, current cityId=${instance.current?.cityId}, upcoming cityId=${travelDetailsData.cityId}, status=${travelDetails.value.status}`);
      if (instance.current) {
        if (travelDetailsData.cityId !== instance.current.cityId) {
          instance.upcoming = travelDetailsData;
        }
      } else {
        logger.verbose(`(travel-details-store) using upcoming data as initial, status=${travelDetails.value.status}`);
        instance.current = travelDetailsData;
      }
      checkManualCityLoadIfNeeded();
    }
  };

  const startRunningOnClient = once(async (): Promise<void> => {
    if(nuxtApp.isHydrating) {
      await initializeStateOnClient();
    } else {
      // initialize asynchornously to prevent blocking wait for fetch when navigating to a page with the component
      initializeStateOnClient();
    }
  });

  const getInstance = async () : Promise<ITravelDetailsStoreState & ITravelDetailsStoreMethods> => {
    if (!instance.current) {
      if (import.meta.client) {
        await startRunningOnClient();
      } else {
        await initializeStateOnServer();
      }
      instance.onPreRenderCompleted = (cityId: EntityId) => { onPreRenderCompletedInternal(cityId); };
      instance.increaseTimeoutOnCurrentSlideOnce = () => {};
      instance.startLoadingNewUpcoming = (cityId: EntityId) => { startLoadingTravelDetails(cityId); };
      instance.onComponentAttached = () => { onComponentAttachedInternal(); };
      instance.onComponentDetached = onComponentDetachedInternal;
    }

    return instance;
  };

  const setDisplayingCity = (cityId: EntityId) => {
    logger.info(`(travel-details-store) manually settings city to display, manual cityId=${cityId}, current cityId=${instance.current?.cityId}, upcoming cityId=${instance.upcoming?.cityId}`);
    instance.manuallySetCityId = cityId;
    checkManualCityLoadIfNeeded();
  };

  logger.info('(travel-details-store) store constructed');
  return {
    getInstance,
    setDisplayingCity,
    getCityFromUrl,
    buildTravelCityUrl
  };
});