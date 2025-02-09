import { DbVersionInitial, newUniqueId, AppException, AppExceptionCodeEnum, type PreviewMode, type IAppLogger, type EntityId, type ICity } from '@golobe-demo/shared';
import type { CitiesSearchParams, IPopularCityData, IPopularCityItem, ITravelDetails, ICitiesLogic, ICitySearchItem } from './../types';
import { mapGeoCoord, executeInTransaction } from './../helpers/db';
import type { CitiesLogic as CitiesLogicPrisma } from './../services/cities-logic';
import type { PrismaClient } from '@prisma/client';
import { type AcsysDraftEntitiesResolver, UnresolvedEntityThrowingCondition } from './acsys-draft-entities-resolver';
import orderBy from 'lodash-es/orderBy';

export class CitiesLogic implements ICitiesLogic {
  private readonly logger: IAppLogger;
  private readonly prismaImplementation: CitiesLogicPrisma;
  private readonly dbRepository: PrismaClient;
  private readonly acsysDraftsEntitiesResolver: AcsysDraftEntitiesResolver;

  public static inject = ['citiesLogicPrisma', 'acsysDraftsEntitiesResolver', 'dbRepository', 'logger'] as const;
  constructor (prismaImplementation: CitiesLogicPrisma, acsysDraftsEntitiesResolver: AcsysDraftEntitiesResolver, dbRepository: PrismaClient, logger: IAppLogger) {
    this.logger = logger;
    this.prismaImplementation = prismaImplementation;
    this.dbRepository = dbRepository;
    this.acsysDraftsEntitiesResolver = acsysDraftsEntitiesResolver;
  }

  async deleteCity (id: EntityId): Promise<void> {
    this.logger.debug(`(CitiesLogic-Acsys) deleting city: id=${id}`);

    const deleted = (await this.dbRepository.acsysDraftsCity.updateMany({
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
      this.logger.debug(`(CitiesLogic-Acsys) no cities have been deleted in drafts table, proceeding to the main table: id=${id}`);
      await this.prismaImplementation.deleteCity(id);
    }

    this.logger.debug(`(CitiesLogic-Acsys) city deleted: id=${id}`);
  };

  async getCity (slug: string, previewMode: PreviewMode): Promise<ICity> {
    this.logger.debug(`(CitiesLogic-Acsys) loading city, slug=${slug}, previewMode=${previewMode}`);

    let result: ICity;
    if(previewMode) {
      this.logger.debug(`(CitiesLogic-Acsys) load city - determining city id by slug=${slug}, previewMode=${previewMode}`);
      let cityId: EntityId;
      const draftCityIds = (await this.dbRepository.acsysDraftsCity.findMany({
        where: {
          slug,
          isDeleted: false
        },
        select: {
          id: true
        }
      })).map(i => i.id);
      if(!draftCityIds.length) {
        const publishedCityIds = (await this.dbRepository.city.findMany({
          where: {
            slug,
            isDeleted: false
          },
          select: {
            id: true
          }
        })).map(i => i.id);

        if(!publishedCityIds.length) {
          this.logger.warn(`(CitiesLogic-Acsys) city not found: slug=${slug}, previewMode=${previewMode}`);
          throw new AppException(
            AppExceptionCodeEnum.OBJECT_NOT_FOUND,
            'City not found',
            'error-stub');
        }
        cityId = publishedCityIds[0];
      } else {
        cityId = draftCityIds[0];
      }

      const resolvedCities = (await this.acsysDraftsEntitiesResolver.resolveCities({ idsFilter: [cityId] }));
      const resolveResult = Array.from(resolvedCities.items.values());
      if(!resolveResult.length) {
        this.logger.warn(`(CitiesLogic-Acsys) city not found: slug=${slug}, previewMode=${previewMode}`);
          throw new AppException(
            AppExceptionCodeEnum.OBJECT_NOT_FOUND,
            'City not found',
            'error-stub');
      }
      result = resolveResult[0];
    } else {
      result = await this.prismaImplementation.getCity(slug);
    }
    
    this.logger.debug(`(CitiesLogic-Acsys) city loaded, slug=${slug}, previewMode=${previewMode}, id=${result.id}`);
    return result;
  }

  async makeCityPopular (data: IPopularCityData, previewMode: PreviewMode): Promise<void> {
    this.logger.debug(`(CitiesLogic-Acsys) adding popular city data, cityId=${data.cityId}, previewMode=${previewMode}`);

    if(previewMode) {
      await executeInTransaction(async () => {
        const promoLineStrId = (await this.dbRepository.acsysDraftsLocalizeableValue.create({
          data: {
            id: newUniqueId(),
            version: DbVersionInitial,
            ...data.promoLineStr
          },
          select: {
            id: true
          }
        })).id;

        const travelHeaderStrId = (await this.dbRepository.acsysDraftsLocalizeableValue.create({
          data: {
            id: newUniqueId(),
            version: DbVersionInitial,
            ...data.travelHeaderStr
          },
          select: {
            id: true
          }
        })).id;

        const travelTextStrId = (await this.dbRepository.acsysDraftsLocalizeableValue.create({
          data: {
            id: newUniqueId(),
            version: DbVersionInitial,
            ...data.travelTextStr
          },
          select: {
            id: true
          }
        })).id;

        await this.dbRepository.acsysDraftsPopularCity.create({
          data: {
            id: newUniqueId(),
            cityId: data.cityId,
            rating: data.rating,
            promoLineStrId,
            travelHeaderStrId,
            travelTextStrId,
            visibleOnWorldMap: data.visibleOnWorldMap ?? false,
            version: DbVersionInitial
          },
          select: {
            id: true
          }
        });
  
        if (data.geo) {
          const updated = (await this.dbRepository.acsysDraftsCity.updateMany({
            where: {
              id: data.cityId,
              isDeleted: false
            },
            data: {
              lon: mapGeoCoord(data.geo.lon),
              lat: mapGeoCoord(data.geo.lat)
            }
          })).count > 0;

          if(!updated) {
            this.logger.warn(`(CitiesLogic-Acsys) cannot make city popular - not found: cityId=${data.cityId}, previewMode=${previewMode}`);
            throw new AppException(
              AppExceptionCodeEnum.OBJECT_NOT_FOUND,
              'City not found',
              'error-stub');
          }
        }
      }, this.dbRepository);
    } else {
      await this.prismaImplementation.makeCityPopular(data);
    }
    
    this.logger.debug(`(CitiesLogic-Acsys) popular city data added, cityId=${data.cityId}, previewMode=${previewMode}`);
  }

  async getTravelDetails (cityId: EntityId, previewMode: PreviewMode): Promise<Omit<ITravelDetails, 'price'>> {
    this.logger.debug(`(CitiesLogic-Acsys) city travel details requested, cityId=${cityId}, previewMode=${previewMode}`);

    let result: Omit<ITravelDetails, 'price'>;
    if(previewMode) {
      const popularCityEntity = await this.dbRepository.acsysDraftsPopularCity.findFirst({
        where: {
          cityId
        },
        select: {
          id: true,
          cityId: true,
          travelHeaderStrId: true,
          travelTextStrId: true
        }
      });
  
      if (popularCityEntity) {
        const popularCityImageInfos = await this.dbRepository.acsysDraftsPopularCityImage.findMany({
          where: {
            popularCityId: popularCityEntity.id,
            isDeleted: false,
            orderNum: {
              gt: 1
            }
          },
          select: {
            id: true,
            orderNum: true,
            imageId: true
          }
        });

        this.logger.debug(`(CitiesLogic-Acsys) city travel details - resolving refs, cityId=${cityId}, previewMode=${previewMode}`);
        const resolvedCity = await this.acsysDraftsEntitiesResolver.resolveCities({ idsFilter: [cityId] });
        const city = Array.from(resolvedCity.items)[0][1];

        const textingIds = [popularCityEntity.travelHeaderStrId, popularCityEntity.travelTextStrId];
        const resolvedTextings = await this.acsysDraftsEntitiesResolver.resolveLocalizeableValues({ idsFilter: textingIds });

        const popularCityImageIds = popularCityImageInfos.map(i => i.imageId);
        const resolvedImages = await this.acsysDraftsEntitiesResolver.resolveImageFileInfos({ idsFilter: popularCityImageIds, unresolvedEntityPolicy: UnresolvedEntityThrowingCondition.ThrowOnlyOnRequestedIdNotFound });
        const images = orderBy(Array.from(resolvedImages.items.values()), v => popularCityImageInfos.find(i => i.imageId === v.id)!.orderNum).map((i) => { return { slug: i.slug, timestamp: i.file.modifiedUtc.getTime() }; });

        result = {
          header: resolvedTextings.items.get(popularCityEntity.travelHeaderStrId)!,
          text: resolvedTextings.items.get(popularCityEntity.travelTextStrId)!,
          images,
          city
        };
      } else {
        this.logger.debug(`(CitiesLogic-Acsys) popular city hasn't been found in drafts table, proceeding to the main table: id=${cityId}`);
        result = await this.prismaImplementation.getTravelDetails(cityId);  
        if(!result) {
          this.logger.warn(`(CitiesLogic-Acsys) popular city not found: cityId=${cityId}`);
          throw new AppException(
            AppExceptionCodeEnum.OBJECT_NOT_FOUND,
            'Popular city not found',
            'error-stub');
        }
      }  
    } else {
      result = await this.prismaImplementation.getTravelDetails(cityId);  
    }
    
    this.logger.debug(`(CitiesLogic-Acsys) city travel details loaded, cityId=${cityId}, previewMode=${previewMode}, numImages=${result.images.length}, lastModified=${result.city.modifiedUtc}`);
    return result;
  }

  async setPopularCityImages (id: EntityId, images: { id: EntityId, order: number }[], previewMode: PreviewMode): Promise<void> {
    this.logger.debug(`(CitiesLogic-Acsys) setting popular city images, cityId=${id}, images=${JSON.stringify(images)}, previewMode=${previewMode}`);

    if(previewMode) {
      await executeInTransaction(async () => {
        const popularCityId = (await this.dbRepository.acsysDraftsPopularCity.findFirst({
          where: {
            cityId: id
          },
          select: {
            id: true
          }
        }))?.id;

        if (popularCityId) {
          this.logger.debug(`(CitiesLogic-Acsys) deleting previous popular city image links, cityId=${id}, previewMode=${previewMode}`);
          await this.dbRepository.acsysDraftsPopularCityImage.deleteMany({
            where: {
              popularCityId
            }
          });
    
          this.logger.debug(`(CitiesLogic-Acsys) creating popular city image links, cityId=${id}, previewMode=${previewMode}`);
          for (let i = 0; i < images.length; i++) {
            const image = images[i];
            await this.dbRepository.acsysDraftsPopularCityImage.create({
              data: {
                id: newUniqueId(),
                orderNum: image.order,
                version: DbVersionInitial,
                isDeleted: false,
                imageId: image.id,
                popularCityId
              }
            });
          }
        } else {
          this.logger.debug(`(CitiesLogic-Acsys) city hasn't been found in drafts table, proceeding to the main table: id=${id}`);
          await this.prismaImplementation.setPopularCityImages(id, images);
        }
      }, this.dbRepository);  
    } else {
      await this.prismaImplementation.setPopularCityImages(id, images);
    }

    this.logger.debug(`(CitiesLogic-Acsys) popular city images have been set, id=${id}, images=${JSON.stringify(images)}, previewMode=${previewMode}`);
  }

  async getPopularCities (previewMode: PreviewMode): Promise<IPopularCityItem[]> {
    this.logger.debug(`(CitiesLogic-Acsys) obtaining list of popular cities, previewMode=${previewMode}`);

    let result: IPopularCityItem[];
    if(previewMode) {
      const draftCities = await this.dbRepository.acsysDraftsPopularCity.findMany({
        select: {
          id: true,
          visibleOnWorldMap: true,
          promoLineStrId: true,
          cityId: true
        }
      });
      const publishedCities = await this.dbRepository.popularCity.findMany({
        select: {
          id: true,
          visibleOnWorldMap: true,
          promoLineStrId: true,
          cityId: true,
          city: {
            select: {
              _count: {
                select: {
                  hotels: {
                    where: {
                      isDeleted: false
                    }
                  }
                }
              }
            }
          }
        }
      });
      const popularCityIds = [...draftCities.map(x => x.id), ...publishedCities.map(x => x.id)];
      const cityIds = [...draftCities.map(x => x.cityId), ...publishedCities.map(x => x.cityId)];
      if(!cityIds.length) {
        this.logger.debug(`(CitiesLogic-Acsys) list of popular cities obtained - empty result, previewMode=${previewMode}`);
        return [];
      }

      const draftCityImages = await this.dbRepository.acsysDraftsPopularCityImage.findMany({
        where: {
          popularCityId: {
            in: popularCityIds
          },
          orderNum: 1,
          isDeleted: false
        },
        select: {
          imageId: true,
          popularCityId: true
        }
      });
      const publishedCityImages = await this.dbRepository.popularCityImage.findMany({
        where: {
          popularCityId: {
            in: popularCityIds
          },
          orderNum: 1,
          isDeleted: false
        },
        select: {
          imageId: true,
          popularCityId: true
        }
      });

      const cityImageIdsMap = new Map<EntityId, EntityId>([
        ...(draftCityImages.map(x => { return [x.popularCityId as EntityId, x.imageId as EntityId]; })), 
        ...(publishedCityImages.map(x => { return [x.popularCityId as EntityId, x.imageId as EntityId]; }))
      ] as [EntityId, EntityId][]);
      const promoStrIds = [...draftCities.map(x => x.promoLineStrId), ...publishedCities.map(x => x.promoLineStrId)];

      this.logger.debug(`(CitiesLogic-Acsys) listing popular cities - resolving refs, previewMode=${previewMode}`);
      const resolvedCities = await this.acsysDraftsEntitiesResolver.resolveCities({ idsFilter: cityIds, includeDeleted: false, unresolvedEntityPolicy: UnresolvedEntityThrowingCondition.ExcludeFromResult });
      const resolvedPromoStrs = await this.acsysDraftsEntitiesResolver.resolveLocalizeableValues({ idsFilter: promoStrIds });
      const resolvedImages = await this.acsysDraftsEntitiesResolver.resolveImageFileInfos({ idsFilter: Array.from(cityImageIdsMap.values()) });

      this.logger.debug(`(CitiesLogic-Acsys) listing popular cities - mapping result entities, previewMode=${previewMode}`);
      result = [];
      const cities = Array.from(resolvedCities.items.values());
      const popularCitiesMap = new Map([
          ...(draftCities.map(x => { return {...x, hotels: 0}; })),  // display 0 for preview mode
          ...(publishedCities.map(x => { return { ...x, hotels: x.city._count.hotels }; }))
        ].map(x => [x.cityId, x]));
      for(let i = 0; i < cities.length; i++) {
        const city = cities[i];
        const popularCity = popularCitiesMap.get(city.id);
        if(!popularCity) {
          this.logger.warn(`(CitiesLogic-Acsys) failed to load popular city (not found): cityId=${city.id}, previewMode=${previewMode}`);
          throw new AppException(
            AppExceptionCodeEnum.OBJECT_NOT_FOUND,
            'City not found',
            'error-stub');
        }
        const cardImageId = cityImageIdsMap.get(popularCity.id);
        const cardImage = resolvedImages.items.get(cardImageId ?? '');

        result.push(<IPopularCityItem>{
          id: city.id,
          cityDisplayName: city.name,
          countryDisplayName: city.country.name,
          promoLine: resolvedPromoStrs.items.get(popularCity.promoLineStrId),
          imgSlug: cardImage?.slug ?? '', // cardImage may be undefined only during DB initial seeding
          slug: city.slug,
          geo: city.geo,
          visibleOnWorldMap: popularCity.visibleOnWorldMap,
          numStays: popularCity.hotels,
          timestamp: cardImage?.file.modifiedUtc.getTime() ?? 0
        });
      }
  
    } else {
      result = await this.prismaImplementation.getPopularCities();
    }
    
    this.logger.debug(`(CitiesLogic-Acsys) list of popular cities obtained, count=${result.length}, previewMode=${previewMode}`);
    return result;
  }

  async search (params: CitiesSearchParams): Promise<ICitySearchItem[]> {
    this.logger.debug(`(CitiesLogic-Acsys) searching cities: locale=${params.locale}, size=${params.size}, term=${params.searchTerm}, includeCountry=${params.includeCountry}`);
    const result = await this.prismaImplementation.search(params);
    this.logger.debug(`(CitiesLogic-Acsys) search cities completed: locale=${params.locale}, size=${params.size}, term=${params.searchTerm}, includeCountry=${params.includeCountry}, count=${result.length}`);
    return result;
  }
}
