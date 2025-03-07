import { type ISearchStayOffersResultFilterParams, type ISearchStayOffersResult, type IStayData, type IStayOffersFilterParams, DefaultStayReviewScore, normalizePrice, AppException, AppExceptionCodeEnum, AppConfig, MaxOfferGenerationMemoryBufferItems, DefaultStayOffersSorting, DbVersionInitial, TemporaryEntityId, newUniqueId, type IAppLogger, type IStayOfferDetails, type IStayReview, type StayServiceLevel, type ICity, type StayOffersSortFactor, type IPagination, type ISorting, type Price, type EntityId, type IStayShort, type EntityDataAttrsOnly, type IStayOffer, type IStay, type ReviewSummary, type PreviewMode, StaysMinGuestsCount, StaysMinRoomsCount } from '@golobe-demo/shared';
import type { IStaysLogic } from './../types';
import type { PrismaClient } from '@prisma/client';
import { Decimal } from 'decimal.js';
import orderBy from 'lodash-es/orderBy';
import isString from 'lodash-es/isString';
import { murmurHash } from 'ohash';
import { buildStayOfferUniqueDataKey } from './../helpers/utils';
import { MapStayReview, StayReviewsQuery, MapStayOffer, MapStayShort, StayInfoQuery, MapStay, StayOfferInfoQuery, MapStayOfferDetails } from './queries';
import { mapGeoCoord, executeInTransaction } from '../helpers/db';
import type { IStayOfferMaterializer } from './../common-services/offer-materializers';
import dayjs from 'dayjs';
import sanitize from 'sanitize-html';


declare type OfferWithSortFactor<TOffer extends IStayOffer> = EntityDataAttrsOnly<TOffer> & { sortFactor: number };

export class StaysLogic implements IStaysLogic {
  private logger: IAppLogger;
  private dbRepository: PrismaClient;
  private offerMaterializer: IStayOfferMaterializer;

  public static inject = ['dbRepository', 'stayOfferMaterializer', 'logger'] as const;
  constructor (dbRepository: PrismaClient, offerMaterializer: IStayOfferMaterializer, logger: IAppLogger) {
    this.logger = logger.addContextProps({ component: 'StaysLogic' });
    this.dbRepository = dbRepository;
    this.offerMaterializer = offerMaterializer;
  }

  async deleteStayOffer(id: EntityId): Promise<void> {
    this.logger.verbose('deleting stay offer', id);
    await executeInTransaction(async () => {
      await this.dbRepository.booking.updateMany({
        where: {
          stayOffer: {
            id
          },
          isDeleted: false
        },
        data: {
          isDeleted: true,
          version: { increment: 1 }
        }
      });
      await this.dbRepository.userStayOffer.updateMany({
        where: {
          offer: {
            id
          },
          isDeleted: false
        },
        data: {
          isDeleted: true,
          version: { increment: 1 }
        }
      });
      await this.dbRepository.stayOffer.update({
        where: {
          id,
          isDeleted: false
        },
        data: {
          isDeleted: true,
          version: { increment: 1 }
        }
      });
    }, this.dbRepository);
    this.logger.verbose('stay offer deleted', id);
  };

  async deleteStay(stayId: EntityId): Promise<void> {
    this.logger.verbose('deleting stay', { id: stayId });
    await this.dbRepository.hotel.update({
      where: {
        id: stayId,
        isDeleted: false
      },
      data: {
        isDeleted: true,
        version: { increment: 1 }
      }
    });
    this.logger.verbose('stay deleted', { id: stayId });
  };

  async createStay (data: IStayData): Promise<EntityId> {
    this.logger.verbose('creating stay', { slug: data.slug });

    const stayId = await executeInTransaction(async () => {
      const entityId = (await this.dbRepository.hotel.create({
        data: {
          id: newUniqueId(),
          nameStr: {
            create: {
              id: newUniqueId(),
              version: DbVersionInitial,
              ...data.name
            }
          },
          city: {
            connect: {
              id: data.cityId
            }
          },
          lat: mapGeoCoord(data.geo.lat),
          lon: mapGeoCoord(data.geo.lon),
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
            id: newUniqueId(),
            textStr: {
              create: { 
                id: newUniqueId(),
                version: DbVersionInitial,
                ...descriptionData.textStr
              }
            },
            hotel: {
              connect: {
                id: entityId
              }
            },
            paragraphKind: descriptionData.paragraphKind,
            orderNum: descriptionData.order,
            version: DbVersionInitial
          }
        });
      }

      for (let i = 0; i < data.imagesData.length; i++) {
        const imageData = data.imagesData[i];
        await this.dbRepository.hotelImage.create({
          data: {
            id: newUniqueId(),
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
            orderNum: imageData.order,
            serviceLevel: imageData.serviceLevel,
            version: DbVersionInitial
          }
        });
      }

      for (let i = 0; i < data.reviewsData.length; i++) {
        const reviewData = data.reviewsData[i];
        await this.dbRepository.hotelReview.create({
          data: {
            id: newUniqueId(),
            textStr: {
              create: { 
                id: newUniqueId(),
                version: DbVersionInitial,
                ...reviewData.text
              }
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
    }, this.dbRepository);

    this.logger.verbose('stay created', { slug: data.slug, id: stayId });
    return stayId;
  }

  async findStay (idOrSlug: EntityId | string): Promise<IStay | undefined> {
    this.logger.verbose('loading stay', { id: idOrSlug });
    const entity = await this.dbRepository.hotel.findFirst({
      where: {
        isDeleted: false,
        id: (isString(idOrSlug) ? undefined : idOrSlug),
        slug: (isString(idOrSlug) ? idOrSlug : undefined)
      },
      select: StayInfoQuery.select
    });
    if (!entity) {
      this.logger.warn('cannot found stay', undefined, idOrSlug);
      return undefined;
    }

    this.logger.verbose('stay found', { id: entity.id, slug: entity.slug, numDescriptions: entity.description.length, numReviews: entity.reviews.length, numImages: entity.images.length });
    return MapStay(entity);
  }

  async getStayOffer (id: EntityId, userId: EntityId | 'guest'): Promise<IStayOfferDetails> {
    this.logger.verbose('get stay offer', { id, userId });

    const entity = await this.dbRepository.stayOffer.findFirst({
      where: {
        isDeleted: false,
        id
      },
      select: StayOfferInfoQuery(userId).select
    });
    if (!entity) {
      this.logger.warn('stay offer was not found', undefined, { id, userId });
      throw new AppException(AppExceptionCodeEnum.OBJECT_NOT_FOUND, 'stay offer not found', 'error-page');
    }

    this.logger.verbose('get stay offer - found', { id, userId, modifiedUtc: entity.modifiedUtc, price: entity.totalPrice });
    const offerDetails = MapStayOfferDetails(entity);
    return {
      ...offerDetails,
      prices: {
        Base: this.doCalculatePrice(offerDetails.stay.city, offerDetails.stay, 'Base'),
        CityView1: this.doCalculatePrice(offerDetails.stay.city, offerDetails.stay, 'CityView1'),
        CityView2: this.doCalculatePrice(offerDetails.stay.city, offerDetails.stay, 'CityView2'),
        CityView3: this.doCalculatePrice(offerDetails.stay.city, offerDetails.stay, 'CityView3')
      }
    };
  }

  async getAllStays (): Promise<(IStayShort & { reviewSummary: ReviewSummary })[]> {
    this.logger.debug('obtaining list of stays');

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

    const result = stayEntities.map(stay => { 
      return {
        ...MapStayShort(stay),
        reviewSummary: {
          numReviews: stay.reviews.length,
          score: stay.reviews.length > 0 ? stay.reviews.map(r => r.score).reduce((sum, v) => sum + v, 0) / stay.reviews.length : DefaultStayReviewScore,  
        }
      };
    });

    this.logger.debug('list of stays obtained', { count: result.length });
    return result;
  }

  async toggleFavourite (offerId: EntityId, userId: EntityId): Promise<boolean> {
    this.logger.verbose('toggling favourite offer', { id: offerId, userId });

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
      this.logger.debug('toggling existing favourite record', { id: offerId, userId, favouriteId: entity.id, isFavourite: result });
      await this.dbRepository.userStayOffer.update({
        where: {
          id: entity.id
        },
        data: {
          version: { increment: 1 },
          isFavourite: result
        }
      });
    } else {
      this.logger.debug('creating favourite record', { id: offerId, userId });
      result = true;
      await this.dbRepository.userStayOffer.create({
        data: {
          id: newUniqueId(),
          version: DbVersionInitial,
          isFavourite: result,
          userId,
          offerId
        }
      });
    }

    this.logger.verbose('favourite offer toggled', { id: offerId, userId, result });
    return result;
  }

  async searchOffers (filter: IStayOffersFilterParams, userId: EntityId | 'guest', sorting: ISorting<StayOffersSortFactor>, pagination: IPagination, narrowFilterParams: boolean, previewMode: PreviewMode, availableStays: (IStayShort & { reviewSummary: ReviewSummary })[] | undefined = undefined): Promise<ISearchStayOffersResult> {
    this.logger.verbose('search offers', { filter, userId, sorting, pagination, narrowFilterParams, previewMode, availableStays });

    try {
      const sortFactor = sorting.factor ?? DefaultStayOffersSorting;
      let variants = await this.generateStayOffersFull(filter, userId, sortFactor, availableStays);
      this.logger.debug('sorting stay offer variants', { userId, previewMode, availableStays });
      variants = orderBy(variants, ['sortFactor'], [sorting.direction]);
      let filterParams : ISearchStayOffersResultFilterParams | undefined;
      if (narrowFilterParams) {
        filterParams = this.computeStayOffersFilterParams(variants, userId);
      }
      variants = this.filterStayOffers(variants, filter, userId);
      const totalCount = variants.length;

      const take = pagination.skip >= variants.length ? 0 : (Math.min(variants.length - pagination.skip, pagination.take));
      const skip = pagination.skip;
      this.logger.debug('applying pagination to stay offers', { userId, skip, take, previewMode, availableStays });
      if (pagination.skip >= variants.length) {
        variants = [];
      } else {
        variants = variants.slice(skip, skip + take);
      }
      await this.offerMaterializer.ensureOffersMaterialized(variants, userId, previewMode);

      const result: ISearchStayOffersResult = {
        pagedItems: variants,
        paramsNarrowing: filterParams,
        totalCount
      };
      this.logger.verbose('search offers - completed', { filter, userId, previewMode, availableStays, count: variants.length });
      return result;
    } catch (err: any) {
      this.logger.warn('exception occured while searching offers', err, { filter, pagination, userId, previewMode, availableStays });
      throw err;
    }
  }

  async getUserFavouriteOffers (userId: EntityId): Promise<ISearchStayOffersResult<IStayOffer & { addDateUtc: Date; }>> {
    this.logger.verbose('get user favourite offers', userId);

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

    this.logger.verbose('get user favourite offers completed', { userId, count: result.totalCount });
    return result;
  }

  async getUserTickets(userId: EntityId): Promise<ISearchStayOffersResult<IStayOffer & { bookingId: EntityId, bookDateUtc: Date; }>> {
    this.logger.verbose('get user tickets', userId);

    const userOffers = await this.dbRepository.userStayOffer.findMany({
      where: {
        isDeleted: false,
        booking: {
          isDeleted: false
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

    this.logger.verbose('get user tickets completed', { userId, count: result.totalCount });
    return result;
  }

  async createOrUpdateReview (stayId: EntityId, textOrHtml: string, score: number, userId: EntityId): Promise<EntityId> {
    this.logger.verbose('create/update review', { stayId, textOrHtml, score, userId });

    if ((textOrHtml ?? '').length === 0) {
      this.logger.warn('create/update review - cannot create review with empty text', undefined, { stayId, textOrHtml, userId });
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
      this.logger.warn('create/update review - stay was not found', undefined, { stayId, textOrHtml, userId });
      throw new AppException(AppExceptionCodeEnum.OBJECT_NOT_FOUND, 'stay not found', 'error-stub');
    }

    let textOrHtmlSanitized: string;
    this.logger.debug('create/update review - sanitizing input', { stayId, userId });
    try {
      textOrHtmlSanitized = sanitize(textOrHtml);
    } catch (err: any) {
      this.logger.warn('create/update review - failed to sanitize input', err, { stayId, textOrHtml, userId });
      throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'text processing error', 'error-stub');
    }
    if (!textOrHtmlSanitized) {
      this.logger.warn('create/update review - resulted sanitize input empty', undefined, { stayId, textOrHtml, userId });
      throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'text processing error', 'error-stub');
    }
    if (textOrHtmlSanitized.replace(/\s/g, '').replace(/\c/g, '') !== textOrHtml.replace(/\s/g, '').replace(/\c/g, '')) {
      this.logger.warn('create/update review - sanitization detected potential issues', undefined, { stayId, userId, textOrHtml, sanitized: textOrHtmlSanitized });
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
              id: newUniqueId(),
              version: DbVersionInitial,
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
          id: newUniqueId(),
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
              id: newUniqueId(),
              version: DbVersionInitial,
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

    this.logger.verbose('create/update review', { stayId, score, userId, reviewId, op: resOp });
    return reviewId;
  }

  async deleteReview (stayId: EntityId, userId: EntityId): Promise<EntityId | undefined> {
    this.logger.verbose('delete review', { stayId, userId });

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
        this.logger.verbose('delete review - done', { stayId, userId, reviewId });
      } else {
        this.logger.warn('delete review - done, but seems like concurrent modification occured', undefined, { stayId, userId, reviewId });
      }
      return reviewId;
    } else {
      this.logger.debug('delete review - already deleted', { stayId, userId });
      return undefined;
    }
  }

  async getStayReviews (stayId: EntityId): Promise<EntityDataAttrsOnly<IStayReview>[]> {
    this.logger.verbose('get reviews', stayId);

    const reviewEntities = await this.dbRepository.hotelReview.findMany({
      where: {
        isDeleted: false,
        hotelId: stayId
      },
      include: StayReviewsQuery.include
    });

    const result: EntityDataAttrsOnly<IStayReview>[] = reviewEntities.map(MapStayReview);
    this.logger.verbose('get reviews - completed', { stayId, count: result.length });
    return result;
  }

  filterStayOffers (offers: OfferWithSortFactor<IStayOffer>[], filter: IStayOffersFilterParams, userId: EntityId | 'guest'): OfferWithSortFactor<IStayOffer>[] {
    this.logger.debug('filtering stay offer variants', { filter, userId, count: offers.length });

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
        const ratingMatches = ratingValues.some(r => Math.abs(r - Math.floor(offer.stay.reviewSummary!.score)) < 0.01);
        if (!ratingMatches) {
          return false;
        }
      }

      return true;
    };

    const result = offers.filter(isMatch);

    this.logger.debug('stay offers filtered', { userId, count: result.length });
    return result;
  }

  computeStayOffersFilterParams (offers: OfferWithSortFactor<IStayOffer>[], userId: EntityId | 'guest'): ISearchStayOffersResultFilterParams {
    this.logger.debug('computing stay offer filter params', { userId, count: offers.length });

    let result: ISearchStayOffersResultFilterParams = {};
    if (offers.length > 0) {
      result = {
        priceRange: {
          from: Math.min(...offers.map(o => o.totalPrice.toNumber())),
          to: Math.max(...offers.map(o => o.totalPrice.toNumber()))
        }
      };
    }

    this.logger.debug('stay offer filter params computed', { userId, count: offers.length, result });
    return result;
  }

  calculatePrice = (stay: EntityDataAttrsOnly<IStayShort>, serviceLevel: StayServiceLevel): Price => {
    return this.doCalculatePrice(stay.city, stay, serviceLevel);
  };

  doCalculatePrice (city: Pick<ICity, 'name'>, stay: Pick<IStayShort, 'name'>, serviceLevel: StayServiceLevel): Price {
    const hashString = (value: string) => murmurHash(Buffer.from(value).toString('base64'));

    let serviceLevelPrice = 150;
    switch (serviceLevel) {
      case 'CityView1':
        serviceLevelPrice += 50;
        break;
      case 'CityView2':
        serviceLevelPrice += 100;
        break;
      case 'CityView3':
        serviceLevelPrice += 150;
        break;
    }

    const cityAdjustment = (hashString(city.name.en) % 5) * 10;
    const stayAdjustment = (hashString(stay.name.en) % 5) * 10;

    return new Decimal(normalizePrice(cityAdjustment + stayAdjustment + serviceLevelPrice, 0));
  }

  calculateOfferPrice (offer: EntityDataAttrsOnly<IStayOffer>): Price {
    let result = this.doCalculatePrice(offer.stay.city, offer.stay, 'Base');
    result = result.times(offer.numRooms);
    return result;
  }

  getStayOfferSortFactorValue = (offer: EntityDataAttrsOnly<IStayOffer>, factor: StayOffersSortFactor): number => {
    switch (factor) {
      case 'price':
        return offer.totalPrice.toNumber();
      case 'rating':
        return offer.stay.reviewSummary!.score;
      case 'score':
        return offer.stay.reviewSummary!.numReviews + offer.stay.reviewSummary!.score * 8 + offer.totalPrice.toNumber() / 10;
      default:
        this.logger.warn('unexpected stay offer sort', undefined, factor);
        throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'unexpected sorting', 'error-stub');
    }
  };

  async generateStayOffersFull (filter: IStayOffersFilterParams, userId: EntityId | 'guest', sortFactor: StayOffersSortFactor, availableStays: (IStayShort & { reviewSummary: ReviewSummary })[] | undefined): Promise<OfferWithSortFactor<IStayOffer>[]> {
    this.logger.debug('generating full stay offer variants', userId);

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
    this.logger.debug('generating full stay offer variants', { userId, from: checkInDateVariants, to: checkOutDateVariants });

    let stayVariants = [] as (IStayShort & { reviewSummary: ReviewSummary })[];
    if (filter.citySlug) {
      stayVariants = (availableStays ?? (await this.getAllStays())).filter(x => x.city.slug === filter.citySlug!);
    }
    if (stayVariants.length === 0 && !filter.citySlug) {
      stayVariants = availableStays ?? (await this.getAllStays());
    }

    this.logger.debug('generating full stay offer variants', { userId, count: stayVariants.length });

    const numGuests = filter.numGuests ?? StaysMinGuestsCount;
    const numRooms = filter.numRooms ?? StaysMinRoomsCount;

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
            stay: {
              ...stay,
              reviewSummary: {
                numReviews: stay.reviewSummary.numReviews,
                score: stay.reviewSummary.score
              }
            },
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
              this.logger.warn('maximum number of stay offer items in memory buffer reached, stopping generation with current values', undefined, { filter, userId });
              break;
            }
          }
        }
      }
    }

    this.logger.debug('generating full stay offer variants', { userId, count: result.length });
    return result;
  }
}
