import { type IAppLogger, type FlightOffersSortFactor, type IFlightOffersFilterParams, type IFlightsLogic, type IPagination, type ISearchFlightOffersResult, type ISorting, type Price, type EntityId, type IFlightOffer } from './../../backend/app-facade/interfaces';
import type { FlightsLogic as FlightsLogicPrisma } from '../services/flights-logic';

export class FlightsLogic implements IFlightsLogic {
  private readonly logger: IAppLogger;
  private readonly prismaImplementation: FlightsLogicPrisma;

  public static inject = ['flightsLogicPrisma', 'logger'] as const;
  constructor (prismaImplementation: FlightsLogicPrisma, logger: IAppLogger) {
    this.logger = logger;
    this.prismaImplementation = prismaImplementation;
  }

  async deleteFlightOffer(id: EntityId): Promise<void> {
    this.logger.debug(`(FlightsLogic-Acsys) deleting flight offer: id=${id}`);
    await this.prismaImplementation.deleteFlightOffer(id);
    this.logger.debug(`(FlightsLogic-Acsys) flight offer deleted: id=${id}`);
  };

  async deleteFlight(id: EntityId): Promise<void> {
    this.logger.debug(`(FlightsLogic-Acsys) deleting flight: id=${id}`);
    await this.prismaImplementation.deleteFlight(id);
    this.logger.debug(`(FlightsLogic-Acsys) flight deleted: id=${id}`);
  };

  async getFlightOffer (id: EntityId, userId: EntityId | 'guest'): Promise<IFlightOffer> {
    this.logger.debug(`(FlightsLogic-Acsys) get flight offer, id=${id}, userId=${userId}`);
    const entity = await this.prismaImplementation.getFlightOffer(id, userId);
    this.logger.debug(`(FlightsLogic-Acsys) get flight offer - found, id=${id}, userId=${userId}, modifiedUtc=${entity.modifiedUtc}, price=${entity.totalPrice}`);
    return entity;
  }

  async toggleFavourite (offerId: EntityId, userId: EntityId): Promise<boolean> {
    this.logger.debug(`(FlightsLogic-Acsys) toggling favourite offer, id=${offerId}, userId=${userId}`);
    const result = await this.prismaImplementation.toggleFavourite(offerId, userId);
    this.logger.debug(`(FlightsLogic-Acsys) favourite offer toggled, id=${offerId}, userId=${userId}, result=${result}`);
    return result;
  }

  async getFlightPromoPrice (cityId: EntityId): Promise<Price> {
    this.logger.debug(`(FlightsLogic-Acsys) get promo price, cityId=${cityId}`);
    const result = await this.prismaImplementation.getFlightPromoPrice(cityId);
    this.logger.debug(`(FlightsLogic-Acsys) get promo price completed, cityId=${cityId}, result=${result.toString()}`);
    return result;
  }

  async searchOffers (filter: IFlightOffersFilterParams, userId: EntityId | 'guest', primarySorting: ISorting<FlightOffersSortFactor>, secondarySorting: ISorting<FlightOffersSortFactor>, pagination: IPagination, narrowFilterParams: boolean, topOffersStats: boolean): Promise<ISearchFlightOffersResult> {
    this.logger.debug(`(FlightsLogic-Acsys) search offers, filter=${JSON.stringify(filter)}, userId=${userId}, primarySorting=${JSON.stringify(primarySorting)}, secondarySorting=${JSON.stringify(secondarySorting)}, pagination=${JSON.stringify(pagination)}, narrowFilterParams=${narrowFilterParams}, topOffersStats=${topOffersStats}`);
    const result = await this.prismaImplementation.searchOffers(filter, userId, primarySorting, secondarySorting, pagination, narrowFilterParams, topOffersStats);
    this.logger.debug(`(FlightsLogic-Acsys) search offers - completed, filter=${JSON.stringify(filter)}, userId=${userId}, count=${result.pagedItems.length}`);
    return result;
  }

  async getUserFavouriteOffers (userId: EntityId): Promise<ISearchFlightOffersResult<IFlightOffer & { addDateUtc: Date }>> {
    this.logger.debug(`(FlightsLogic-Acsys) get user favourite offers, userId=${userId}`);
    const result = await this.prismaImplementation.getUserFavouriteOffers(userId);
    this.logger.debug(`(FlightsLogic-Acsys) get user favourite offers completed, userId=${userId}, count=${result.totalCount}`);
    return result;
  }

  async getUserTickets(userId: EntityId): Promise<ISearchFlightOffersResult<IFlightOffer & { bookingId: EntityId, bookDateUtc: Date; }>> {
    this.logger.debug(`(FlightsLogic-Acsys) get user tickets, userId=${userId}`);
    const result = await this.prismaImplementation.getUserTickets(userId);
    this.logger.debug(`(FlightsLogic-Acsys) get user tickets completed, userId=${userId}, count=${result.totalCount}`);
    return result;
  }
}
