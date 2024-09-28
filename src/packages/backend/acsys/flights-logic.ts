import { type ISearchFlightOffersResult, type IFlightOffersFilterParams, AppException, AppExceptionCodeEnum, type IAppLogger, type FlightOffersSortFactor, type IPagination, type ISorting, type Price, type EntityId, type IFlightOffer } from '@golobe-demo/shared';
import { type IFlightsLogic } from './../types';
import type { PrismaClient } from '@prisma/client';
import type { AcsysDraftEntitiesResolver } from './acsys-draft-entities-resolver';
import Decimal from 'decimal.js';

export class FlightsLogic implements IFlightsLogic {
  private readonly logger: IAppLogger;
  private readonly prismaImplementation: IFlightsLogic;
  private readonly dbRepository: PrismaClient;
  private readonly acsysDraftsEntitiesResolver: AcsysDraftEntitiesResolver;

  public static inject = ['flightsLogicPrisma', 'acsysDraftsEntitiesResolver', 'dbRepository', 'logger'] as const;
  constructor (prismaImplementation: IFlightsLogic,  acsysDraftsEntitiesResolver: AcsysDraftEntitiesResolver, dbRepository: PrismaClient, logger: IAppLogger) {
    this.logger = logger;
    this.prismaImplementation = prismaImplementation;
    this.dbRepository = dbRepository;
    this.acsysDraftsEntitiesResolver = acsysDraftsEntitiesResolver;
  }

  async deleteFlightOffer(id: EntityId): Promise<void> {
    this.logger.debug(`(FlightsLogic-Acsys) deleting flight offer: id=${id}`);

    // skip booking & user offers deletion - those tables are empty in preview mode
    const deleted = (await this.dbRepository.acsysDraftsFlightOffer.updateMany({
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
      this.logger.debug(`(FlightsLogic-Acsys) no flight offers have been deleted in drafts table, proceeding to the main table: id=${id}`);
      await this.prismaImplementation.deleteFlightOffer(id);
    }

    this.logger.debug(`(FlightsLogic-Acsys) flight offer deleted: id=${id}`);
  };

  async deleteFlight(id: EntityId): Promise<void> {
    this.logger.debug(`(FlightsLogic-Acsys) deleting flight: id=${id}`);
    
    const deleted = (await this.dbRepository.acsysDraftsFlight.updateMany({
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
      this.logger.debug(`(FlightsLogic-Acsys) no flights have been deleted in drafts table, proceeding to the main table: id=${id}`);
      await this.prismaImplementation.deleteFlight(id);
    }

    this.logger.debug(`(FlightsLogic-Acsys) flight deleted: id=${id}`);
  };

  async getFlightOffer (id: EntityId, userId: EntityId | 'guest', previewMode: boolean = false): Promise<IFlightOffer> {
    this.logger.debug(`(FlightsLogic-Acsys) get flight offer, id=${id}, userId=${userId}, previewMode=${previewMode}`);

    let result: IFlightOffer;
    if(previewMode) {
      const resolveResult = await this.acsysDraftsEntitiesResolver.resolveFlightOffers({ idsFilter:  [ id ] });
      if(resolveResult.notFoundIds?.length) {
        this.logger.warn(`(FlightsLogic-Acsys) flight offer not found, id=${id}`);
        throw new AppException(AppExceptionCodeEnum.OBJECT_NOT_FOUND, 'flight offer not found', 'error-stub');
      }
      result = Array.from(resolveResult.items.values())[0];
    } else {
      result = await this.prismaImplementation.getFlightOffer(id, userId, previewMode);
    }

    this.logger.debug(`(FlightsLogic-Acsys) get flight offer - found, id=${id}, userId=${userId}, previewMode=${previewMode}, modifiedUtc=${result.modifiedUtc}, price=${result.totalPrice}`);
    return result;
  }

  async toggleFavourite (offerId: EntityId, userId: EntityId): Promise<boolean> {
    this.logger.debug(`(FlightsLogic-Acsys) toggling favourite offer, id=${offerId}, userId=${userId}`);
    const result = await this.prismaImplementation.toggleFavourite(offerId, userId);
    this.logger.debug(`(FlightsLogic-Acsys) favourite offer toggled, id=${offerId}, userId=${userId}, result=${result}`);
    return result;
  }

  async getFlightPromoPrice (cityId: EntityId, previewMode: boolean = false): Promise<Price> {
    this.logger.debug(`(FlightsLogic-Acsys) get promo price, cityId=${cityId}, previewMode=${previewMode}`);

    let result: Price;
    if(previewMode) {
      result = new Decimal(700);
    } else {
      result = await this.prismaImplementation.getFlightPromoPrice(cityId, previewMode);
    }
    
    this.logger.debug(`(FlightsLogic-Acsys) get promo price completed, cityId=${cityId}, previewMode=${previewMode}, result=${result.toString()}`);
    return result;
  }

  async searchOffers (filter: IFlightOffersFilterParams, userId: EntityId | 'guest', primarySorting: ISorting<FlightOffersSortFactor>, secondarySorting: ISorting<FlightOffersSortFactor>, pagination: IPagination, narrowFilterParams: boolean, topOffersStats: boolean, previewMode: boolean = false): Promise<ISearchFlightOffersResult> {
    this.logger.debug(`(FlightsLogic-Acsys) search offers, filter=${JSON.stringify(filter)}, userId=${userId}, primarySorting=${JSON.stringify(primarySorting)}, secondarySorting=${JSON.stringify(secondarySorting)}, pagination=${JSON.stringify(pagination)}, narrowFilterParams=${narrowFilterParams}, topOffersStats=${topOffersStats}, previewMode=${previewMode}`);
    // preview mode is supported by passing it as an argument to search method below
    const result = await this.prismaImplementation.searchOffers(filter, userId, primarySorting, secondarySorting, pagination, narrowFilterParams, topOffersStats, previewMode);
    this.logger.debug(`(FlightsLogic-Acsys) search offers - completed, filter=${JSON.stringify(filter)}, userId=${userId}, count=${result.pagedItems.length}, previewMode=${previewMode}`);
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
