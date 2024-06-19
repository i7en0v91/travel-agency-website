import { type IAppLogger, type IStayOfferDetails, type IStayReview, type StayServiceLevel, type ISearchStayOffersResult, type StayOffersSortFactor, type IStayOffersFilterParams, type IStaysLogic, type IPagination, type ISorting, type EntityId, type IStayShort, type EntityDataAttrsOnly, type IStayOffer, type IStay, type IStayData } from './../../backend/app-facade/interfaces';
import type { StaysLogic as StaysLogicPrisma } from '../services/stays-logic';
import type Decimal from 'decimal.js';

export class StaysLogic implements IStaysLogic {
  private readonly logger: IAppLogger;
  private readonly prismaImplementation: StaysLogicPrisma;

  public static inject = ['staysLogicPrisma', 'logger'] as const;
  constructor (prismaImplementation: StaysLogicPrisma, logger: IAppLogger) {
    this.logger = logger;
    this.prismaImplementation = prismaImplementation;
  }

  deleteStayOffer =  async (id: EntityId): Promise<void> => {
    this.logger.debug(`(StaysLogic-Acsys) deleting stay offer: id=${id}`);
    await this.prismaImplementation.deleteStayOffer(id);
    this.logger.debug(`(StaysLogic-Acsys) stay offer deleted: id=${id}`);
  };

  deleteStay =  async (id: EntityId): Promise<void> => {
    this.logger.debug(`(StaysLogic-Acsys) deleting stay: id=${id}`);
    await this.prismaImplementation.deleteStay(id);
    this.logger.debug(`(StaysLogic-Acsys) stay deleted: id=${id}`);
  };
  
  calculatePrice(stay: EntityDataAttrsOnly<IStayShort>, serviceLevel: StayServiceLevel): Decimal {
    return this.prismaImplementation.calculatePrice(stay, serviceLevel);
  }

  async createStay (data: IStayData): Promise<EntityId> {
    this.logger.debug(`(StaysLogic-Acsys) creating stay, slug=${data.slug}`);
    const stayId = await this.prismaImplementation.createStay(data);
    this.logger.debug(`(StaysLogic-Acsys) stay created, slug=${data.slug}, id=${stayId}`);
    return stayId;
  }

  async findStay (idOrSlug: EntityId | string): Promise<IStay | undefined> {
    this.logger.debug(`(StaysLogic-Acsys) loading stay, id=${idOrSlug}`);
    const result = await this.prismaImplementation.findStay(idOrSlug);
    this.logger.debug(`(StaysLogic-Acsys) stay found, id=${idOrSlug}, slug=${result?.slug}, numDescriptions=${result?.description.length}, numReviews=${result?.reviews.length}, numImages=${result?.images.length}`);
    return result;
  }

  async getStayOffer (id: EntityId, userId: EntityId | 'guest'): Promise<IStayOfferDetails> {
    this.logger.debug(`(StaysLogic-Acsys) get stay offer, id=${id}, userId=${userId}`);
    const result = await this.prismaImplementation.getStayOffer(id, userId);
    this.logger.debug(`(StaysLogic-Acsys) get stay offer - found, id=${id}, userId=${userId}, modifiedUtc=${result.modifiedUtc}, price=${result.totalPrice}`);
    return result;
  }

  async getAllStays (): Promise<IStayShort[]> {
    this.logger.debug('(StaysLogic-Acsys) obtaining list of stays');
    const result = await this.prismaImplementation.getAllStays();
    this.logger.debug(`(StaysLogic-Acsys) list of stays obtained, count=${result.length}`);
    return result;
  }

  async toggleFavourite (offerId: EntityId, userId: EntityId): Promise<boolean> {
    this.logger.debug(`(StaysLogic-Acsys) toggling favourite offer, id=${offerId}, userId=${userId}`);
    const result = await this.prismaImplementation.toggleFavourite(offerId, userId);
    this.logger.debug(`(StaysLogic-Acsys) favourite offer toggled, id=${offerId}, userId=${userId}, result=${result}`);
    return result;
  }

  async searchOffers (filter: IStayOffersFilterParams, userId: EntityId | 'guest', sorting: ISorting<StayOffersSortFactor>, pagination: IPagination, narrowFilterParams: boolean): Promise<ISearchStayOffersResult> {
    this.logger.debug(`(StaysLogic-Acsys) search offers, filter=${JSON.stringify(filter)}, userId=${userId}, sorting=${JSON.stringify(sorting)}, pagination=${JSON.stringify(pagination)}, narrowFilterParams=${narrowFilterParams}`);
    const result = await this.prismaImplementation.searchOffers(filter, userId, sorting, pagination, narrowFilterParams);
    this.logger.debug(`(StaysLogic-Acsys) search offers - completed, filter=${JSON.stringify(filter)}, userId=${userId}, count=${result.pagedItems.length}`);
    return result;
  }

  async getUserFavouriteOffers (userId: EntityId): Promise<ISearchStayOffersResult<IStayOffer & { addDateUtc: Date; }>> {
    this.logger.debug(`(StaysLogic-Acsys) get user favourite offers, userId=${userId}`);
    const result = await this.prismaImplementation.getUserFavouriteOffers(userId);
    this.logger.debug(`(StaysLogic-Acsys) get user favourite offers completed, userId=${userId}, count=${result.totalCount}`);
    return result;
  }

  async getUserTickets(userId: EntityId): Promise<ISearchStayOffersResult<IStayOffer & { bookingId: EntityId, bookDateUtc: Date; }>> {
    this.logger.debug(`(StaysLogic-Acsys) get user tickets, userId=${userId}`);
    const result = await this.prismaImplementation.getUserTickets(userId);
    this.logger.debug(`(StaysLogic-Acsys) get user tickets completed, userId=${userId}, count=${result.totalCount}`);
    return result;
  }

  async createOrUpdateReview (stayId: EntityId, textOrHtml: string, score: number, userId: EntityId): Promise<EntityId> {
    this.logger.debug(`(StaysLogic-Acsys) create/update review, stayId=${stayId}, textOrHtml=${textOrHtml}, score=${score}, userId=${userId}`);
    const reviewId = await this.prismaImplementation.createOrUpdateReview(stayId, textOrHtml, score, userId);
    this.logger.debug(`(StaysLogic-Acsys) create/update review, stayId=${stayId}, score=${score}, userId=${userId}, reviewId=${reviewId}`);
    return reviewId;
  }

  async deleteReview (stayId: EntityId, userId: EntityId): Promise<EntityId | undefined> {
    this.logger.debug(`(StaysLogic-Acsys) delete review, stayId=${stayId}, userId=${userId}`);
    const reviewId = await this.prismaImplementation.deleteReview(stayId, userId);
    this.logger.debug(`(StaysLogic-Acsys) delete review - done, stayId=${stayId}, userId=${userId}, reviewId=${reviewId}`);
    return reviewId;
  }

  async getStayReviews (stayId: EntityId): Promise<EntityDataAttrsOnly<IStayReview>[]> {
    this.logger.debug(`(StaysLogic-Acsys) get reviews, stayId=${stayId}`);
    const result = await this.prismaImplementation.getStayReviews(stayId);
    this.logger.debug(`(StaysLogic-Acsys) get reviews - completed, stayId=${stayId}, count=${result.length}`);
    return result;
  }

}
