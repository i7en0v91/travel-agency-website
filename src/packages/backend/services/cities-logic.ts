import { type IAppLogger, type EntityId, type ICity, mapLocalizeableValues, AppException, AppExceptionCodeEnum, DbVersionInitial, newUniqueId } from '@golobe-demo/shared';
import type { CitiesSearchParams, ICitiesLogic, ICitySearchItem, IPopularCityData, IPopularCityItem, ITravelDetails } from './../types';
import type { PrismaClient } from '@prisma/client';
import { CityInfoQuery, MapCity } from './queries';
import { mapDbGeoCoord, mapGeoCoord, executeInTransaction } from '../helpers/db';

export class CitiesLogic implements ICitiesLogic {
  private logger: IAppLogger;
  private dbRepository: PrismaClient;

  public static inject = ['dbRepository', 'logger'] as const;
  constructor (dbRepository: PrismaClient, logger: IAppLogger) {
    this.logger = logger.addContextProps({ component: 'CitiesLogic' });
    this.dbRepository = dbRepository;
  }

  async deleteCity(id: EntityId): Promise<void> {
    this.logger.verbose('deleting city', id);
    await this.dbRepository.city.update({
      where: {
        id,
        isDeleted: false
      },
      data: {
        isDeleted: true,
        version: { increment: 1 }
      }
    });
    this.logger.verbose('city deleted', id);
  };

  async getCity (slug: string): Promise<ICity> {
    this.logger.verbose('loading city', slug);

    const cityEntity = await this.dbRepository.city.findFirst({
      where: {
        isDeleted: false,
        slug
      },
      select: CityInfoQuery.select
    });
    if (!cityEntity) {
      this.logger.warn('city not found', undefined, slug);
      throw new AppException(
        AppExceptionCodeEnum.OBJECT_NOT_FOUND,
        'City not found',
        'error-stub');
    }

    const result: ICity = MapCity(cityEntity);

    this.logger.verbose('city loaded', { slug, id: result.id });
    return result;
  }

  async makeCityPopular (data: IPopularCityData): Promise<void> {
    this.logger.verbose('adding popular city data', { cityId: data.cityId });

    await executeInTransaction(async () => {
      await this.dbRepository.popularCity.create({
        data: {
          id: newUniqueId(),
          city: {
            connect: {
              id: data.cityId
            }
          },
          rating: data.rating,
          promoLineStr: {
            create: { 
              id: newUniqueId(), 
              version: DbVersionInitial,
              ...data.promoLineStr 
            }
          },
          travelHeaderStr: {
            create: { 
              id: newUniqueId(), 
              version: DbVersionInitial,
              ...data.travelHeaderStr 
            }
          },
          travelTextStr: {
            create: { 
              id: newUniqueId(), 
              version: DbVersionInitial,
              ...data.travelTextStr 
            }
          },
          visibleOnWorldMap: data.visibleOnWorldMap ?? false,
          version: DbVersionInitial
        },
        select: {
          id: true
        }
      });

      if (data.geo) {
        await this.dbRepository.city.update({
          where: {
            id: data.cityId
          },
          data: {
            lon: mapGeoCoord(data.geo.lon),
            lat: mapGeoCoord(data.geo.lat)
          }
        });
      }
    }, this.dbRepository);

    this.logger.verbose('popular city data added', { cityId: data.cityId });
  }

  async getTravelDetails (cityId: EntityId): Promise<Omit<ITravelDetails, 'price'>> {
    this.logger.verbose('city travel details requested', cityId);

    const popularCityEntity = await this.dbRepository.popularCity.findFirst({
      where: {
        city: {
          isDeleted: false,
          id: cityId
        }
      },
      select: {
        city: CityInfoQuery,
        travelHeaderStr: true,
        travelTextStr: true,
        images: {
          select: {
            image: {
              select: {
                slug: true,
                modifiedUtc: true
              }
            },
            orderNum: true
          },
          where: {
            orderNum: {
              gt: 1
            }
          }
        }
      }
    });

    if (!popularCityEntity) {
      this.logger.warn('popular city not found', undefined, cityId);
      throw new AppException(
        AppExceptionCodeEnum.OBJECT_NOT_FOUND,
        'City not found',
        'error-stub');
    }

    const result: Omit<ITravelDetails, 'price'> = {
      header: popularCityEntity.travelHeaderStr,
      text: popularCityEntity.travelTextStr,
      images: popularCityEntity.images.map((i) => { return { slug: i.image.slug, timestamp: i.image.modifiedUtc.getTime() }; }),
      city: MapCity(popularCityEntity.city)
    };

    this.logger.verbose('city travel details loaded', { cityId, numImages: result.images.length, lastModified: result.city.modifiedUtc });
    return result;
  }

  async setPopularCityImages (id: EntityId, images: { id: EntityId, order: number }[]): Promise<void> {
    this.logger.verbose('setting popular city images', { cityId: id, images });

    await executeInTransaction(async () => {
      const popularCityId = (await this.dbRepository.popularCity.findFirst({
        where: {
          city: {
            isDeleted: false,
            id
          }
        },
        select: {
          id: true
        }
      }))?.id;
      if (!popularCityId) {
        this.logger.warn('popular city not found', undefined, { cityId: id });
        throw new AppException(
          AppExceptionCodeEnum.OBJECT_NOT_FOUND,
          'City not found',
          'error-stub');
      }

      this.logger.debug('deleting previous popular city image links', { cityId: id });
      await this.dbRepository.popularCityImage.deleteMany({
        where: {
          popularCity: {
            city: {
              isDeleted: false,
              id
            }
          }
        }
      });

      this.logger.debug('creating popular city image links', { cityId: id });
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        await this.dbRepository.popularCityImage.create({
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
    }, this.dbRepository);

    this.logger.verbose('popular city images have been set', { id, images });
  }

  async getPopularCities (): Promise<IPopularCityItem[]> {
    this.logger.debug('obtaining list of popular cities');

    const cityEntities = await this.dbRepository.popularCity.findMany({
      where: {
        city: {
          isDeleted: false
        }
      },
      select: {
        // id: true,
        visibleOnWorldMap: true,
        promoLineStr: true,
        city: {
          select: {
            id: true,
            slug: true,
            nameStr: true,
            country: {
              include: {
                nameStr: true
              }
            },
            lon: true,
            lat: true,
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
        },
        images: {
          select: {
            image: {
              select: {
                slug: true,
                modifiedUtc: true
              }
            },
            orderNum: true
          }
        }
      },
      orderBy: {
        city: {
          population: 'desc'
        }
      }
    });

    const result = cityEntities.map((e) => {
      const cardImage = e.images.find(i => i.orderNum === 1);
      return <IPopularCityItem>{
        id: e.city.id,
        cityDisplayName: e.city.nameStr,
        countryDisplayName: e.city.country.nameStr,
        promoLine: e.promoLineStr,
        imgSlug: cardImage?.image.slug ?? '', // cardImage may be undefined only during DB initial seeding
        slug: e.city.slug,
        geo: {
          lon: mapDbGeoCoord(e.city.lon),
          lat: mapDbGeoCoord(e.city.lat)
        },
        visibleOnWorldMap: e.visibleOnWorldMap,
        numStays: e.city._count.hotels,
        timestamp: cardImage?.image.modifiedUtc.getTime() ?? 0
      };
    });

    this.logger.debug('list of popular cities obtained', { count: result.length });
    return result;
  }

  async search (params: CitiesSearchParams): Promise<ICitySearchItem[]> {
    this.logger.verbose('searching cities', { locale: params.locale, size: params.size, term: params.searchTerm, includeCountry: params.includeCountry });

    const matchedEntities = await this.dbRepository.city.findMany({
      where: {
        isDeleted: false,
        airports: {
          some: {
            isDeleted: false
          }
        },
        ...((params.searchTerm?.length ?? 0) > 0
          ? {
              textForSearch: {
                contains: params.searchTerm!.toLowerCase()
              }
            }
          : {})
      },
      select: {
        id: true,
        slug: true,
        country: {
          include: {
            nameStr: true
          }
        },
        nameStr: true
      },
      orderBy: {
        population: 'desc'
      },
      take: params.size
    });

    const result: ICitySearchItem[] = matchedEntities.map(e => <ICitySearchItem>{ id: e.id, slug: e.slug!, displayName: mapLocalizeableValues((city: string, country: string) => `${city}, ${country}`, e.nameStr, e.country.nameStr) });
    this.logger.verbose('cities search result', { locale: params.locale, term: params.searchTerm, count: result.length });

    return result;
  }
}
