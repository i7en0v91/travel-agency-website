import { AppException, AppExceptionCodeEnum, DbVersionInitial, newUniqueId, type PreviewMode, type IAppLogger, type EntityId, type IAirport, type EntityDataAttrsOnly } from '@golobe-demo/shared';
import type { ICitiesLogic, IAirportLogic, IAirportShort, IAirportData,  } from './../types';
import type { PrismaClient } from '@prisma/client';
import type { AcsysDraftEntitiesResolver } from './acsys-draft-entities-resolver';
import { mapGeoCoord, executeInTransaction } from './../helpers/db';
import uniq from 'lodash-es/uniq';
import groupBy from 'lodash-es/groupBy';
import values from 'lodash-es/values';

export class AirportLogic implements IAirportLogic {
  private readonly logger: IAppLogger;
  private readonly prismaImplementation: IAirportLogic;
  private readonly citiesLogic: ICitiesLogic;
  private readonly dbRepository: PrismaClient;
  private readonly acsysDraftsEntitiesResolver: AcsysDraftEntitiesResolver;

  public static inject = ['airportLogicPrisma', 'citiesLogic', 'acsysDraftsEntitiesResolver', 'dbRepository', 'logger'] as const;
  constructor (prismaImplementation: IAirportLogic, citiesLogic: ICitiesLogic, acsysDraftsEntitiesResolver: AcsysDraftEntitiesResolver, dbRepository: PrismaClient, logger: IAppLogger) {
    this.logger = logger.addContextProps({ component: 'AirportLogic-Acsys' });
    this.prismaImplementation = prismaImplementation;
    this.citiesLogic = citiesLogic;
    this.dbRepository = dbRepository;
    this.acsysDraftsEntitiesResolver = acsysDraftsEntitiesResolver;
  }
  
  deleteAirport =  async (id: EntityId): Promise<void> => {
    this.logger.debug('deleting airport', id);

    const deleted = (await this.dbRepository.acsysDraftsAirport.updateMany({
      where: {
        id,
        isDeleted: false
      },
      data: {
        isDeleted: true,
        version: { increment: 1 }
      }
    })).count > 0;
    if(!deleted) {
      this.logger.debug('no airports have been deleted in drafts table, proceeding to the main table', id);
      await this.prismaImplementation.deleteAirport(id);
    }

    this.logger.debug('airport deleted', id);
  };

  async getAirportsForSearch (cityIds: EntityId[], addPopular: boolean, previewMode: PreviewMode): Promise<EntityDataAttrsOnly<IAirport>[]> {
    this.logger.debug('get airports for search', { ids: cityIds, addPopular, previewMode });
    let result: EntityDataAttrsOnly<IAirport>[] | undefined;
    if(previewMode) {
      let filterCityIds: EntityId[] = [...cityIds];
      if (addPopular) {
        const popularCities = await this.citiesLogic.getPopularCities(true);
        popularCities.forEach(pc => filterCityIds.push(pc.id));
        filterCityIds = uniq(filterCityIds);
      }
  
      if (filterCityIds.length === 0) {
        this.logger.debug('get airports for search, empty city ids list');
        return [];
      }

      this.logger.debug('get airports for search - determining airport ids by city', { ids: filterCityIds });
      const draftCityIds = (await this.dbRepository.acsysDraftsCity.findMany({
        where: {
          id: {
            in: filterCityIds
          },
          isDeleted: false
        },
        select: {
          id: true
        }
      })).map(i => i.id);
      const draftAirportIds = (await this.dbRepository.acsysDraftsAirport.findMany({
        where: {
          cityId: {
            in: draftCityIds
          },
          isDeleted: false
        },
        select: {
          id: true
        }
      })).map(i => i.id);
      const publishedAirportIds = (await this.dbRepository.airport.findMany({
        where: {
          city: {
            id: {
              in: filterCityIds
            },
            isDeleted: false
          },
          isDeleted: false
        },
        select: {
          id: true
        }
      })).map(i => i.id);
      const airportIds = [...draftAirportIds, ...publishedAirportIds];

      this.logger.debug('get airports for search - resolving entity refs', { count: airportIds.length });      

      const resolvedAirports = (await this.acsysDraftsEntitiesResolver.resolveAirports({ idsFilter: airportIds }));
      const resolveResult = Array.from(resolvedAirports.items.values());

      // take only one first airport in each city in case it has more than 1 airport
      result = values(groupBy(resolveResult, (a: IAirport) => a.city.slug)).map(g => g[0] as IAirport);
    } else {
      result = await this.prismaImplementation.getAirportsForSearch(cityIds, addPopular, previewMode);
    }
    
    this.logger.debug('get airports for search', { ids: cityIds, addPopular, previewMode, count: result.length });
    return result;
  }

  async getAirport (id: EntityId, previewMode: PreviewMode): Promise<IAirport> {
    this.logger.debug('get', { airportId: id, previewMode });

    let result: IAirport;
    if(previewMode) {
      const resolveResult = await this.acsysDraftsEntitiesResolver.resolveAirports({ idsFilter:  [ id ] });
      if(resolveResult.notFoundIds?.length) {
        this.logger.warn('airport not found', undefined, { airportId: id });
        throw new AppException(AppExceptionCodeEnum.OBJECT_NOT_FOUND, 'airport not found', 'error-stub');
      }
      result = Array.from(resolveResult.items.values())[0];
    } else {
      result = await this.prismaImplementation.getAirport(id, previewMode);
    }
    
    this.logger.debug('get', { airportId: id, previewMode, result: result.name.en });
    return result;
  }

  async getAllAirportsShort (previewMode: PreviewMode): Promise<IAirportShort[]> {
    this.logger.debug('listing all airports (short', previewMode);

    let result: IAirportShort[];
    if(previewMode) {
      const resolvedAirports = (await this.acsysDraftsEntitiesResolver.resolveAirports({ }));
      const resolveResult = Array.from(resolvedAirports.items.values());
      result = resolveResult.map(i => {
        return <IAirportShort>{
          id: i.id,
          name: i.name
        };
      });
    } else {
      result = await this.prismaImplementation.getAllAirportsShort(previewMode);
    }
    this.logger.debug('all airports listed (short', { previewMode, result: result.length });
    return result;
  }

  async createAirport (data: IAirportData, previewMode: PreviewMode): Promise<EntityId> {
    this.logger.debug('creating airport', { name: data.name.en, previewMode });

    let airportId: EntityId;
    if(previewMode) {
      airportId = await executeInTransaction(async () => {
        const nameStrId = (await this.dbRepository.acsysDraftsLocalizeableValue.create({
          data: {
            id: newUniqueId(),
            version: DbVersionInitial,
            ...data.name
          },
          select: {
            id: true
          }
        })).id;

        const draftAirportId = (await this.dbRepository.acsysDraftsAirport.create({
          data: {
            id: newUniqueId(),
            nameStrId,
            cityId: data.cityId,
            lat: mapGeoCoord(data.geo.lat),
            lon: mapGeoCoord(data.geo.lon),
            version: DbVersionInitial
          },
          select: {
            id: true
          }
        })).id;

        return draftAirportId;
      }, this.dbRepository);
    } else {
      airportId = await this.prismaImplementation.createAirport(data, previewMode);
    }
    
    this.logger.debug('airport created', { name: data.name.en, previewMode, id: airportId });
    return airportId;
  }
}
