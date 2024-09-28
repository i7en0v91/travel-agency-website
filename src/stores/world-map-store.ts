import { HeaderAppVersion, AppException, AppExceptionCodeEnum, AppConfig, type IAppLogger, type ILocalizableValue, type EntityId, type GeoPoint, DataKeyWorldMapData } from '@golobe-demo/shared';
import { ApiEndpointPopularCitiesList, type IWorldMapDataDto, type IPopularCityDto } from '../server/api-definitions';
import { isPrefersReducedMotionEnabled } from './../helpers/dom';
import { usePreviewState } from './../composables/preview-state';
import range from 'lodash-es/range';
import clamp from 'lodash-es/clamp';
import { getCommonServices, getServerServices } from '../helpers/service-accessors';

export interface IWorldMapPoint {
  coord: {
    x: number,
    y: number
  },
  visible: boolean,
  colorIntensity: number, // from 0.0 to 1.0
}

export interface IWorldMapCity {
  id: EntityId,
  cityDisplayName: ILocalizableValue,
  countryDisplayName: ILocalizableValue,
  slug: string,
  imgSlug: string,
  timestamp: number,
  nearestPoint: IWorldMapPoint
};

export type WorldMapStatus = 'loading' | 'ready' | 'error';

export interface IWorldMap {
  viewport?: {
    width: number,
    height: number,
  },
  displayedObjects: {
    points: IWorldMapPoint[],
    cities: IWorldMapCity[],
    citiesVisible: boolean
  },
  cellRelativeSize?: number,
  status: Ref<WorldMapStatus>,
  onPageOpen: () => void,
  onMapInViewport: () => void,
  onPageLeave: () => void,
  onPrepareNewFrame: () => 'continue-animation' | 'stop-animation'
}

/**
 * Prime number used to imitate random iteration over array of world map points
 */
const PrimeIteratorBase = 4483;

interface IWorldMapInternal extends IWorldMap {
  sourceData?: {
    cities: IPopularCityDto[]
    map: IWorldMapDataDto
  },
  extremLonRelativeX?: number,
  animationStartTimeMs?: number | undefined
}

interface IWorldMapPointInternal extends IWorldMapPoint {
  animationTimelinePosition: number,
  geo: GeoPoint
}

function isAnimationNeeded () : boolean {
  if (import.meta.server ?? false) {
    return false;
  }
  return !isPrefersReducedMotionEnabled();
}

function getNearestMapPoint (worldMap: IWorldMapInternal, p: GeoPoint) : IWorldMapPointInternal {
  let minDistance = 100.0;
  let result : IWorldMapPointInternal = worldMap.displayedObjects.points[0] as IWorldMapPointInternal;
  for (let i = 0; i < worldMap.displayedObjects.points.length; i++) {
    const point = worldMap.displayedObjects.points[i] as IWorldMapPointInternal;
    const distance = Math.sqrt((point.geo.lon - p.lon) * (point.geo.lon - p.lon) + (point.geo.lat - p.lat) * (point.geo.lat - p.lat));
    if (distance < minDistance) {
      minDistance = distance;
      result = point;
    }
  }
  return result;
}

function calcPointGeoCoords (worldMap: IWorldMapInternal, relativeCoord: { x: number, y: number }, logger: IAppLogger): GeoPoint {
  const lat = worldMap.sourceData!.map.origin.geo.lat - (relativeCoord.y - worldMap.sourceData!.map.origin.relative.y) / worldMap.sourceData!.map.step.relative.y * worldMap.sourceData!.map.step.geo.lat;
  let result: GeoPoint;
  if (relativeCoord.x > worldMap.extremLonRelativeX!) {
    result = {
      lon: -180 + (relativeCoord.x - worldMap.extremLonRelativeX!) / worldMap.sourceData!.map.step.relative.x * worldMap.sourceData!.map.step.geo.lon,
      lat
    };
  } else {
    result = {
      lon: 180 - (worldMap.extremLonRelativeX! - relativeCoord.x) / worldMap.sourceData!.map.step.relative.x * worldMap.sourceData!.map.step.geo.lon,
      lat
    };
  }
  logger.debug(`(world-map-store) calculated point geo coords, relative=${JSON.stringify(relativeCoord)}, res=${JSON.stringify(result)}`);
  return result;
}

function initializeRuntimeValues (worldMap: IWorldMapInternal, logger: IAppLogger) {
  const withAnimation = isAnimationNeeded();
  logger.verbose(`(world-map-store) initializing world map runtime values, animation=${withAnimation}`);

  try {
    worldMap.displayedObjects.points = worldMap.sourceData!.map.points.map((p, idx) => {
      return <IWorldMapPointInternal>{
        coord: {
          x: p.x,
          y: p.y
        },
        visible: true,
        colorIntensity: withAnimation ? 0.0 : 1.0,
        animationTimelinePosition: withAnimation ? (idx * PrimeIteratorBase) % worldMap.sourceData!.map.points.length : 0,
        geo: calcPointGeoCoords(worldMap, p, logger)
      };
    });

    if (withAnimation) {
      const allTimelinePositions = worldMap.displayedObjects.points.map(x => (<IWorldMapPointInternal>x).animationTimelinePosition);
      const timelinePositionLimits = { min: Math.min(...allTimelinePositions), max: Math.max(...allTimelinePositions) };
      const timelinePositionRange = timelinePositionLimits.max - timelinePositionLimits.min;
      for (let i = 0; i < worldMap.displayedObjects.points.length; i++) {
        const point = <IWorldMapPointInternal>worldMap.displayedObjects.points[i];
        point.animationTimelinePosition = (point.animationTimelinePosition - timelinePositionLimits.min) / timelinePositionRange;
      }
    }
    worldMap.displayedObjects.cities = filterDisplayedCities(worldMap, logger);
    worldMap.displayedObjects.citiesVisible = !withAnimation;

    logger.verbose('(world-map-store) world map runtime values initialized');
  } catch (err: any) {
    logger.warn('(world-map-store) failed to initialize world map runtime values', err);
    worldMap.status.value = 'error';
  }
}

function reset (map: IWorldMapInternal, logger: IAppLogger) {
  logger.verbose('(world-map-store) resetting map');
  if (!isAnimationNeeded()) {
    logger.verbose('(world-map-store) animation is not needed - reset ignored');
    return;
  }

  map.displayedObjects.citiesVisible = false;
  const points = map.displayedObjects.points;
  for (let i = 0; i < points.length; i++) {
    const point = points[i] as IWorldMapPointInternal;
    point.visible = false;
    point.colorIntensity = 0;
  }
  map.animationStartTimeMs = undefined;
}

function onPageOpen (_: IWorldMapInternal, logger: IAppLogger) {
  logger.verbose('(world-map-store) onPageOpen');
}

function onMapInViewport (map: IWorldMapInternal, logger: IAppLogger) {
  logger.verbose('(world-map-store) onMapInViewport');
  map.animationStartTimeMs = new Date().getTime();
}

function onPageLeave (map: IWorldMapInternal, logger: IAppLogger) {
  logger.verbose('(world-map-store) onPageLeave');
  reset(map, logger);
}

function filterDisplayedCities (map: IWorldMapInternal, logger: IAppLogger): IWorldMapCity[] {
  logger.verbose('(world-map-store) building list of displayed cities');

  const displayedCities = map.sourceData!.cities
    .filter(c => c.visibleOnWorldMap)
    .map((c) => {
      return {
        id: c.id,
        cityDisplayName: c.cityDisplayName,
        countryDisplayName: c.countryDisplayName,
        nearestPoint: getNearestMapPoint(map, c.geo),
        slug: c.slug,
        imgSlug: c.imgSlug,
        timestamp: c.timestamp
      };
    });

  logger.verbose(`(world-map-store) list of displayed cities: ${displayedCities.map(x => x.cityDisplayName.en).join(', ')}`);
  return displayedCities;
}

function onPrepareNewFrame (map: IWorldMapInternal): 'continue-animation' | 'stop-animation' {
  const withAnimation = isAnimationNeeded();
  if (!withAnimation) {
    return 'stop-animation';
  }

  if (!map.animationStartTimeMs) {
    return 'stop-animation';
  }

  // update point color intensity
  const currentTimeMs = new Date().getTime();
  const pointHighlightRatio = AppConfig.worldMap.pointHighlightAnimationMs / AppConfig.worldMap.animationDurationMs;
  let animationPosition = (currentTimeMs - map.animationStartTimeMs) / AppConfig.worldMap.animationDurationMs;
  animationPosition = animationPosition >= 1.0 ? animationPosition : (1 - ((1 - animationPosition) * (1 - animationPosition))); // ease-out

  const points = map.displayedObjects.points as IWorldMapPointInternal[];
  if (animationPosition < (1.0 + pointHighlightRatio)) {
    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      const pointAnimationDelta = (animationPosition - point.animationTimelinePosition);
      if (pointAnimationDelta < 0) {
        points[i].visible = false;
        points[i].colorIntensity = 0.01;
      } else if (pointAnimationDelta > pointHighlightRatio) {
        points[i].visible = true;
        points[i].colorIntensity = 0.01;
      } else {
        points[i].visible = true;
        points[i].colorIntensity = clamp(0.99 - Math.min(pointAnimationDelta / pointHighlightRatio), 0.01, 0.99);
      }
    }
  } else {
    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      point.visible = true;
      point.colorIntensity = 0.01;
    }
  }

  // update cities visibility
  if (animationPosition > (1.0 + pointHighlightRatio)) {
    map.displayedObjects.citiesVisible = true;
    return 'stop-animation';
  } else {
    map.displayedObjects.citiesVisible = false;
    return 'continue-animation';
  }
}

export const useWorldMapStore = defineStore('world-map-store', () => {
  const logger = getCommonServices().getLogger();
  const nuxtApp = useNuxtApp();
  const { enabled } = usePreviewState();
  const citiesListFetch = useFetch<IPopularCityDto[] | null[]>(`/${ApiEndpointPopularCitiesList}`,
    {
      server: true,
      lazy: true,
      immediate: true,
      query: { drafts: enabled },
      cache: (AppConfig.caching.intervalSeconds && !enabled) ? 'default' : 'no-cache',
      default: (): null[] => { return range(0, 20, 1).map(_ => null); },
      onResponse: () => { logger.verbose('(world-map-store) received popular cities response'); },
      onResponseError: (ctx: { error: any; }) => { logger.warn('(world-map-store) got popular cities response exception', ctx.error); },
      onRequestError: (ctx: { error: any; }) => { logger.warn('(world-map-store) got popular cities request exception', ctx.error); },
      $fetch: nuxtApp.$fetchEx({ defautAppExceptionAppearance: 'error-stub' })
    });

  const getWorldMapDataOnServer = async (): Promise<IWorldMapDataDto> => {
    logger.verbose('(world-map-store) loading world map data from assets');
    try {
      const worldMapDto = await getServerServices()!.getAssetsProvider().getAppData('world-map.json') as IWorldMapDataDto;
      if (!worldMapDto) {
        throw new Error('failed to load world map data from assets');
      }
      logger.verbose(`(world-map-store) world map data loaded from assets, num points=${worldMapDto?.points?.length}`);
      return worldMapDto;
    } catch (err: any) {
      logger.warn('(world-map-store) failed to load world map data from assets', err);
      throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'internal server error', 'error-stub');
    }
  };

  const worldMapDataFetch = import.meta.server
    ? useAsyncData(DataKeyWorldMapData, getWorldMapDataOnServer, {
      server: true,
      lazy: false,
      immediate: true
    })
    : useFetch<IWorldMapDataDto>('/appdata/world-map.json',
      {
        server: true,
        lazy: true,
        headers: [[HeaderAppVersion, AppConfig.versioning.appVersion.toString()]],
        immediate: true,
        cache: 'default',
        key: DataKeyWorldMapData,
        onResponse: () => { logger.verbose('(world-map-store) received world map data response'); },
        onResponseError: (ctx) => { logger.warn('(world-map-store) got world map data response exception', ctx.error); },
        onRequestError: (ctx) => { logger.warn('(world-map-store) got world map data request exception', ctx.error); }
      });

  const worldMapStatus = ref<WorldMapStatus>('loading');
  let worldMapValue: IWorldMapInternal | undefined;

  const calculateExtremLonRelativeX = (dto: IWorldMapDataDto) : number => {
    return dto.origin.relative.x - (180.0 + dto.origin.geo.lon) / dto.step.geo.lon * dto.step.relative.x;
  };

  const updateWorldMapOnFetchFinished = (isError: boolean, popularCities: IPopularCityDto[] | undefined) => {
    if (!worldMapValue) {
      logger.warn('(world-map-store) world map fetch failed, won\'t update');
      return;
    }
    logger.debug('(world-map-store) world map fetch finished, updating');

    worldMapValue.viewport = !isError ? worldMapDataFetch.data.value!.viewport : { width: 1230, height: 505 };
    worldMapValue.cellRelativeSize = !isError ? worldMapDataFetch.data.value!.cellRelativeSize : 0.0;
    worldMapValue.extremLonRelativeX = calculateExtremLonRelativeX(worldMapDataFetch.data.value!);
    worldMapValue.sourceData = {
      cities: !isError ? (popularCities as IPopularCityDto[]) : [],
      map: !isError ? worldMapDataFetch.data.value! : {} as any
    };
    if (!isError) {
      initializeRuntimeValues(worldMapValue!, logger);
    }
    logger.info('(world-map-store) world map data updated');
  };

  const updateWorldMapWhenFetchFinishes = async () : Promise<void> => {
    logger.debug('(world-map-store) starting to watch world map data fetch status');

    const updateWorldMapFetchStatus = () => {
      if (citiesListFetch.status.value === 'error' || worldMapDataFetch.status.value === 'error') {
        worldMapStatus.value = 'error';
      } else if (citiesListFetch.status.value === 'success' && worldMapDataFetch.status.value === 'success') {
        worldMapStatus.value = 'ready';
      } else {
        worldMapStatus.value = 'loading';
      }
    };

    const updateWorldMap = () => {
      const isError = citiesListFetch.status.value === 'error' || worldMapDataFetch.status.value === 'error';
      if (isError) {
        const msg = `(world-map-store) world map data load failed, num points=${worldMapDataFetch.data.value?.points.length ?? 0}`;
        logger.warn(msg);
        updateWorldMapOnFetchFinished(true, undefined);
      } else if (worldMapDataFetch.data.value && citiesListFetch.data.value && citiesListFetch.data.value[0]) {
        const msg = `(world-map-store) world map data load finished, num points=${worldMapDataFetch.data.value?.points.length ?? 0}`;
        logger.info(msg);
        updateWorldMapOnFetchFinished(false, citiesListFetch.data.value as IPopularCityDto[]);
      }
    };

    await citiesListFetch;
    watch([citiesListFetch.status, worldMapDataFetch.status], () => {
      updateWorldMapFetchStatus();
    });
    updateWorldMapFetchStatus();

    if (worldMapStatus.value === 'loading') {
      watch([worldMapDataFetch.status, citiesListFetch.status], () => {
        if (['success', 'error'].includes(worldMapDataFetch.status.value) && ['success', 'error'].includes(citiesListFetch.status.value)) {
          updateWorldMap();
        }
      });
    } else {
      updateWorldMap();
    }
  };

  const getWorldMap = async () : Promise<IWorldMap> => {
    if (!worldMapValue) {
      logger.verbose('(world-map-store) creating new world map');
      worldMapValue = {
        status: worldMapStatus,
        displayedObjects: reactive({
          cities: [],
          citiesVisible: false,
          points: []
        }),
        onPageOpen: () => onPageOpen(worldMapValue!, logger),
        onPageLeave: () => onPageLeave(worldMapValue!, logger),
        onMapInViewport: () => onMapInViewport(worldMapValue!, logger),
        onPrepareNewFrame: () => { return onPrepareNewFrame(worldMapValue!); }
      };

      logger.verbose('(world-map-store) starting to load world map data');
      await citiesListFetch;
      await worldMapDataFetch;
      await updateWorldMapWhenFetchFinishes();
    }

    return worldMapValue;
  };

  return {
    getWorldMap
  };
});
