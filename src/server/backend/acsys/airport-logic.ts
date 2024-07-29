import { type ICitiesLogic, type PreviewMode, type IAppLogger, type IAirportLogic, type IAirportShort, type IAirportData, type EntityId, type IAirport, type EntityDataAttrsOnly } from './../../backend/app-facade/interfaces';
import { AppException, AppExceptionCodeEnum, DbVersionInitial, newUniqueId } from './../../backend/app-facade/implementation';
import type { PrismaClient } from '@prisma/client';
import type { AcsysDraftEntitiesResolver } from './acsys-draft-entities-resolver';
import { mapGeoCoord } from '../../../server/backend/helpers/db';
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
    this.logger = logger;
    this.prismaImplementation = prismaImplementation;
    this.citiesLogic = citiesLogic;
    this.dbRepository = dbRepository;
    this.acsysDraftsEntitiesResolver = acsysDraftsEntitiesResolver;
  }
  
  deleteAirport =  async (id: EntityId): Promise<void> => {
    this.logger.debug(`(AirportLogic-Acsys) deleting airport: id=${id}`);

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
      this.logger.debug(`(AirportLogic-Acsys) no airports have been deleted in drafts table, proceeding to the main table: id=${id}`);
      await this.prismaImplementation.deleteAirport(id);
    }

    this.logger.debug(`(AirportLogic-Acsys) airport deleted: id=${id}`);
  };

  async getAirportsForSearch (citySlugs: string[], addPopular: boolean, previewMode: PreviewMode): Promise<EntityDataAttrsOnly<IAirport>[]> {
    this.logger.debug(`(AirportLogic-Acsys) get airports for search, city slugs=[${citySlugs.join(', ')}], addPopular=${addPopular}, previewMode=${previewMode}`);
    let result: EntityDataAttrsOnly<IAirport>[] | undefined;
    if(previewMode) {
      if (addPopular) {
        const popularCities = await this.citiesLogic.getPopularCities(previewMode);
        citySlugs.push(...popularCities.map(c => c.slug));
        citySlugs = uniq(citySlugs);
      }
  
      if (citySlugs.length === 0) {
        this.logger.debug('(AirportLogic-Acsys) get airports for search, empty city slug list');
        return [];
      }

      this.logger.debug(`(AirportLogic-Acsys) get airports for search - determining airport ids by city slugs=[${citySlugs.join('; ')}]`);
      const draftCityIds = (await this.dbRepository.acsysDraftsCity.findMany({
        where: {
          slug: {
            in: citySlugs
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
            slug: {
              in: citySlugs
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

      this.logger.debug(`(AirportLogic-Acsys) get airports for search - resolving entity refs, count=${airportIds.length}`);      
      const resolveResult = [...(await this.acsysDraftsEntitiesResolver.resolveAirports({ idsFilter: airportIds })).items.values()];

      // take only one first airport in each city in case it has more than 1 airport
      result = values(groupBy(resolveResult, (a: IAirport) => a.city.slug)).map(g => g[0] as IAirport);
    } else {
      result = await this.prismaImplementation.getAirportsForSearch(citySlugs, addPopular, previewMode);
    }
    
    this.logger.debug(`(AirportLogic-Acsys) get airports for search, city slugs=[${citySlugs.join(', ')}], addPopular=${addPopular}, previewMode=${previewMode}, count=${result.length}`);
    return result;
  }

  async getAirport (id: EntityId, previewMode: PreviewMode): Promise<IAirport> {
    this.logger.debug(`(AirportLogic-Acsys) get, airportId=${id}, previewMode=${previewMode}`);

    let result: IAirport;
    if(previewMode) {
      const resolveResult = await this.acsysDraftsEntitiesResolver.resolveAirports({ idsFilter:  [ id ] });
      if(resolveResult.notFoundIds?.length) {
        this.logger.warn(`(AirportLogic-Acsys) airport not found, airportId=${id}`);
        throw new AppException(AppExceptionCodeEnum.OBJECT_NOT_FOUND, 'airport not found', 'error-stub');
      }
      result = [...resolveResult.items.values()][0];
    } else {
      result = await this.prismaImplementation.getAirport(id, previewMode);
    }
    
    this.logger.debug(`(AirportLogic-Acsys) get, airportId=${id}, previewMode=${previewMode}, result=${result.name.en}`);
    return result;
  }

  async getAllAirportsShort (previewMode: PreviewMode): Promise<IAirportShort[]> {
    this.logger.debug(`(AirportLogic-Acsys) listing all airports (short), previewMode=${previewMode}`);

    let result: IAirportShort[];
    if(previewMode) {
      const resolveResult = [...(await this.acsysDraftsEntitiesResolver.resolveAirports({ })).items.values()];
      result = resolveResult.map(i => {
        return <IAirportShort>{
          id: i.id,
          name: i.name
        };
      });
    } else {
      result = await this.prismaImplementation.getAllAirportsShort(previewMode);
    }
    this.logger.debug(`(AirportLogic-Acsys) all airports listed (short), previewMode=${previewMode}, result=${result.length}`);
    return result;
  }

  async createAirport (data: IAirportData, previewMode: PreviewMode): Promise<EntityId> {
    this.logger.debug(`(AirportLogic-Acsys) creating airport, name=${data.name.en}, previewMode=${previewMode}`);

    let airportId: EntityId;
    if(previewMode) {
      airportId = await this.dbRepository.$transaction(async () => {
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
      });
    } else {
      airportId = await this.prismaImplementation.createAirport(data, previewMode);
    }
    
    this.logger.debug(`(AirportLogic-Acsys) airport created, name=${data.name.en}, previewMode=${previewMode}, id=${airportId}`);
    return airportId;
  }
}
