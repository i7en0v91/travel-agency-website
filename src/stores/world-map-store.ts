import range from 'lodash/range';
import clamp from 'lodash/clamp';
import { type IWorldMapDataDto, type IPopularCityDto } from '../server/dto';
import { WebApiRoutes } from '../shared/constants';
import { type ILocalizableValue, type EntityId } from '../shared/interfaces';
import type { IAppLogger } from '../shared/applogger';
import AppConfig from './../appconfig';

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
  timestamp: number,
  nearestPoint: IWorldMapPoint
};

export type WorldMapStatus = 'loading' | 'ready' | 'error';

export interface IWorldMap {
  viewport: {
    width: number,
    height: number,
  },
  displayedObjects: {
    points: IWorldMapPoint[],
    cities: IWorldMapCity[]
  },
  cellRelativeSize: number,
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
  sourceData: {
    cities: IPopularCityDto[]
    map: IWorldMapDataDto
  },
  extremLonRelativeX: number,
  animationStartTimeMs?: number | undefined
}

interface IWorldMapPointInternal extends IWorldMapPoint {
  animationTimelinePosition: number,
  geo: {
    lon: number,
    lat: number
  }
}

function getNearestMapPoint (worldMap: IWorldMapInternal, p: { lon: number, lat: number }) : IWorldMapPointInternal {
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

function calcPointGeoCoords (worldMap: IWorldMapInternal, relativeCoord: { x: number, y: number }, logger: IAppLogger): {lon: number, lat: number} {
  const lat = worldMap.sourceData.map.origin.geo.lat - (relativeCoord.y - worldMap.sourceData.map.origin.relative.y) / worldMap.sourceData.map.step.relative.y * worldMap.sourceData.map.step.geo.lat;
  let result: {lon: number, lat: number};
  if (relativeCoord.x > worldMap.extremLonRelativeX) {
    result = {
      lon: -180 + (relativeCoord.x - worldMap.extremLonRelativeX) / worldMap.sourceData.map.step.relative.x * worldMap.sourceData.map.step.geo.lon,
      lat
    };
  } else {
    result = {
      lon: 180 - (worldMap.extremLonRelativeX - relativeCoord.x) / worldMap.sourceData.map.step.relative.x * worldMap.sourceData.map.step.geo.lon,
      lat
    };
  }
  logger.debug(`(world-map-store) calculated point geo coords, relative=${JSON.stringify(relativeCoord)}, res=${JSON.stringify(result)}`);
  return result;
}

function initializeRuntimeValues (worldMap: IWorldMapInternal, logger: IAppLogger) {
  logger.info('(world-map-store) initializing world map runtime values');

  try {
    worldMap.displayedObjects.points = worldMap.sourceData.map.points.map((p, idx) => {
      return <IWorldMapPointInternal>{
        coord: {
          x: p.x,
          y: p.y
        },
        visible: true,
        colorIntensity: 0.0,
        animationTimelinePosition: (idx * PrimeIteratorBase) % worldMap.sourceData.map.points.length,
        geo: calcPointGeoCoords(worldMap, p, logger)
      };
    });

    const allTimelinePositions = worldMap.displayedObjects.points.map(x => (<IWorldMapPointInternal>x).animationTimelinePosition);
    const timelinePositionLimits = { min: Math.min(...allTimelinePositions), max: Math.max(...allTimelinePositions) };
    const timelinePositionRange = timelinePositionLimits.max - timelinePositionLimits.min;
    for (let i = 0; i < worldMap.displayedObjects.points.length; i++) {
      const point = <IWorldMapPointInternal>worldMap.displayedObjects.points[i];
      point.animationTimelinePosition = (point.animationTimelinePosition - timelinePositionLimits.min) / timelinePositionRange;
    }

    logger.info('(world-map-store) world map runtime values initialized');
  } catch (err: any) {
    logger.warn('(world-map-store) failed to initialize world map runtime values', err);
    worldMap.status.value = 'error';
  }
}

function reset (map: IWorldMapInternal, logger: IAppLogger) {
  logger.verbose('(world-map-store) resetting map');
  map.displayedObjects.cities = [];
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

function onPrepareNewFrame (map: IWorldMapInternal): 'continue-animation' | 'stop-animation' {
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

  // update visible cities
  if (animationPosition > (1.0 + pointHighlightRatio)) {
    map.displayedObjects.cities = map.sourceData.cities
      .filter(c => c.visibleOnWorldMap)
      .map((c) => {
        return {
          id: c.id,
          cityDisplayName: c.cityDisplayName,
          countryDisplayName: c.countryDisplayName,
          nearestPoint: getNearestMapPoint(map, c.geo),
          slug: c.slug,
          timestamp: c.timestamp
        };
      });
    return 'stop-animation';
  } else {
    map.displayedObjects.cities = [];
    return 'continue-animation';
  }
}

export const useWorldMapStore = defineStore('world-map-store', () => {
  const logger = CommonServicesLocator.getLogger();

  const citiesListFetch = useFetch<IPopularCityDto[] | null[]>(WebApiRoutes.PopularCitiesList,
    {
      server: false,
      lazy: true,
      immediate: true,
      cache: 'default',
      default: (): null[] => { return range(0, 20, 1).map(_ => null); },
      onResponse: () => { logger.verbose('(world-map-store) received popular cities response'); },
      onResponseError: (ctx) => { logger.warn('(world-map-store) got popular cities response exception', ctx.error); },
      onRequestError: (ctx) => { logger.warn('(world-map-store) got popular cities request exception', ctx.error); }
    });

  const worldMapDataFetch = useFetch<IWorldMapDataDto>('/geo/world-map.json',
    {
      server: false,
      lazy: true,
      immediate: true,
      cache: 'default',
      onResponse: () => { logger.verbose('(world-map-store) received world map data response'); },
      onResponseError: (ctx) => { logger.warn('(world-map-store) got world map data response exception', ctx.error); },
      onRequestError: (ctx) => { logger.warn('(world-map-store) got world map data request exception', ctx.error); }
    });

  const worldMapStatus = ref<WorldMapStatus>('loading');
  watch([citiesListFetch.status, worldMapDataFetch.status], () => {
    if (citiesListFetch.status.value === 'error' || worldMapDataFetch.status.value === 'error') {
      worldMapStatus.value = 'error';
    } else if (citiesListFetch.status.value === 'success' && worldMapDataFetch.status.value === 'success') {
      worldMapStatus.value = 'ready';
    } else {
      worldMapStatus.value = 'loading';
    }
  });

  let worldMapValue: IWorldMapInternal | undefined;

  const calculateExtremLonRelativeX = (dto: IWorldMapDataDto) : number => {
    return dto.origin.relative.x - (180.0 + dto.origin.geo.lon) / dto.step.geo.lon * dto.step.relative.x;
  };

  const buildWorldMap = (isError: boolean) : IWorldMapInternal => {
    const result : IWorldMapInternal = {
      status: worldMapStatus,
      viewport: !isError ? worldMapDataFetch.data.value!.viewport : { width: 1230, height: 505 },
      cellRelativeSize: !isError ? worldMapDataFetch.data.value!.cellRelativeSize : 0.0,
      extremLonRelativeX: calculateExtremLonRelativeX(worldMapDataFetch.data.value!),
      displayedObjects: reactive({
        cities: [],
        points: []
      }),
      sourceData: {
        cities: !isError ? citiesListFetch.data.value! as IPopularCityDto[] : [],
        map: !isError ? worldMapDataFetch.data.value! : {} as any
      },
      onPageOpen: () => onPageOpen(worldMapValue!, logger),
      onPageLeave: () => onPageLeave(worldMapValue!, logger),
      onMapInViewport: () => onMapInViewport(worldMapValue!, logger),
      onPrepareNewFrame: () => { return onPrepareNewFrame(worldMapValue!); }
    };
    if (!isError) {
      initializeRuntimeValues(result, logger);
    }
    return result;
  };

  const getWorldMapWhenFetchFinishes = () : Promise<IWorldMapInternal> => {
    // eslint-disable-next-line promise/param-names
    return new Promise<IWorldMapInternal>((resolve, _) => {
      if (worldMapStatus.value === 'loading') {
        watch([worldMapDataFetch.status, citiesListFetch.status], () => {
          if (!worldMapValue && ['success', 'error'].includes(worldMapDataFetch.status.value) && ['success', 'error'].includes(citiesListFetch.status.value)) {
            const isError = citiesListFetch.status.value === 'error' || worldMapDataFetch.status.value === 'error';
            if (isError) {
              const msg = `(world-map-store) world map data load failed, num points=${worldMapDataFetch.data.value?.points.length ?? 0}`;
              logger.warn(msg);
              resolve(buildWorldMap(true));
            } else if (worldMapDataFetch.data.value && citiesListFetch.data.value && citiesListFetch.data.value[0]) {
              const msg = `(world-map-store) world map data load finished, num points=${worldMapDataFetch.data.value?.points.length ?? 0}`;
              logger.info(msg);
              resolve(buildWorldMap(false));
            }
          }
        });
      } else if (!worldMapValue) {
        const isError = citiesListFetch.status.value === 'error' || worldMapDataFetch.status.value === 'error';
        if (isError) {
          const msg = `(world-map-store) world map data failed, num points=${worldMapDataFetch.data.value?.points.length ?? 0}`;
          logger.warn(msg);
          resolve(buildWorldMap(true));
        } else if (worldMapDataFetch.data.value && citiesListFetch.data.value && citiesListFetch.data.value[0]) {
          const msg = `(world-map-store) world map data load finished, num points=${worldMapDataFetch.data.value?.points.length ?? 0}`;
          logger.info(msg);
          resolve(buildWorldMap(false));
        }
      }
    });
  };

  const getWorldMap = async () : Promise<IWorldMap> => {
    if (!worldMapValue) {
      logger.info('(world-map-store) starting to load world map data');
      await citiesListFetch;
      await worldMapDataFetch;
      worldMapValue = await getWorldMapWhenFetchFinishes();
    }

    return worldMapValue;
  };

  return {
    getWorldMap
  };
});
