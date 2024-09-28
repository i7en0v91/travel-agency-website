import { newUniqueId, DbVersionInitial, type IStayOffer, type IAppLogger, type EntityId, type IFlight, type IFlightOffer, type EntityDataAttrsOnly, type PreviewMode } from '@golobe-demo/shared';
import { buildStayOfferUniqueDataKey, buildFlightUniqueDataKey, buildFlightOfferUniqueDataKey } from './../helpers/utils';
import flatten from 'lodash-es/flatten';
import type { PrismaClient } from '@prisma/client';
import { mapDate } from './../helpers/db';
import keys from 'lodash-es/keys';
import uniqBy from 'lodash-es/uniqBy';
import { type IFlightOfferMaterializer, type IStayOfferMaterializer } from './../common-services/offer-materializers';

declare type FlightOfferWithSortFactor = EntityDataAttrsOnly<IFlightOffer> & { primarySortFactor: number, secondarySortFactor: number };
declare type StayOfferWithSortFactor = EntityDataAttrsOnly<IStayOffer> & { sortFactor: number };

export class AcsysFlightOfferMaterializer implements IFlightOfferMaterializer {
  private readonly logger: IAppLogger;
  private readonly dbRepository: PrismaClient;
  private readonly prismaImplementation: IFlightOfferMaterializer;
  
  public static inject = ['flightOfferMaterializerPrisma', 'dbRepository', 'logger'] as const;
  constructor (prismaImplementation: IFlightOfferMaterializer, dbRepository: PrismaClient, logger: IAppLogger) {
    this.logger = logger;
    this.dbRepository = dbRepository;
    this.prismaImplementation = prismaImplementation;
  }

  async createFlightsAndFillIds (flights: EntityDataAttrsOnly<IFlight>[]): Promise<void> {
    this.logger.verbose(`(FlightsLogic-Acsys) AcsysFlightOfferMaterializer - creating memory flights and filling IDs, count=${flights.length}`);

    await this.dbRepository.$transaction(async () => {
      for (let i = 0; i < flights.length; i++) {
        const flight = flights[i];
        const dataHash = buildFlightUniqueDataKey(flight);

        const queryResult = await this.dbRepository.acsysDraftsFlight.create({
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

    this.logger.verbose(`(FlightsLogic-Acsys) AcsysFlightOfferMaterializer - creating memory flights and filling IDs - completed, count=${flights.length}`);
  }

  async ensureFlightsInDatabase (flights: EntityDataAttrsOnly<IFlight>[]): Promise<void> {
    this.logger.debug(`(FlightsLogic-Acsys) AcsysFlightOfferMaterializer - ensuring flights in DB, count=${flights.length}`);

    const memoryFlightsMap = new Map<string, EntityDataAttrsOnly<IFlight>>(
      flights.map(f => [buildFlightUniqueDataKey(f), f]));

    const dbFlights = (await this.dbRepository.acsysDraftsFlight.findMany({
      where: {
        isDeleted: false,
        dataHash: {
          in: keys(memoryFlightsMap)
        }
      },
      select: {
        id: true,
        airlineCompanyId: true,
        airplaneId: true,
        arrivalAirportId: true,
        departmentAirportId: true,
        arrivalUtcPosix: true,
        departmentUtcPosix: true,
        isDeleted: true,
        createdUtc: true,
        modifiedUtc: true,
        dataHash: true
      }
    }));

    const dbFlightsMap = new Map(dbFlights.map(o => [o.dataHash, o]));

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

    this.logger.debug(`(FlightsLogic-Acsys) AcsysFlightOfferMaterializer - ensuring offers in DB - completed, count=${flights.length}, num identified=${identifiedCount}`);
  }

  async createOffersAndFillIds (offers: FlightOfferWithSortFactor[], flightIdsMap: Map<string, EntityId>): Promise<void> {
    this.logger.verbose(`(FlightsLogic-Acsys) AcsysFlightOfferMaterializer - creating memory offers and filling IDs, count=${offers.length}`);
    if (offers.length === 0) {
      return;
    }

    this.logger.debug('(FlightsLogic-Acsys) AcsysFlightOfferMaterializer - running offer\'s create transaction');
    await this.dbRepository.$transaction(async () => {
      for (let i = 0; i < offers.length; i++) {
        const offer = offers[i];
        const dataHash = buildFlightOfferUniqueDataKey(offer);

        const queryResult = await this.dbRepository.acsysDraftsFlightOffer.create({
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

    this.logger.verbose(`(FlightsLogic-Acsys) AcsysFlightOfferMaterializer - creating memory offers and filling IDs - completed, count=${offers.length}`);
  }

  async ensureOffersMaterialized (offers: FlightOfferWithSortFactor[], userId: EntityId | 'guest', previewMode: PreviewMode): Promise<void> {
    this.logger.debug(`(FlightsLogic-Acsys) AcsysFlightOfferMaterializer - ensuring offers in DB, userId=${userId}, count=${offers.length}, previewMode=${previewMode}`);

    let identifiedCount = 0;
    if(previewMode) {
      this.logger.debug(`(FlightsLogic-Acsys) AcsysFlightOfferMaterializer - ensuring offers in DB, userId=${userId}, count=${offers.length}, previewMode=${previewMode}`);

      const memoryOffersMap = new Map<string, FlightOfferWithSortFactor>(
        offers.map(o => [buildFlightOfferUniqueDataKey(o), o]));
  
      this.logger.debug(`(FlightsLogic-Acsys) AcsysFlightOfferMaterializer - preparing offer's flight IDs, previewMode=${previewMode}`);
      const flightsDeduped = uniqBy(flatten(offers.map(o => [o.departFlight, o.arriveFlight])).filter(f => f).map((f) => { return { flight: f, dataHash: buildFlightUniqueDataKey(f!) }; }), f => f!.dataHash).map(f => f.flight!);
      await this.ensureFlightsInDatabase(flightsDeduped);
      const flightIdsMap = new Map<string, EntityId>(flightsDeduped.map(f => [buildFlightUniqueDataKey(f), f.id]));
  
      const dbOffers = (await this.dbRepository.acsysDraftsFlightOffer.findMany({
        where: {
          isDeleted: false,
          dataHash: {
            in: keys(memoryOffersMap)
          }
        },
        select: {
          id: true,
          isDeleted: true,
          modifiedUtc: true,
          createdUtc: true,
          departFlightId: true,
          returnFlightId: true,
          class: true,
          numPassengers: true,
          totalPrice: true,
          dataHash: true
        }
      }));
      dbOffers.push(...((await this.dbRepository.flightOffer.findMany({
        where: {
          isDeleted: false,
          dataHash: {
            in: keys(memoryOffersMap)
          }
        },
        select: {
          id: true,
          isDeleted: true,
          modifiedUtc: true,
          createdUtc: true,
          departFlightId: true,
          returnFlightId: true,
          class: true,
          numPassengers: true,
          totalPrice: true,
          dataHash: true
        }
      }))));
      const dbOffersMap = new Map(uniqBy(dbOffers, o => o.dataHash).map(o => [o.dataHash, o]));
  
      const offersToCreate = [] as FlightOfferWithSortFactor[];
      for (let i = 0; i < offers.length; i++) {
        const offer = offers[i];
        const dataKey = buildFlightOfferUniqueDataKey(offer);
        const matchedDbOffer = dbOffersMap.get(dataKey);
        if (matchedDbOffer) {
          offer.id = matchedDbOffer.id;
          identifiedCount++;
        } else {
          offersToCreate.push(offer);
        }
      }
  
      if (offersToCreate.length) {
        await this.createOffersAndFillIds(offersToCreate, flightIdsMap);
      }
    } else {
      await this.prismaImplementation.ensureOffersMaterialized(offers, userId, previewMode);
    }

    this.logger.debug(`(FlightsLogic-Acsys) AcsysFlightOfferMaterializer - ensuring offers in DB - completed, userId=${userId}, count=${offers.length}, previewMode=${previewMode}, num identified=${identifiedCount}`);
  }
};

export class AcsysStayOfferMaterializer implements IStayOfferMaterializer {

  private logger: IAppLogger;
  private dbRepository: PrismaClient;
  private prismaImplementation: IStayOfferMaterializer;
  
  public static inject = ['stayOfferMaterializerPrisma', 'dbRepository', 'logger'] as const;
  constructor (prismaImplementation: IStayOfferMaterializer, dbRepository: PrismaClient, logger: IAppLogger) {
    this.logger = logger;
    this.dbRepository = dbRepository;
    this.prismaImplementation = prismaImplementation;
  }

  async createOffersAndFillIds (offers: StayOfferWithSortFactor[]): Promise<void> {
    this.logger.verbose(`(StaysLogic-Acsys) AcsysStayOfferMaterializer creating memory offers and filling IDs, count=${offers.length}`);
    if (offers.length === 0) {
      return;
    }

    this.logger.debug('(StaysLogic-Acsys) AcsysStayOfferMaterializer running offer\'s create transaction');
    await this.dbRepository.$transaction(async () => {
      for (let i = 0; i < offers.length; i++) {
        const offer = offers[i];
        const dataHash = buildStayOfferUniqueDataKey(offer);

        const queryResult = await this.dbRepository.acsysDraftsStayOffer.create({
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

    this.logger.verbose(`(StaysLogic-Acsys) AcsysStayOfferMaterializer creating memory offers and filling IDs - completed, count=${offers.length}`);
  }

  async ensureOffersMaterialized(offers: StayOfferWithSortFactor[], userId: EntityId | 'guest', previewMode: PreviewMode): Promise<void> {
    this.logger.debug(`(StaysLogic-Acsys) AcsysStayOfferMaterializer ensuring offers in DB, userId=${userId}, count=${offers.length}, previewMode=${previewMode}`);

    let identifiedCount = 0;
    if(previewMode) {
      const memoryOffersMap = new Map<string, StayOfferWithSortFactor>(
        offers.map(o => [buildStayOfferUniqueDataKey(o), o]));
  
      const dbOffers = (await this.dbRepository.acsysDraftsStayOffer.findMany({
        where: {
          isDeleted: false,
          dataHash: {
            in: Array.from(memoryOffersMap.keys())
          }
        },
        select: {
          id: true,
          isDeleted: true,
          modifiedUtc: true,
          createdUtc: true,
          checkInPosix: true,
          checkOutPosix: true,
          hotelId: true,
          numGuests: true,
          numRooms: true,
          totalPrice: true,
          dataHash: true
        }
      }));
      dbOffers.push(...(await this.dbRepository.stayOffer.findMany({
        where: {
          isDeleted: false,
          dataHash: {
            in: Array.from(memoryOffersMap.keys())
          }
        },
        select: {
          id: true,
          isDeleted: true,
          modifiedUtc: true,
          createdUtc: true,
          checkInPosix: true,
          checkOutPosix: true,
          hotelId: true,
          numGuests: true,
          numRooms: true,
          totalPrice: true,
          dataHash: true
        }
      })));
      const dbOffersMap = new Map(uniqBy(dbOffers, o => o.dataHash).map(o => [o.dataHash, o]));
  
      const offersToCreate = [] as StayOfferWithSortFactor[];
      for (let i = 0; i < offers.length; i++) {
        const offer = offers[i];
        const dataKey = buildStayOfferUniqueDataKey(offer);
        const matchedDbOffer = dbOffersMap.get(dataKey);
        if (matchedDbOffer) {
          offer.id = matchedDbOffer.id;
          identifiedCount++;
        } else {
          offersToCreate.push(offer);
        }
      }
  
      if (offersToCreate.length) {
        await this.createOffersAndFillIds(offersToCreate);
      }
    } else {
      await this.prismaImplementation.ensureOffersMaterialized(offers, userId, previewMode);
    }

    this.logger.debug(`(StaysLogic-Acsys) AcsysStayOfferMaterializer ensuring offers in DB - completed, userId=${userId}, count=${offers.length}, num identified=${identifiedCount}`);
  }
}