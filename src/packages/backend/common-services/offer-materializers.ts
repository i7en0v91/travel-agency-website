import { type IStayOffer, type IAppLogger, type EntityId, type IFlight, type IFlightOffer, type EntityDataAttrsOnly, type PreviewMode, newUniqueId, DbVersionInitial } from '@golobe-demo/shared';
import { buildStayOfferUniqueDataKey, buildFlightUniqueDataKey, buildFlightOfferUniqueDataKey } from './../helpers/utils';
import flatten from 'lodash-es/flatten';
import { MapStayOffer, StayOfferInfoQuery, MapFlight, FlightInfoQuery, FlightOfferInfoQuery, MapFlightOffer } from './../services/queries';
import type { PrismaClient } from '@prisma/client';
import { mapDate } from './../helpers/db';
import uniqBy from 'lodash-es/uniqBy';

declare type FlightOfferWithSortFactor = EntityDataAttrsOnly<IFlightOffer> & { primarySortFactor: number, secondarySortFactor: number };
declare type StayOfferWithSortFactor = EntityDataAttrsOnly<IStayOffer> & { sortFactor: number };

/** 
 * Materializers ensure that in-memory generated offers receive IDs and are available in subsequent requests 
 * */

export interface IFlightOfferMaterializer {
  ensureOffersMaterialized (offers: FlightOfferWithSortFactor[], userId: EntityId | 'guest', previewMode: PreviewMode): Promise<void>;
}
export interface IStayOfferMaterializer {
  ensureOffersMaterialized (offers: StayOfferWithSortFactor[], userId: EntityId | 'guest', previewMode: PreviewMode): Promise<void>;
}

export class PrismaFlightOfferMaterializer implements IFlightOfferMaterializer {
  private logger: IAppLogger;
  private dbRepository: PrismaClient;
  
  public static inject = ['dbRepository', 'logger'] as const;
  constructor (dbRepository: PrismaClient, logger: IAppLogger) {
    this.logger = logger;
    this.dbRepository = dbRepository;
  }

  async createFlightsAndFillIds (flights: EntityDataAttrsOnly<IFlight>[]): Promise<void> {
    this.logger.verbose(`(FlightsLogic) PrismaFlightOfferMaterializer - creating memory flights and filling IDs, count=${flights.length}`);

    await this.dbRepository.$transaction(async () => {
      for (let i = 0; i < flights.length; i++) {
        const flight = flights[i];
        const dataHash = buildFlightUniqueDataKey(flight);

        const queryResult = await this.dbRepository.flight.create({
          data: {
            id: newUniqueId(),
            arrivalUtcPosix: mapDate(flight.arriveTimeUtc),
            departmentUtcPosix: mapDate(flight.departTimeUtc),
            version: DbVersionInitial,
            airlineCompanyId: flight.airlineCompany.id,
            airplaneId: flight.airplane.id,
            arrivalAirportId: flight.arriveAirport.id,
            departmentAirportId: flight.departAirport.id,
            dataHash
          },
          select: {
            id: true
          }
        });

        flight.id = queryResult.id;
      }
    });

    this.logger.verbose(`(FlightsLogic) PrismaFlightOfferMaterializer - creating memory flights and filling IDs - completed, count=${flights.length}`);
  }

  async ensureFlightsInDatabase (flights: EntityDataAttrsOnly<IFlight>[]): Promise<void> {
    this.logger.debug(`(FlightsLogic) PrismaFlightOfferMaterializer - ensuring flights in DB, count=${flights.length}`);

    const memoryFlightsMap = new Map<string, EntityDataAttrsOnly<IFlight>>(
      flights.map(f => [buildFlightUniqueDataKey(f), f]));

    const dbFlights = (await this.dbRepository.flight.findMany({
      where: {
        isDeleted: false,
        dataHash: {
          in: Array.from(memoryFlightsMap.keys())
        }
      },
      select: FlightInfoQuery.select
    })).map(MapFlight);

    const dbFlightsMap = new Map<string, IFlight>(dbFlights.map(o => [o.dataHash, o]));

    const flightsToCreate = [] as EntityDataAttrsOnly<IFlight>[];
    let identifiedCount = 0;
    for (let i = 0; i < flights.length; i++) {
      const flight = flights[i];
      const dataKey = buildFlightUniqueDataKey(flight);
      const matchedDbFlight = dbFlightsMap.get(dataKey);
      if (matchedDbFlight) {
        flight.id = matchedDbFlight.id;
        identifiedCount++;
      } else {
        flightsToCreate.push(flight);
      }
    }

    if (flightsToCreate.length) {
      await this.createFlightsAndFillIds(flightsToCreate);
    }

    this.logger.debug(`(FlightsLogic) PrismaFlightOfferMaterializer - ensuring offers in DB - completed, count=${flights.length}, num identified=${identifiedCount}`);
  }

  async createOffersAndFillIds (offers: FlightOfferWithSortFactor[], flightIdsMap: Map<string, EntityId>): Promise<void> {
    this.logger.verbose(`(FlightsLogic) PrismaFlightOfferMaterializer - creating memory offers and filling IDs, count=${offers.length}`);
    if (offers.length === 0) {
      return;
    }

    this.logger.debug('(FlightsLogic) PrismaFlightOfferMaterializer - running offer\'s create transaction');
    await this.dbRepository.$transaction(async () => {
      for (let i = 0; i < offers.length; i++) {
        const offer = offers[i];
        const dataHash = buildFlightOfferUniqueDataKey(offer);

        const queryResult = await this.dbRepository.flightOffer.create({
          data: {
            id: newUniqueId(),
            class: offer.class,
            numPassengers: offer.numPassengers,
            totalPrice: offer.totalPrice.toNumber(),
            departFlightId: flightIdsMap.get(buildFlightUniqueDataKey(offer.departFlight))!,
            version: DbVersionInitial,
            returnFlightId: offer.arriveFlight ? flightIdsMap.get(buildFlightUniqueDataKey(offer.arriveFlight!)) : undefined,
            dataHash
          },
          select: {
            id: true
          }
        });

        offer.id = queryResult.id;
      }
    });

    this.logger.verbose(`(FlightsLogic) PrismaFlightOfferMaterializer - creating memory offers and filling IDs - completed, count=${offers.length}`);
  }

  async ensureOffersMaterialized (offers: FlightOfferWithSortFactor[], userId: EntityId | 'guest'): Promise<void> {
    this.logger.debug(`(FlightsLogic) PrismaFlightOfferMaterializer - ensuring offers in DB, userId=${userId}, count=${offers.length}`);

    const memoryOffersMap = new Map<string, FlightOfferWithSortFactor>(
      offers.map(o => [buildFlightOfferUniqueDataKey(o), o]));

    this.logger.debug('(FlightsLogic) PrismaFlightOfferMaterializer - preparing offer\'s flight IDs');
    const flightsDeduped = uniqBy(flatten(offers.map(o => [o.departFlight, o.arriveFlight])).filter(f => f).map((f) => { return { flight: f, dataHash: buildFlightUniqueDataKey(f!) }; }), f => f!.dataHash).map(f => f.flight!);
    await this.ensureFlightsInDatabase(flightsDeduped);
    const flightIdsMap = new Map<string, EntityId>(flightsDeduped.map(f => [buildFlightUniqueDataKey(f), f.id]));

    const dbOffers = (await this.dbRepository.flightOffer.findMany({
      where: {
        isDeleted: false,
        dataHash: {
          in: Array.from(memoryOffersMap.keys())
        }
      },
      select: FlightOfferInfoQuery(userId).select
    })).map(MapFlightOffer);

    const dbOffersMap = new Map<string, IFlightOffer>(dbOffers.map(o => [o.dataHash, o]));

    const offersToCreate = [] as FlightOfferWithSortFactor[];
    let identifiedCount = 0;
    for (let i = 0; i < offers.length; i++) {
      const offer = offers[i];
      const dataKey = buildFlightOfferUniqueDataKey(offer);
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
      await this.createOffersAndFillIds(offersToCreate, flightIdsMap);
    }

    this.logger.debug(`(FlightsLogic) PrismaFlightOfferMaterializer - ensuring offers in DB - completed, userId=${userId}, count=${offers.length}, num identified=${identifiedCount}`);
  }
};


export class PrismaStayOfferMaterializer implements IStayOfferMaterializer {

  private logger: IAppLogger;
  private dbRepository: PrismaClient;
  
  public static inject = ['dbRepository', 'logger'] as const;
  constructor (dbRepository: PrismaClient, logger: IAppLogger) {
    this.logger = logger;
    this.dbRepository = dbRepository;
  }

  async createOffersAndFillIds (offers: StayOfferWithSortFactor[]): Promise<void> {
    this.logger.verbose(`(StaysLogic) PrismaStayOfferMaterializer creating memory offers and filling IDs, count=${offers.length}`);
    if (offers.length === 0) {
      return;
    }

    this.logger.debug('(StaysLogic) PrismaStayOfferMaterializer running offer\'s create transaction');
    await this.dbRepository.$transaction(async () => {
      for (let i = 0; i < offers.length; i++) {
        const offer = offers[i];
        const dataHash = buildStayOfferUniqueDataKey(offer);

        const queryResult = await this.dbRepository.stayOffer.create({
          data: {
            id: newUniqueId(),
            checkInPosix: mapDate(offer.checkIn),
            checkOutPosix: mapDate(offer.checkOut),
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

    this.logger.verbose(`(StaysLogic) PrismaStayOfferMaterializer creating memory offers and filling IDs - completed, count=${offers.length}`);
  }

  async ensureOffersMaterialized(offers: StayOfferWithSortFactor[], userId: EntityId | 'guest'): Promise<void> {
    this.logger.debug(`(StaysLogic) PrismaStayOfferMaterializer ensuring offers in DB, userId=${userId}, count=${offers.length}`);

    const memoryOffersMap = new Map<string, StayOfferWithSortFactor>(
      offers.map(o => [buildStayOfferUniqueDataKey(o), o]));

    const dbOffers = (await this.dbRepository.stayOffer.findMany({
      where: {
        isDeleted: false,
        dataHash: {
          in: Array.from(memoryOffersMap.keys())
        }
      },
      select: StayOfferInfoQuery(userId).select
    })).map(MapStayOffer);

    const dbOffersMap = new Map<string, IStayOffer>(dbOffers.map(o => [o.dataHash, o]));

    const offersToCreate = [] as StayOfferWithSortFactor[];
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

    this.logger.debug(`(StaysLogic) PrismaStayOfferMaterializer ensuring offers in DB - completed, userId=${userId}, count=${offers.length}, num identified=${identifiedCount}`);
  }  
}


