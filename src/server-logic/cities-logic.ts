import { PrismaClient } from '@prisma/client';
import { type Storage, type StorageValue } from 'unstorage';
import { type EntityId, type ICitiesLogic, type ICitySearchItem, type ICity, type IPopularCityData, type IPopularCityItem, type ITravelDetails } from '../shared/interfaces';
import { type IAppLogger } from '../shared/applogger';
import { DbConcurrencyVersions } from '../shared/constants';
import type { ICitiesSearchQuery } from '../server/dto';
import { AppException, AppExceptionCodeEnum } from '../shared/exceptions';
import { mapLocalizeableValues } from '../shared/common';
import { Mappers, Queries } from './queries';

export class CitiesLogic implements ICitiesLogic {
  private readonly AllPopularCitiesCacheKey = 'AllPopularCities';

  private logger: IAppLogger;
  private dbRepository: PrismaClient;
  private cache: Storage<StorageValue>;

  public static inject = ['cache', 'dbRepository', 'logger'] as const;
  constructor (cache: Storage<StorageValue>, dbRepository: PrismaClient, logger: IAppLogger) {
    this.logger = logger;
    this.dbRepository = dbRepository;
    this.cache = cache;
  }

  async getCity (slug: string): Promise<ICity> {
    this.logger.verbose(`(CitiesLogic) loading city, slug=${slug}`);

    const cityEntity = await this.dbRepository.city.findFirst({
      where: {
        isDeleted: false,
        slug
      },
      select: Queries.CityInfoQuery.select
    });
    if (!cityEntity) {
      this.logger.warn(`(CitiesLogic) city not found: slug=${slug}`);
      throw new AppException(
        AppExceptionCodeEnum.OBJECT_NOT_FOUND,
        'City not found',
        'error-stub');
    }

    const result: ICity = Mappers.MapCity(cityEntity);

    this.logger.verbose(`(CitiesLogic) city loaded, slug=${slug}, id=${result.id}`);
    return result;
  }

  async makeCityPopular (data: IPopularCityData): Promise<void> {
    this.logger.verbose(`(CitiesLogic) adding popular city data, cityId=${data.cityId}`);

    await this.dbRepository.popularCity.create({
      data: {
        city: {
          connect: {
            id: data.cityId
          }
        },
        rating: data.rating,
        promoLineStr: {
          create: data.promoLineStr
        },
        travelHeaderStr: {
          create: data.travelHeaderStr
        },
        travelTextStr: {
          create: data.travelTextStr
        },
        visibleOnWorldMap: data.visibleOnWorldMap ?? false
      },
      select: {
        id: true
      }
    });
    this.logger.debug('(CitiesLogic) adding popular city, resetting cache');
    await this.cache.removeItem(this.AllPopularCitiesCacheKey);

    this.logger.verbose(`(CitiesLogic) popular city data added, cityId=${data.cityId}`);
  }

  async getTravelDetails (cityId: number): Promise<Omit<ITravelDetails, 'price'>> {
    this.logger.verbose(`(CitiesLogic) city travel details requested, cityId=${cityId}`);

    const popularCityEntity = await this.dbRepository.popularCity.findFirst({
      where: {
        city: {
          isDeleted: false,
          id: cityId
        }
      },
      select: {
        city: Queries.CityInfoQuery,
        travelHeaderStr: true,
        travelTextStr: true,
        images: {
          select: {
            image: {
              select: {
                slug: true,
                file: {
                  select: {
                    modifiedUtc: true
                  }
                }
              }
            },
            order: true
          },
          where: {
            order: {
              gt: 1
            }
          }
        }
      }
    });

    if (!popularCityEntity) {
      this.logger.warn(`(CitiesLogic) popular city not found: cityId=${cityId}`);
      throw new AppException(
        AppExceptionCodeEnum.OBJECT_NOT_FOUND,
        'City not found',
        'error-stub');
    }

    const result: Omit<ITravelDetails, 'price'> = {
      header: popularCityEntity.travelHeaderStr,
      text: popularCityEntity.travelTextStr,
      images: popularCityEntity.images.map((i) => { return { slug: i.image.slug, timestamp: i.image.file.modifiedUtc.getTime() }; }),
      city: Mappers.MapCity(popularCityEntity.city)
    };

    this.logger.verbose(`(CitiesLogic) city travel details loaded, cityId=${cityId}, numImages=${result.images.length}, lastModified=${result.city.modifiedUtc}`);
    return result;
  }

  async setPopularCityImages (id: EntityId, images: { id: EntityId, order: number }[]): Promise<void> {
    this.logger.verbose(`(CitiesLogic) setting popular city images, cityId=${id}, images=${JSON.stringify(images)}`);

    await this.dbRepository.$transaction(async () => {
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
        this.logger.warn(`(CitiesLogic) popular city not found: cityId=${id}`);
        throw new AppException(
          AppExceptionCodeEnum.OBJECT_NOT_FOUND,
          'City not found',
          'error-stub');
      }

      this.logger.debug(`(CitiesLogic) deleting previous popular city image links, cityId=${id}`);
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

      this.logger.debug(`(CitiesLogic) creating popular city image links, cityId=${id}`);
      await this.dbRepository.$transaction(async () => {
        for (let i = 0; i < images.length; i++) {
          const image = images[i];
          await this.dbRepository.popularCityImage.create({
            data: {
              order: image.order,
              version: DbConcurrencyVersions.InitialVersion,
              isDeleted: false,
              imageId: image.id,
              popularCityId
            }
          });
        }
      });
    });
    this.logger.debug('(CitiesLogic) setting popular city images, resetting cache');
    await this.cache.removeItem(this.AllPopularCitiesCacheKey);

    this.logger.verbose(`(CitiesLogic) popular city images have been set, id=${id}, images=${JSON.stringify(images)}`);
  }

  async getPopularCities (): Promise<IPopularCityItem[]> {
    this.logger.debug('(CitiesLogic) obtaining list of popular cities');

    let result = await this.cache.getItem(this.AllPopularCitiesCacheKey) as IPopularCityItem[];
    if (!result) {
      this.logger.verbose('(CitiesLogic) obtaining list of popular cities, cache miss');
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
              lat: true
            }
          },
          images: {
            select: {
              image: {
                select: {
                  slug: true,
                  file: {
                    select: {
                      modifiedUtc: true
                    }
                  }
                }
              },
              order: true
            }
          }
        },
        orderBy: {
          city: {
            population: 'desc'
          }
        }
      });

      result = cityEntities.map((e) => {
        const cardImage = e.images.find(i => i.order === 1);
        return <IPopularCityItem>{
          id: e.city.id,
          cityDisplayName: e.city.nameStr,
          countryDisplayName: e.city.country.nameStr,
          promoLine: e.promoLineStr,
          imgSlug: cardImage?.image.slug ?? '', // cardImage may be undefined only if DB has not been initially seeded
          slug: e.city.slug,
          geo: {
            lon: e.city.lon.toNumber(),
            lat: e.city.lat.toNumber()
          },
          visibleOnWorldMap: e.visibleOnWorldMap,
          timestamp: cardImage?.image.file.modifiedUtc.getTime() ?? 0
        };
      });
      await this.cache.setItem(this.AllPopularCitiesCacheKey, result);
    }

    this.logger.debug(`(CitiesLogic) list of popular cities obtained, count=${result.length}`);
    return result;
  }

  async search (query: ICitiesSearchQuery): Promise<ICitySearchItem[]> {
    this.logger.verbose(`(CitiesLogic) searching cities: locale=${query.locale}, size=${query.size}, term=${query.searchTerm}, includeCountry=${query.includeCountry}`);

    const matchedEntities = await this.dbRepository.city.findMany({
      where: {
        isDeleted: false,
        ...((query.searchTerm?.length ?? 0) > 0
          ? {
              textForSearch: {
                contains: query.searchTerm!.toLowerCase()
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
      take: query.size
    });

    const result: ICitySearchItem[] = matchedEntities.map(e => <ICitySearchItem>{ id: e.id, slug: e.slug!, displayName: mapLocalizeableValues((city: string, country: string) => `${city}, ${country}`, e.nameStr, e.country.nameStr) });
    this.logger.verbose(`(CitiesLogic) cities search result: locale=${query.locale}, term=${query.searchTerm}, count=${result.length}`);

    return result;
  }
}
