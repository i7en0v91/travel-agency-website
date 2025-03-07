import { type ISearchStayOffersResult, type IStayData, type IStayOffersFilterParams, DbVersionInitial, newUniqueId, type ReviewSummary, type PreviewMode, type IAppLogger, type IStayOfferDetails, type IStayReview, type StayServiceLevel, type StayOffersSortFactor, type IPagination, type ISorting, type EntityId, type IStayShort, type EntityDataAttrsOnly, type IStayOffer, type IStay, DefaultStayReviewScore } from '@golobe-demo/shared';
import type { IStaysLogic } from './../types';
import { mapGeoCoord, executeInTransaction } from './../helpers/db';
import type Decimal from 'decimal.js';
import type { PrismaClient } from '@prisma/client';
import { type AcsysDraftEntitiesResolver, UnresolvedEntityThrowingCondition } from './acsys-draft-entities-resolver';

export class StaysLogic implements IStaysLogic {
  private readonly logger: IAppLogger;
  private readonly prismaImplementation: IStaysLogic;
  private readonly dbRepository: PrismaClient;
  private readonly acsysDraftsEntitiesResolver: AcsysDraftEntitiesResolver;

  public static inject = ['staysLogicPrisma', 'acsysDraftsEntitiesResolver', 'dbRepository', 'logger'] as const;
  constructor (prismaImplementation: IStaysLogic, acsysDraftsEntitiesResolver: AcsysDraftEntitiesResolver, dbRepository: PrismaClient, logger: IAppLogger) {
    this.logger = logger.addContextProps({ component: 'StaysLogic-Acsys' });
    this.prismaImplementation = prismaImplementation;
    this.dbRepository = dbRepository;
    this.acsysDraftsEntitiesResolver = acsysDraftsEntitiesResolver;
  }

  deleteStayOffer =  async (id: EntityId): Promise<void> => {
    this.logger.debug('deleting stay offer', id);

    const deleted = (await this.dbRepository.acsysDraftsStayOffer.updateMany({
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
      this.logger.debug('no stay offers have been deleted in drafts table, proceeding to the main table', id);
      await this.prismaImplementation.deleteStayOffer(id);
    }

    this.logger.debug('stay offer deleted', id);
  };

  deleteStay =  async (id: EntityId): Promise<void> => {
    this.logger.debug('deleting stay', id);

    const deleted = (await this.dbRepository.acsysDraftsHotel.updateMany({
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
      this.logger.debug('no stays have been deleted in drafts table, proceeding to the main table', id);
      await this.prismaImplementation.deleteStay(id);
    }

    this.logger.debug('stay deleted', id);
  };
  
  calculatePrice(stay: EntityDataAttrsOnly<IStayShort>, serviceLevel: StayServiceLevel): Decimal {
    return this.prismaImplementation.calculatePrice(stay, serviceLevel);
  }

  async createStay (data: IStayData, previewMode: PreviewMode): Promise<EntityId> {
    this.logger.debug('creating stay', { slug: data.slug, previewMode });

    let stayId: EntityId;
    if(previewMode) {
      stayId = await executeInTransaction(async () => {
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

        const entityId = (await this.dbRepository.acsysDraftsHotel.create({
          data: {
            id: newUniqueId(),
            nameStrId,
            cityId: data.cityId,
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

          const textStrId = (await this.dbRepository.acsysDraftsLocalizeableValue.create({
            data: {
              id: newUniqueId(),
              version: DbVersionInitial,
              ...descriptionData.textStr
            },
            select: {
              id: true
            }
          })).id;

          await this.dbRepository.acsysDraftsHotelDescription.create({
            data: {
              id: newUniqueId(),
              textStrId,
              hotelId: entityId,
              paragraphKind: descriptionData.paragraphKind,
              orderNum: descriptionData.order,
              version: DbVersionInitial
            }
          });
        }
  
        for (let i = 0; i < data.imagesData.length; i++) {
          const imageData = data.imagesData[i];
          await this.dbRepository.acsysDraftsHotelImage.create({
            data: {
              id: newUniqueId(),
              imageId: imageData.imageId,
              hotelId: entityId,
              orderNum: imageData.order,
              serviceLevel: imageData.serviceLevel,
              version: DbVersionInitial
            }
          });
        }

        return entityId;
      }, this.dbRepository);
    } else {
      stayId = await this.prismaImplementation.createStay(data, previewMode);
    }
    
    this.logger.debug('stay created', { slug: data.slug, id: stayId, previewMode });
    return stayId;
  }

  async findStay (idOrSlug: EntityId | string, previewMode: PreviewMode): Promise<IStay | undefined> {
    this.logger.debug('loading stay', { idOrSlug, previewMode });

    let result: IStay | undefined;
    if(previewMode) {
      const id = (await this.dbRepository.acsysDraftsHotel.findFirst({
        where: {
          OR: [
            { id: idOrSlug }, { slug: idOrSlug }
          ],
          isDeleted: false
        },
        select: {
          id: true
        }
      }))?.id;
      if(id) {
        this.logger.debug('loading stay by', { id, previewMode });
        const resolveResult = await this.acsysDraftsEntitiesResolver.resolveStays({ idsFilter:  [ id ], unresolvedEntityPolicy: UnresolvedEntityThrowingCondition.ExcludeFromResult });
        if(!resolveResult.notFoundIds?.length) {
          result = Array.from(resolveResult.items.values())[0];  
        }
      }
      if(!result) {
        this.logger.debug('no stays have been found in drafts table, proceeding to the main table', idOrSlug);
        result = await this.prismaImplementation.findStay(idOrSlug, previewMode);
      }
    } else {
      result = await this.prismaImplementation.findStay(idOrSlug, previewMode);
    }

    this.logger.debug('stay found', { idOrSlug, slug: result?.slug, previewMode, numDescriptions: result?.description.length, numReviews: result?.reviews.length, numImages: result?.images.length });
    return result;
  }

  async getStayOffer (id: EntityId, userId: EntityId | 'guest', previewMode: PreviewMode): Promise<IStayOfferDetails> {
    this.logger.debug('get stay offer', { id, userId, previewMode });

    let result: IStayOfferDetails;
    if(previewMode) {
      const resolveResult = await this.acsysDraftsEntitiesResolver.resolveStayOffers({ idsFilter:  [ id ] });
      result = Array.from(resolveResult.items.values())[0];
    } else {
      result = await this.prismaImplementation.getStayOffer(id, userId, previewMode);
    }
    
    this.logger.debug('get stay offer - found', { id, userId, previewMode, modifiedUtc: result.modifiedUtc, price: result.totalPrice });
    return result;
  }

  async getAllStays (previewMode: PreviewMode): Promise<IStayShort[]> {
    this.logger.debug('obtaining list of stays', previewMode);

    let result: IStayShort[];
    if(previewMode) {
      const stayResolveResult = Array.from((await this.acsysDraftsEntitiesResolver.resolveStays({})).items.values());
      result = stayResolveResult.map(stay => {
        const photo = stay.images.find(img => img.order === 0);
        if(!photo) {
          this.logger.warn('failed to obtain list of stay - hotel does not contain main photo', undefined, { hotelId: stay.id, previewMode });
          return undefined;
        }
        
        return <IStayShort>{
          city: stay.city,
          createdUtc: stay.createdUtc,
          geo: stay.geo,
          photo,
          id: stay.id,
          isDeleted: stay.isDeleted,
          modifiedUtc: stay.modifiedUtc,
          name: stay.name,
          slug: stay.slug,
          previewMode: stay.previewMode
        };
      }).filter(x => !!x);
    } else {
      result = await this.prismaImplementation.getAllStays(previewMode);
    }

    this.logger.debug('list of stays obtained', { previewMode, count: result.length });
    return result;
  }

  async toggleFavourite (offerId: EntityId, userId: EntityId): Promise<boolean> {
    this.logger.debug('toggling favourite offer', { id: offerId, userId });
    const result = await this.prismaImplementation.toggleFavourite(offerId, userId);
    this.logger.debug('favourite offer toggled', { id: offerId, userId, result });
    return result;
  }

  async searchOffers (filter: IStayOffersFilterParams, userId: EntityId | 'guest', sorting: ISorting<StayOffersSortFactor>, pagination: IPagination, narrowFilterParams: boolean, previewMode: PreviewMode, availableStays: (IStayShort & { reviewSummary: ReviewSummary })[] | undefined = undefined): Promise<ISearchStayOffersResult> {
    this.logger.debug('search offers', { filter, userId, sorting, pagination, narrowFilterParams, previewMode, availableStays });
    let result: ISearchStayOffersResult;
    if(previewMode) {
      const allStays = (await this.getAllStays(true)).map(s => { 
        return <IStayShort & { reviewSummary: ReviewSummary }>{
          ...s,
          reviewSummary: { // ignore stay reviews in preview mode
            numReviews: 0,
            score: DefaultStayReviewScore
          }
        };
      });
      result = await this.prismaImplementation.searchOffers(filter, userId, sorting, pagination, narrowFilterParams, true, allStays);
    } else {
      result = await this.prismaImplementation.searchOffers(filter, userId, sorting, pagination, narrowFilterParams, previewMode);
    }
    this.logger.debug('search offers - completed', { filter, userId, previewMode, availableStays, count: result.pagedItems.length });
    return result;
  }

  async getUserFavouriteOffers (userId: EntityId): Promise<ISearchStayOffersResult<IStayOffer & { addDateUtc: Date; }>> {
    this.logger.debug('get user favourite offers', userId);
    const result = await this.prismaImplementation.getUserFavouriteOffers(userId);
    this.logger.debug('get user favourite offers completed', { userId, count: result.totalCount });
    return result;
  }

  async getUserTickets(userId: EntityId): Promise<ISearchStayOffersResult<IStayOffer & { bookingId: EntityId, bookDateUtc: Date; }>> {
    this.logger.debug('get user tickets', userId);
    const result = await this.prismaImplementation.getUserTickets(userId);
    this.logger.debug('get user tickets completed', { userId, count: result.totalCount });
    return result;
  }

  async createOrUpdateReview (stayId: EntityId, textOrHtml: string, score: number, userId: EntityId): Promise<EntityId> {
    this.logger.debug('create/update review', { stayId, textOrHtml, score, userId });
    const reviewId = await this.prismaImplementation.createOrUpdateReview(stayId, textOrHtml, score, userId);
    this.logger.debug('create/update review', { stayId, score, userId, reviewId });
    return reviewId;
  }

  async deleteReview (stayId: EntityId, userId: EntityId): Promise<EntityId | undefined> {
    this.logger.debug('delete review', { stayId, userId });
    const reviewId = await this.prismaImplementation.deleteReview(stayId, userId);
    this.logger.debug('delete review - done', { stayId, userId, reviewId });
    return reviewId;
  }

  async getStayReviews (stayId: EntityId): Promise<EntityDataAttrsOnly<IStayReview>[]> {
    this.logger.debug('get reviews', stayId);
    const result = await this.prismaImplementation.getStayReviews(stayId);
    this.logger.debug('get reviews - completed', { stayId, count: result.length });
    return result;
  }

}
