import type { PrismaClient } from '@prisma/client';
import { Decimal } from 'decimal.js';
import dayjs from 'dayjs';
import orderBy from 'lodash-es/orderBy';
import isString from 'lodash-es/isString';
import { type Storage, type StorageValue } from 'unstorage';
import { murmurHash } from 'ohash';
import sanitize from 'sanitize-html';
import { type IStayOfferDetails, type IStayReview, type StayServiceLevel, type ISearchStayOffersResultFilterParams, type ICity, type ISearchStayOffersResult, type StayOffersSortFactor, type IStayOffersFilterParams, type IStaysLogic, type IPagination, type ISorting, type Price, type EntityId, type IStayShort, type EntityDataAttrsOnly, type IStayOffer, type IStay, type IStayData } from '../shared/interfaces';
import { type IAppLogger } from '../shared/applogger';
import { MaxOfferGenerationMemoryBufferItems, DefaultStayOffersSorting, DbVersionInitial, TemporaryEntityId, DefaultStayReviewScore } from '../shared/constants';
import AppConfig from '../appconfig';
import { AppException, AppExceptionCodeEnum } from '../shared/exceptions';
import { normalizePrice, buildStayOfferUniqueDataKey } from './helpers/utils';
import { MapStayReview, StayReviewsQuery, MapStayOffer, MapStayShort, StayInfoQuery, MapStay, StayOfferInfoQuery, MapStayOfferDetails } from './queries';

declare type OfferWithSortFactor<TOffer extends IStayOffer> = EntityDataAttrsOnly<TOffer> & { sortFactor: number };

export class StaysLogic implements IStaysLogic {
  private readonly AllStaysCacheKey = 'AllStaysCacheKey';

  private logger: IAppLogger;
  private dbRepository: PrismaClient;
  private cache: Storage<StorageValue>;

  public static inject = ['cache', 'dbRepository', 'logger'] as const;
  constructor (cache: Storage<StorageValue>, dbRepository: PrismaClient, logger: IAppLogger) {
    this.logger = logger;
    this.dbRepository = dbRepository;
    this.cache = cache;
  }

  async createStay (data: IStayData): Promise<EntityId> {
    this.logger.verbose(`(StaysLogic) creating stay, slug=${data.slug}`);

    const stayId = await this.dbRepository.$transaction(async () => {
      const entityId = (await this.dbRepository.hotel.create({
        data: {
          nameStr: {
            create: data.name
          },
          city: {
            connect: {
              id: data.cityId
            }
          },
          lat: data.geo.lat,
          lon: data.geo.lon,
          slug: data.slug,
          version: DbVersionInitial
        },
        select: {
          id: true
        }
      })).id;

      for (let i = 0; i < data.descriptionData.length; i++) {
        const descriptionData = data.descriptionData[i];
        await this.dbRepository.hotelDescription.create({
          data: {
            textStr: {
              create: descriptionData.textStr
            },
            hotel: {
              connect: {
                id: entityId
              }
            },
            paragraphKind: descriptionData.paragraphKind,
            order: descriptionData.order,
            version: DbVersionInitial
          }
        });
      }

      for (let i = 0; i < data.imagesData.length; i++) {
        const imageData = data.imagesData[i];
        await this.dbRepository.hotelImage.create({
          data: {
            image: {
              connect: {
                id: imageData.imageId
              }
            },
            hotel: {
              connect: {
                id: entityId
              }
            },
            order: imageData.order,
            serviceLevel: imageData.serviceLevel,
            version: DbVersionInitial
          }
        });
      }

      for (let i = 0; i < data.reviewsData.length; i++) {
        const reviewData = data.reviewsData[i];
        await this.dbRepository.hotelReview.create({
          data: {
            textStr: {
              create: reviewData.text
            },
            hotel: {
              connect: {
                id: entityId
              }
            },
            user: {
              connect: {
                id: reviewData.userId
              }
            },
            score: reviewData.score,
            version: DbVersionInitial
          }
        });
      }

      return entityId;
    });

    this.logger.verbose(`(StaysLogic) stay created, slug=${data.slug}, id=${stayId}`);
    return stayId;
  }

  async findStay (idOrSlug: EntityId | string): Promise<IStay | undefined> {
    this.logger.verbose(`(StaysLogic) loading stay, id=${idOrSlug}`);
    const entity = await this.dbRepository.hotel.findFirst({
      where: {
        isDeleted: false,
        id: (isString(idOrSlug) ? undefined : idOrSlug),
        slug: (isString(idOrSlug) ? idOrSlug : undefined)
      },
      select: StayInfoQuery.select
    });
    if (!entity) {
      this.logger.warn(`(StaysLogic) cannot found stay, id=${idOrSlug}`);
      return undefined;
    }

    this.logger.verbose(`(StaysLogic) stay found, id=${entity.id}, slug=${entity.slug}, numDescriptions=${entity.description.length}, numReviews=${entity.reviews.length}, numImages=${entity.images.length}`);
    return MapStay(entity);
  }

  async getStayOffer (id: EntityId, userId: EntityId | 'guest'): Promise<IStayOfferDetails> {
    this.logger.verbose(`(StaysLogic) get stay offer, id=${id}, userId=${userId}`);

    const entity = await this.dbRepository.stayOffer.findFirst({
      where: {
        isDeleted: false,
        id
      },
      select: StayOfferInfoQuery(userId).select
    });
    if (!entity) {
      this.logger.warn(`(StaysLogic) stay offer was not found, id=${id}, userId=${userId}`);
      throw new AppException(AppExceptionCodeEnum.OBJECT_NOT_FOUND, 'stay offer not found', 'error-page');
    }

    this.logger.verbose(`(StaysLogic) get stay offer - found, id=${id}, userId=${userId}, modifiedUtc=${entity.modifiedUtc}, price=${entity.totalPrice}`);
    const offerDetails = MapStayOfferDetails(entity);
    return {
      ...offerDetails,
      prices: {
        base: this.doCalculatePrice(offerDetails.stay.city, offerDetails.stay, 'base'),
        'cityView-1': this.doCalculatePrice(offerDetails.stay.city, offerDetails.stay, 'cityView-1'),
        'cityView-2': this.doCalculatePrice(offerDetails.stay.city, offerDetails.stay, 'cityView-2'),
        'cityView-3': this.doCalculatePrice(offerDetails.stay.city, offerDetails.stay, 'cityView-3')
      }
    };
  }

  async getAllStays (): Promise<IStayShort[]> {
    this.logger.debug('(StaysLogic) obtaining list of stays');

    let result = await this.cache.getItem(this.AllStaysCacheKey) as IStayShort[];
    if (!result) {
      this.logger.verbose('(StaysLogic) obtaining list of stays, cache miss');
      const stayEntities = await this.dbRepository.hotel.findMany({
        where: {
          isDeleted: false
        },
        select: StayInfoQuery.select,
        orderBy: {
          city: {
            population: 'desc'
          }
        }
      });

      result = stayEntities.map(MapStayShort);
      await this.cache.setItem(this.AllStaysCacheKey, result);
    }

    this.logger.debug(`(StaysLogic) list of stays obtained, count=${result.length}`);
    return result;
  }

  async toggleFavourite (offerId: EntityId, userId: EntityId): Promise<boolean> {
    this.logger.verbose(`(StaysLogic) toggling favourite offer, id=${offerId}, userId=${userId}`);

    const entity = await this.dbRepository.userStayOffer.findFirst({
      where: {
        isDeleted: false,
        userId,
        offerId
      },
      select: {
        id: true,
        isFavourite: true
      }
    });

    let result: boolean;
    if (entity) {
      result = !entity.isFavourite;
      this.logger.debug(`(StaysLogic) toggling existing favourite record, id=${offerId}, userId=${userId}, favouriteId=${entity.id}, isFavourite=${result}`);
      await this.dbRepository.userStayOffer.update({
        where: {
          id: entity.id
        },
        data: {
          version: { increment: 1 },
          isFavourite: result,
          modifiedUtc: dayjs().utc().toDate()
        }
      });
    } else {
      this.logger.debug(`(StaysLogic) creating existing favourite record, id=${offerId}, userId=${userId}`);
      result = true;
      await this.dbRepository.userStayOffer.create({
        data: {
          version: DbVersionInitial,
          isFavourite: result,
          userId,
          offerId
        }
      });
    }

    this.logger.verbose(`(StaysLogic) favourite offer toggled, id=${offerId}, userId=${userId}, result=${result}`);
    return result;
  }

  async searchOffers (filter: IStayOffersFilterParams, userId: EntityId | 'guest', sorting: ISorting<StayOffersSortFactor>, pagination: IPagination, narrowFilterParams: boolean): Promise<ISearchStayOffersResult> {
    this.logger.verbose(`(StaysLogic) search offers, filter=${JSON.stringify(filter)}, userId=${userId}, sorting=${JSON.stringify(sorting)}, pagination=${JSON.stringify(pagination)}, narrowFilterParams=${narrowFilterParams}`);

    try {
      const sortFactor = sorting.factor ?? DefaultStayOffersSorting;
      let variants = await this.generateStayOffersFull(filter, userId, sortFactor);
      this.logger.debug(`(StaysLogic) sorting stay offer variants, userId=${userId}`);
      variants = orderBy(variants, ['sortFactor'], [sorting.direction]);
      let filterParams : ISearchStayOffersResultFilterParams | undefined;
      if (narrowFilterParams) {
        filterParams = this.computeStayOffersFilterParams(variants, userId);
      }
      variants = this.filterStayOffers(variants, filter, userId);
      const totalCount = variants.length;

      const take = pagination.skip >= variants.length ? 0 : (Math.min(variants.length - pagination.skip, pagination.take));
      const skip = pagination.skip;
      this.logger.debug(`(StaysLogic) applying pagination to stay offers, userId=${userId}, skip=${skip}, take=${take}`);
      if (pagination.skip >= variants.length) {
        variants = [];
      } else {
        variants = variants.slice(skip, skip + take);
      }
      await this.ensureOffersInDatabase(variants, userId);

      const result: ISearchStayOffersResult = {
        pagedItems: variants,
        paramsNarrowing: filterParams,
        totalCount
      };
      this.logger.verbose(`(StaysLogic) search offers - completed, filter=${JSON.stringify(filter)}, userId=${userId}, count=${variants.length}`);
      return result;
    } catch (err: any) {
      this.logger.warn('(StaysLogic) error occured while searching offers', err, { filter, pagination, userId });
      throw err;
    }
  }

  async getUserFavouriteOffers (userId: EntityId): Promise<ISearchStayOffersResult<IStayOffer & { addDateUtc: Date; }>> {
    this.logger.verbose(`(StaysLogic) get user favourite offers, userId=${userId}`);

    const userOffers = await this.dbRepository.userStayOffer.findMany({
      where: {
        isDeleted: false,
        isFavourite: true,
        userId
      },
      select: {
        modifiedUtc: true,
        offer: {
          select: StayOfferInfoQuery(userId).select
        }
      }
    });

    const mappedItems = userOffers.map((uo) => { return { addDateUtc: uo.modifiedUtc, ...(MapStayOffer(uo.offer)) }; }).filter(o => !o.isDeleted);
    const result: ISearchStayOffersResult<IStayOffer & { addDateUtc: Date }> = {
      pagedItems: mappedItems,
      paramsNarrowing: undefined,
      totalCount: mappedItems.length
    };

    this.logger.verbose(`(StaysLogic) get user favourite offers completed, userId=${userId}, count=${result.totalCount}`);
    return result;
  }

  async getUserTickets(userId: EntityId): Promise<ISearchStayOffersResult<IStayOffer & { bookingId: EntityId, bookDateUtc: Date; }>> {
    this.logger.verbose(`(StaysLogic) get user tickets, userId=${userId}`);

    const userOffers = await this.dbRepository.userStayOffer.findMany({
      where: {
        isDeleted: false,
        booking: {
          isDeleted: false,
          id: {
            gt: 0
          }
        },
        userId
      },
      select: {
        offer: {
          select: StayOfferInfoQuery(userId).select
        },
        booking: {
          select: {
            id: true,
            modifiedUtc: true
          }
        }
      }
    });

    const mappedItems = userOffers.map((uo) => { return { bookingId: uo.booking!.id, bookDateUtc: uo.booking!.modifiedUtc, ...(MapStayOffer(uo.offer)) }; }).filter(o => !o.isDeleted);
    const result: ISearchStayOffersResult<IStayOffer & { bookingId: EntityId, bookDateUtc: Date; }> = {
      pagedItems: mappedItems,
      paramsNarrowing: undefined,
      totalCount: mappedItems.length
    };

    this.logger.verbose(`(StaysLogic) get user tickets completed, userId=${userId}, count=${result.totalCount}`);
    return result;
  }

  async createOffersAndFillIds (offers: OfferWithSortFactor<IStayOffer>[]): Promise<void> {
    this.logger.verbose(`(StaysLogic) creating memory offers and filling IDs, count=${offers.length}`);
    if (offers.length === 0) {
      return;
    }

    this.logger.debug('(StaysLogic) running offer\'s create transaction');
    await this.dbRepository.$transaction(async () => {
      for (let i = 0; i < offers.length; i++) {
        const offer = offers[i];
        const dataHash = buildStayOfferUniqueDataKey(offer);

        const queryResult = await this.dbRepository.stayOffer.create({
          data: {
            checkIn: offer.checkIn,
            checkOut: offer.checkOut,
            numGuests: offer.numGuests,
            numRooms: offer.numRooms,
            totalPrice: offer.totalPrice.toNumber(),
            dataHash,
            hotelId: offer.stay.id,
            version: DbVersionInitial,
            isDeleted: false
          },
          select: {
            id: true
          }
        });

        offer.id = queryResult.id;
      }
    });

    this.logger.verbose(`(StaysLogic) creating memory offers and filling IDs - completed, count=${offers.length}`);
  }

  async ensureOffersInDatabase (offers: OfferWithSortFactor<IStayOffer>[], userId: EntityId | 'guest'): Promise<void> {
    this.logger.debug(`(StaysLogic) ensuring offers in DB, userId=${userId}, count=${offers.length}`);

    const memoryOffersMap = new Map<string, OfferWithSortFactor<IStayOffer>>(
      offers.map(o => [buildStayOfferUniqueDataKey(o), o]));

    const dbOffers = (await this.dbRepository.stayOffer.findMany({
      where: {
        isDeleted: false,
        dataHash: {
          in: [...memoryOffersMap.keys()]
        }
      },
      select: StayOfferInfoQuery(userId).select
    })).map(MapStayOffer);

    const dbOffersMap = new Map<string, IStayOffer>(dbOffers.map(o => [o.dataHash, o]));

    const offersToCreate = [] as OfferWithSortFactor<IStayOffer>[];
    let identifiedCount = 0;
    for (let i = 0; i < offers.length; i++) {
      const offer = offers[i];
      const dataKey = buildStayOfferUniqueDataKey(offer);
      const matchedDbOffer = dbOffersMap.get(dataKey);
      if (matchedDbOffer) {
        offer.id = matchedDbOffer.id;
        offer.isFavourite = matchedDbOffer.isFavourite;
        identifiedCount++;
      } else {
        offer.isFavourite = false;
        offersToCreate.push(offer);
      }
    }

    if (offersToCreate.length) {
      await this.createOffersAndFillIds(offersToCreate);
    }

    this.logger.debug(`(StaysLogic) ensuring offers in DB - completed, userId=${userId}, count=${offers.length}, num identified=${identifiedCount}`);
  }

  async createOrUpdateReview (stayId: EntityId, textOrHtml: string, score: number, userId: EntityId): Promise<EntityId> {
    this.logger.verbose(`(StaysLogic) create/update review, stayId=${stayId}, textOrHtml=${textOrHtml}, score=${score}, userId=${userId}`);

    if ((textOrHtml ?? '').length === 0) {
      this.logger.warn(`(StaysLogic) create/update review - cannot create review with empty text, stayId=${stayId}, textOrHtml=${textOrHtml}, userId=${userId}`);
      throw new AppException(AppExceptionCodeEnum.BAD_REQUEST, 'review text is empty', 'error-stub');
    }

    const stayExists = (await this.dbRepository.hotel.count({
      where: {
        isDeleted: false,
        id: stayId
      },
      select: {
        id: true
      }
    })).id > 0;
    if (!stayExists) {
      this.logger.warn(`(StaysLogic) create/update review - stay was not found, stayId=${stayId}, textOrHtml=${textOrHtml}, userId=${userId}`);
      throw new AppException(AppExceptionCodeEnum.OBJECT_NOT_FOUND, 'stay not found', 'error-stub');
    }

    let textOrHtmlSanitized: string;
    this.logger.debug(`(StaysLogic) create/update review - sanitizing input, stayId=${stayId}, userId=${userId}`);
    try {
      textOrHtmlSanitized = sanitize(textOrHtml);
    } catch (err: any) {
      this.logger.warn(`(StaysLogic) create/update review - failed to sanitize input, stayId=${stayId}, textOrHtml=${textOrHtml}, userId=${userId}`, err);
      throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'text processing error', 'error-stub');
    }
    if (!textOrHtmlSanitized) {
      this.logger.warn(`(StaysLogic) create/update review - resulted sanitize input empty, stayId=${stayId}, textOrHtml=${textOrHtml}, userId=${userId}`);
      throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'text processing error', 'error-stub');
    }
    if (textOrHtmlSanitized.replace(/\s/g, '').replace(/\c/g, '') !== textOrHtml.replace(/\s/g, '').replace(/\c/g, '')) {
      this.logger.warn(`(StaysLogic) create/update review - sanitization detected potential issues, stayId=${stayId}, userId=${userId}, textOrHtml=${textOrHtml}, sanitized=${textOrHtmlSanitized}`);
    }

    let reviewId = (await this.dbRepository.hotelReview.findFirst({
      where: {
        userId,
        hotelId: stayId,
        isDeleted: false
      },
      select: {
        id: true
      }
    }))?.id;

    let resOp: 'created' | 'updated';
    if (reviewId) {
      resOp = 'updated';
      await this.dbRepository.hotelReview.update({
        where: {
          id: reviewId
        },
        data: {
          score,
          version: { increment: 1 },
          textStr: {
            create: {
              en: textOrHtmlSanitized,
              fr: textOrHtmlSanitized,
              ru: textOrHtmlSanitized
            }
          }
        } as any,
        select: {
          id: true
        }
      });
    } else {
      resOp = 'created';
      reviewId = (await this.dbRepository.hotelReview.create({
        data: {
          score,
          version: DbVersionInitial,
          hotel: {
            connect: {
              id: stayId
            }
          },
          user: {
            connect: {
              id: userId
            }
          },
          textStr: {
            create: {
              en: textOrHtmlSanitized,
              fr: textOrHtmlSanitized,
              ru: textOrHtmlSanitized
            }
          }
        } as any,
        select: {
          id: true
        }
      })).id;
    }

    this.logger.verbose(`(StaysLogic) create/update review, stayId=${stayId}, score=${score}, userId=${userId}, reviewId=${reviewId}, op=${resOp}`);
    return reviewId;
  }

  async deleteReview (stayId: EntityId, userId: EntityId): Promise<EntityId | undefined> {
    this.logger.verbose(`(StaysLogic) delete review, stayId=${stayId}, userId=${userId}`);

    const reviewId = (await this.dbRepository.hotelReview.findFirst({
      where: {
        userId,
        hotelId: stayId,
        isDeleted: false
      },
      select: {
        id: true
      }
    }))?.id;

    if (reviewId) {
      const deleted = (await this.dbRepository.hotelReview.update({
        where: {
          id: reviewId,
          isDeleted: false
        },
        data: {
          isDeleted: true,
          version: { increment: 1 }
        },
        select: {
          id: true
        }
      }))?.id;
      if (deleted) {
        this.logger.verbose(`(StaysLogic) delete review - done, stayId=${stayId}, userId=${userId}, reviewId=${reviewId}`);
      } else {
        this.logger.warn(`(StaysLogic) delete review - done, but seems like concurrent modification occured, stayId=${stayId}, userId=${userId}, reviewId=${reviewId}`);
      }
      return reviewId;
    } else {
      this.logger.debug(`(StaysLogic) delete review - already deleted, stayId=${stayId}, userId=${userId}`);
      return undefined;
    }
  }

  async getStayReviews (stayId: EntityId): Promise<EntityDataAttrsOnly<IStayReview>[]> {
    this.logger.verbose(`(StaysLogic) get reviews, stayId=${stayId}`);

    const reviewEntities = await this.dbRepository.hotelReview.findMany({
      where: {
        isDeleted: false,
        hotelId: stayId
      },
      include: StayReviewsQuery.include
    });

    const result: EntityDataAttrsOnly<IStayReview>[] = reviewEntities.map(MapStayReview);
    this.logger.verbose(`(StaysLogic) get reviews - completed, stayId=${stayId}, count=${result.length}`);
    return result;
  }

  filterStayOffers (offers: OfferWithSortFactor<IStayOffer>[], filter: IStayOffersFilterParams, userId: EntityId | 'guest'): OfferWithSortFactor<IStayOffer>[] {
    this.logger.debug(`(StaysLogic) filtering stay offer variants, filter=${JSON.stringify(filter)}, userId=${userId}, count=${offers.length}`);

    const isMatch = (offer: OfferWithSortFactor<IStayOffer>): boolean => {
      if (filter.price?.from || filter.price?.to) {
        if (filter.price?.from && offer.totalPrice.lessThan(filter.price.from)) {
          return false;
        }

        if (filter.price?.to && offer.totalPrice.greaterThan(filter.price.to)) {
          return false;
        }
      }

      if ((filter.ratings?.length ?? 0) > 0) {
        const ratingValues = filter.ratings!.includes(4) ? [...filter.ratings!, 5] : filter.ratings!;
        const ratingMatches = ratingValues.some(r => Math.abs(r - Math.floor(offer.stay.reviewScore)) < 0.01);
        if (!ratingMatches) {
          return false;
        }
      }

      return true;
    };

    const result = offers.filter(isMatch);

    this.logger.debug(`(StaysLogic) stay offers filtered, userId=${userId}, count=${result.length}`);
    return result;
  }

  computeStayOffersFilterParams (offers: OfferWithSortFactor<IStayOffer>[], userId: EntityId | 'guest'): ISearchStayOffersResultFilterParams {
    this.logger.debug(`(StaysLogic) computing stay offer filter params, userId=${userId}, count=${offers.length}`);

    let result: ISearchStayOffersResultFilterParams = {};
    if (offers.length > 0) {
      result = {
        priceRange: {
          from: Math.min(...offers.map(o => o.totalPrice.toNumber())),
          to: Math.max(...offers.map(o => o.totalPrice.toNumber()))
        }
      };
    }

    this.logger.debug(`(StaysLogic) stay offer filter params computed, userId=${userId}, count=${offers.length}, result=${JSON.stringify(result)}`);
    return result;
  }

  calculatePrice = (stay: EntityDataAttrsOnly<IStayShort>, serviceLevel: StayServiceLevel): Price => {
    return this.doCalculatePrice(stay.city, stay, serviceLevel);
  };

  doCalculatePrice (city: Pick<ICity, 'name'>, stay: Pick<IStayShort, 'name'>, serviceLevel: StayServiceLevel): Price {
    const hashString = (value: string) => murmurHash(Buffer.from(value).toString('base64'));

    let serviceLevelPrice = 150;
    switch (serviceLevel) {
      case 'cityView-1':
        serviceLevelPrice += 50;
        break;
      case 'cityView-2':
        serviceLevelPrice += 100;
        break;
      case 'cityView-3':
        serviceLevelPrice += 150;
        break;
    }

    const cityAdjustment = (hashString(city.name.en) % 5) * 10;
    const stayAdjustment = (hashString(stay.name.en) % 5) * 10;

    return new Decimal(normalizePrice(cityAdjustment + stayAdjustment + serviceLevelPrice, 0));
  }

  calculateOfferPrice (offer: EntityDataAttrsOnly<IStayOffer>): Price {
    let result = this.doCalculatePrice(offer.stay.city, offer.stay, 'base');
    result = result.times(offer.numRooms);
    return result;
  }

  getStayOfferSortFactorValue = (offer: EntityDataAttrsOnly<IStayOffer>, factor: StayOffersSortFactor): number => {
    switch (factor) {
      case 'price':
        return offer.totalPrice.toNumber();
      case 'rating':
        return offer.stay.reviewScore ?? DefaultStayReviewScore;
      case 'score':
        return offer.stay.numReviews + (offer.stay.reviewScore ?? DefaultStayReviewScore) * 8 + offer.totalPrice.toNumber() / 10;
      default:
        this.logger.warn(`(StaysLogic) unexpected stay offer sort factor: ${factor}`);
        throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'unexpected sorting', 'error-stub');
    }
  };

  async generateStayOffersFull (filter: IStayOffersFilterParams, userId: EntityId | 'guest', sortFactor: StayOffersSortFactor): Promise<OfferWithSortFactor<IStayOffer>[]> {
    this.logger.debug(`(StaysLogic) generating full stay offer variants, userId=${userId}`);

    const varyDate = (date: Date): Date[] => {
      const result: Date[] = [];
      for (let i = -AppConfig.searchOffers.flexibleDatesRangeDays; i <= AppConfig.searchOffers.flexibleDatesRangeDays; i++) {
        result.push(dayjs(date).add(i, 'day').toDate());
      }
      return result;
    };

    // construct date variants
    const checkInAdj = filter.checkIn ? filter.checkIn : (filter.checkOut ? dayjs(filter.checkOut).add(-AppConfig.autoInputDatesRangeDays, 'day').toDate() : dayjs().toDate());
    const checkOutAdj = filter.checkOut ? filter.checkOut : dayjs(checkInAdj).add(AppConfig.autoInputDatesRangeDays, 'day').toDate();

    let checkInDateVariants = filter.checkIn ? [checkInAdj] : varyDate(checkInAdj);
    const checkOutDateVariants = filter.checkOut ? [checkOutAdj] : varyDate(checkOutAdj);
    if (checkOutDateVariants) {
      checkInDateVariants = checkInDateVariants.filter(d => d.getTime() < checkOutDateVariants[0].getTime());
      if (!checkInDateVariants.length) {
        checkInDateVariants.push(checkOutDateVariants[0]);
      }
    }
    this.logger.debug(`(StaysLogic) generating full stay offer variants, userId=${userId}, using date variants: from=[${checkInDateVariants.map(d => d.toISOString()).join(', ')}], to=[${checkOutDateVariants?.map(d => d.toISOString()).join(', ') ?? '(none)'}]`);

    let stayVariants = [] as IStayShort[];
    if (filter.citySlug) {
      stayVariants = (await this.getAllStays()).filter(x => x.city.slug === filter.citySlug!);
    }
    if (stayVariants.length === 0 && !filter.citySlug) {
      stayVariants = await this.getAllStays();
    }

    this.logger.debug(`(StaysLogic) generating full stay offer variants, userId=${userId}, stay variants count=${stayVariants.length}`);

    const numGuests = filter.numGuests ?? 1;
    const numRooms = filter.numRooms ?? 1;

    const usedDataHashes = new Set<string>(); // for preventing duplicates
    const result: OfferWithSortFactor<IStayOffer>[] = [];
    for (let i = 0; i < checkInDateVariants.length; i++) {
      for (let j = 0; j < (checkOutDateVariants?.length ?? 1); j++) {
        for (let k = 0; k < stayVariants.length; k++) {
          const checkIn = checkInDateVariants[i];
          const checkOut = checkOutDateVariants[j];
          const stay = stayVariants[k];
          const offer: OfferWithSortFactor<IStayOffer> = {
            checkIn,
            checkOut,
            id: TemporaryEntityId,
            isFavourite: false,
            kind: 'stays',
            numGuests,
            numRooms,
            stay,
            sortFactor: 0,
            totalPrice: new Decimal(0)
          };
          offer.totalPrice = await this.calculateOfferPrice(offer);
          offer.sortFactor = this.getStayOfferSortFactorValue(offer, sortFactor);
          const dataHash = buildStayOfferUniqueDataKey(offer);
          if (!usedDataHashes.has(dataHash)) {
            result.push(offer);
            usedDataHashes.add(dataHash);

            if (result.length > MaxOfferGenerationMemoryBufferItems) {
              this.logger.warn(`(StaysLogic) maximum number of stay offer items in memory buffer reached, stopping generation with current values, filter=${JSON.stringify(filter)}, userId=${userId}`);
              break;
            }
          }
        }
      }
    }

    this.logger.debug(`(StaysLogic) generating full stay offer variants, userId=${userId}, result count=${result.length}`);
    return result;
  }
}
