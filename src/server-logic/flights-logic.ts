import { PrismaClient } from '@prisma/client';
import { Decimal } from 'decimal.js';
import dayjs from 'dayjs';
import orderBy from 'lodash-es/orderBy';
import uniqBy from 'lodash-es/uniqBy';
import { murmurHash } from 'ohash';
import flatten from 'lodash-es/flatten';
import { type ICity, type IAirplaneLogic, type IAirportLogic, type FlightOffersSortFactor, type ISearchFlightOffersResultFilterParams, type IFlightOffersFilterParams, type IFlightsLogic, type IGeoLogic, type IPagination, type ISearchFlightOffersResult, type ISorting, type Price, type EntityId, type IFlight, type IAirlineCompany, type IAirplane, type IAirlineCompanyLogic, type DistanceUnitKm, type IFlightOffer, type FlightClass, type MakeSearchResultEntity, type TripType, type IAirport, type ITopFlightOfferInfo } from '../shared/interfaces';
import { type IAppLogger } from '../shared/applogger';
import { calculateDistanceKm, getTimeOfDay } from '../shared/common';
import { DbConcurrencyVersions, SearchOffersListConstants, TemporaryEntityId } from '../shared/constants';
import { normalizePrice, buildFlightUniqueDataKey, buildFlightOfferUniqueDataKey } from './helpers/utils';
import { Queries, Mappers } from './queries';
import AppConfig from './../appconfig';
import { AppException, AppExceptionCodeEnum } from './../shared/exceptions';

declare type OfferWithSortFactors<TOffer extends IFlightOffer> = MakeSearchResultEntity<TOffer> & { primarySortFactor: number, secondarySortFactor: number };

export class FlightsLogic implements IFlightsLogic {
  private logger: IAppLogger;
  private dbRepository: PrismaClient;
  private geoLogic: IGeoLogic;
  private airportLogic: IAirportLogic;
  private airlineCompanyLogic: IAirlineCompanyLogic;
  private airplaneLogic: IAirplaneLogic;

  public static inject = ['dbRepository', 'geoLogic', 'airportLogic', 'airplaneLogic', 'airlineCompanyLogic', 'logger'] as const;
  constructor (dbRepository: PrismaClient, geoLogic: IGeoLogic, airportLogic: IAirportLogic, airplaneLogic: IAirplaneLogic, airlineCompanyLogic: IAirlineCompanyLogic, logger: IAppLogger) {
    this.logger = logger;
    this.geoLogic = geoLogic;
    this.airlineCompanyLogic = airlineCompanyLogic;
    this.airportLogic = airportLogic;
    this.dbRepository = dbRepository;
    this.airplaneLogic = airplaneLogic;
  }

  async getFlightOffer (id: EntityId, userId: EntityId | 'guest'): Promise<IFlightOffer> {
    this.logger.verbose(`(FlightsLogic) get flight offer, id=${id}, userId=${userId}`);
    const entity = await this.dbRepository.flightOffer.findFirst({
      where: {
        isDeleted: false,
        id
      },
      select: Queries.FlightOfferInfoQuery(userId).select
    });
    if (!entity) {
      this.logger.warn(`(FlightsLogic) flight offer was not found, id=${id}, userId=${userId}`);
      throw new AppException(AppExceptionCodeEnum.OBJECT_NOT_FOUND, 'flight offer not found', 'error-page');
    }

    this.logger.verbose(`(FlightsLogic) get flight offer - found, id=${id}, userId=${userId}, modifiedUtc=${entity.modifiedUtc}, price=${entity.totalPrice}`);
    return Mappers.MapFlightOffer(entity);
  }

  async toggleFavourite (offerId: EntityId, userId: EntityId): Promise<boolean> {
    this.logger.verbose(`(FlightsLogic) toggling favourite offer, id=${offerId}, userId=${userId}`);

    const entity = await this.dbRepository.userFlightOffer.findFirst({
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
      this.logger.debug(`(FlightsLogic) toggling existing favourite record, id=${offerId}, userId=${userId}, favouriteId=${entity.id}, isFavourite=${result}`);
      await this.dbRepository.userFlightOffer.update({
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
      this.logger.debug(`(FlightsLogic) creating existing favourite record, id=${offerId}, userId=${userId}`);
      result = true;
      await this.dbRepository.userFlightOffer.create({
        data: {
          version: DbConcurrencyVersions.InitialVersion,
          isFavourite: result,
          userId,
          offerId
        }
      });
    }

    this.logger.verbose(`(FlightsLogic) favourite offer toggled, id=${offerId}, userId=${userId}, result=${result}`);
    return result;
  }

  calculateFlightPrice (company: Pick<IAirlineCompany, 'name'>, airport: Pick<IAirport, 'name'> | undefined, airplane: Pick<IAirplane, 'name'> | undefined, distance: DistanceUnitKm, duration: number, flightClass: FlightClass): Price {
    const hashString = (value: string) => murmurHash(Buffer.from(value).toString('base64'));

    const companyAdjustment = (hashString(company.name.en) % 5) * 10;
    const airportAdjustment = airport ? (hashString(airport.name.en) % 5) * 3 : 0;
    const airplaneAdjustment = airplane ? (hashString(airplane.name.en) % 5) * 5 : 0;
    const distanceAdjustment = distance * 0.007;
    const durationAdjustment = duration * 0.06;
    let flightClassAdjustment = 50;
    switch (flightClass) {
      case 'comfort':
        flightClassAdjustment = 400;
        break;
      case 'business':
        flightClassAdjustment = 1500;
        break;
    }
    return new Decimal(normalizePrice(companyAdjustment + airportAdjustment + airplaneAdjustment + distanceAdjustment + flightClassAdjustment + durationAdjustment, 0));
  }

  async calculateOfferPrice (offer: MakeSearchResultEntity<IFlightOffer>): Promise<Price> {
    let result = await this.calculateFlightPrice(
      offer.departFlight.airlineCompany,
      offer.departFlight.departAirport,
      offer.departFlight.airplane,
      calculateDistanceKm(offer.departFlight.departAirport.geo, offer.departFlight.arriveAirport.geo),
      (offer.departFlight.arriveTimeUtc.getTime() - offer.departFlight.departTimeUtc.getTime()) / 60000,
      offer.class);
    if (offer.arriveFlight) {
      result = result.add(await this.calculateFlightPrice(
        offer.arriveFlight.airlineCompany,
        offer.arriveFlight.departAirport,
        offer.arriveFlight.airplane,
        calculateDistanceKm(offer.arriveFlight.departAirport.geo, offer.arriveFlight.arriveAirport.geo),
        (offer.arriveFlight.arriveTimeUtc.getTime() - offer.arriveFlight.departTimeUtc.getTime()) / 60000,
        offer.class));
    }
    result = result.times(offer.numPassengers);
    return result;
  }

  async getFlightPromoPrice (cityId: EntityId): Promise<Price> {
    this.logger.debug(`(FlightsLogic) get promo price, cityId=${cityId}`);

    const company = await this.airlineCompanyLogic.getNearestCompany();
    const distance = await this.geoLogic.getAverageDistance(cityId);
    const flightClass: FlightClass = 'economy';
    const result = normalizePrice(this.calculateFlightPrice(company, undefined, undefined, distance, 120, flightClass), 1);

    this.logger.debug(`(FlightsLogic) promo price, cityId=${cityId}, result=${result}`);
    return result;
  }

  async searchOffers (filter: IFlightOffersFilterParams, userId: EntityId | 'guest', primarySorting: ISorting<FlightOffersSortFactor>, secondarySorting: ISorting<FlightOffersSortFactor>, pagination: IPagination, narrowFilterParams: boolean, topOffersStats: boolean): Promise<ISearchFlightOffersResult> {
    this.logger.verbose(`(FlightsLogic) search offers, filter=${JSON.stringify(filter)}, userId=${userId}, primarySorting=${JSON.stringify(primarySorting)}, secondarySorting=${JSON.stringify(secondarySorting)}, pagination=${JSON.stringify(pagination)}, narrowFilterParams=${narrowFilterParams}, topOffersStats=${topOffersStats}`);

    try {
      const primarySortFactor = primarySorting.factor ?? SearchOffersListConstants.DefaultFlightOffersSorting;
      const secondarySortFactor = secondarySorting.factor ?? SearchOffersListConstants.DefaultFlightOffersSorting;
      let variants = await this.generateFlightOffersFull(filter, userId, primarySortFactor, secondarySortFactor);
      this.logger.debug(`(FlightsLogic) sorting flight offer variants, userId=${userId}`);
      variants = orderBy(variants, ['primarySortFactor', 'secondarySortFactor'], [primarySorting.direction, secondarySorting.direction]);
      let filterParams : ISearchFlightOffersResultFilterParams | undefined;
      let topOffers: ITopFlightOfferInfo[] | undefined;
      if (narrowFilterParams) {
        filterParams = this.computeFlightOffersFilterParams(variants, userId);
      }
      variants = this.filterFlightOffers(variants, filter, userId);
      const totalCount = variants.length;
      if (topOffersStats) {
        topOffers = this.computeTopFlightOffersInfo(variants, userId);
      }

      const take = pagination.skip >= variants.length ? 0 : (Math.min(variants.length - pagination.skip, pagination.take));
      const skip = pagination.skip;
      this.logger.debug(`(FlightsLogic) applying pagination to flight offer, userId=${userId}, skip=${skip}, take=${take}`);
      if (pagination.skip >= variants.length) {
        variants = [];
      } else {
        variants = variants.slice(skip, skip + take);
      }
      await this.ensureOffersInDatabase(variants, userId);

      const result: ISearchFlightOffersResult = {
        pagedItems: variants,
        paramsNarrowing: filterParams,
        topOffers,
        totalCount
      };
      this.logger.verbose(`(FlightsLogic) search offers - completed, filter=${JSON.stringify(filter)}, userId=${userId}, count=${variants.length}`);
      return result;
    } catch (err: any) {
      this.logger.warn('(FlightsLogic) error occured while searching offers', err, { filter, pagination, userId });
      throw err;
    }
  }

  async createFlightsAndFillIds (flights: MakeSearchResultEntity<IFlight>[]): Promise<void> {
    this.logger.verbose(`(FlightsLogic) creating memory flights and filling IDs, count=${flights.length}`);

    await this.dbRepository.$transaction(async () => {
      for (let i = 0; i < flights.length; i++) {
        const flight = flights[i];
        const dataHash = buildFlightUniqueDataKey(flight);

        const queryResult = await this.dbRepository.flight.create({
          data: {
            arrivalUtc: flight.arriveTimeUtc,
            departmentUtc: flight.departTimeUtc,
            version: DbConcurrencyVersions.InitialVersion,
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

    this.logger.verbose(`(FlightsLogic) creating memory flights and filling IDs - completed, count=${flights.length}`);
  }

  async ensureFlightsInDatabase (flights: MakeSearchResultEntity<IFlight>[]): Promise<void> {
    this.logger.debug(`(FlightsLogic) ensuring flights in DB, count=${flights.length}`);

    const memoryFlightsMap = new Map<string, MakeSearchResultEntity<IFlight>>(
      flights.map(f => [buildFlightUniqueDataKey(f), f]));

    const dbFlights = (await this.dbRepository.flight.findMany({
      where: {
        isDeleted: false,
        dataHash: {
          in: [...memoryFlightsMap.keys()]
        }
      },
      select: Queries.FlightInfoQuery.select
    })).map(Mappers.MapFlight);

    const dbFlightsMap = new Map<string, IFlight>(dbFlights.map(o => [o.dataHash, o]));

    const flightsToCreate = [] as MakeSearchResultEntity<IFlight>[];
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

    this.logger.debug(`(FlightsLogic) ensuring offers in DB - completed, count=${flights.length}, num identified=${identifiedCount}`);
  }

  async createOffersAndFillIds (offers: OfferWithSortFactors<IFlightOffer>[], flightIdsMap: Map<string, EntityId>): Promise<void> {
    this.logger.verbose(`(FlightsLogic) creating memory offers and filling IDs, count=${offers.length}`);
    if (offers.length === 0) {
      return;
    }

    this.logger.debug('(FlightsLogic) running offer\'s create transaction');
    await this.dbRepository.$transaction(async () => {
      for (let i = 0; i < offers.length; i++) {
        const offer = offers[i];
        const dataHash = buildFlightOfferUniqueDataKey(offer);

        const queryResult = await this.dbRepository.flightOffer.create({
          data: {
            class: offer.class,
            numPassengers: offer.numPassengers,
            totalPrice: offer.totalPrice.toNumber(),
            departFlightId: flightIdsMap.get(buildFlightUniqueDataKey(offer.departFlight))!,
            version: DbConcurrencyVersions.InitialVersion,
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

    this.logger.verbose(`(FlightsLogic) creating memory offers and filling IDs - completed, count=${offers.length}`);
  }

  async ensureOffersInDatabase (offers: OfferWithSortFactors<IFlightOffer>[], userId: EntityId | 'guest'): Promise<void> {
    this.logger.debug(`(FlightsLogic) ensuring offers in DB, userId=${userId}, count=${offers.length}`);

    const memoryOffersMap = new Map<string, OfferWithSortFactors<IFlightOffer>>(
      offers.map(o => [buildFlightOfferUniqueDataKey(o), o]));

    this.logger.debug('(FlightsLogic) preparing offer\'s flight IDs');
    const flightsDeduped = uniqBy(flatten(offers.map(o => [o.departFlight, o.arriveFlight])).filter(f => f).map((f) => { return { flight: f, dataHash: buildFlightUniqueDataKey(f!) }; }), f => f!.dataHash).map(f => f.flight!);
    await this.ensureFlightsInDatabase(flightsDeduped);
    const flightIdsMap = new Map<string, EntityId>(flightsDeduped.map(f => [buildFlightUniqueDataKey(f), f.id]));

    const dbOffers = (await this.dbRepository.flightOffer.findMany({
      where: {
        isDeleted: false,
        dataHash: {
          in: [...memoryOffersMap.keys()]
        }
      },
      select: Queries.FlightOfferInfoQuery(userId).select
    })).map(Mappers.MapFlightOffer);

    const dbOffersMap = new Map<string, IFlightOffer>(dbOffers.map(o => [o.dataHash, o]));

    const offersToCreate = [] as OfferWithSortFactors<IFlightOffer>[];
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

    this.logger.debug(`(FlightsLogic) ensuring offers in DB - completed, userId=${userId}, count=${offers.length}, num identified=${identifiedCount}`);
  }

  computeFlightOffersFilterParams (offers: OfferWithSortFactors<IFlightOffer>[], userId: EntityId | 'guest'): ISearchFlightOffersResultFilterParams {
    this.logger.debug(`(FlightsLogic) computing flight offer filter params, userId=${userId}, count=${offers.length}`);

    let result: ISearchFlightOffersResultFilterParams = {};
    if (offers.length > 0) {
      result = {
        airlineCompanies: uniqBy([
          ...offers.map(o => o.departFlight.airlineCompany),
          ...offers.filter(x => x.arriveFlight).map(f => f.arriveFlight!.airlineCompany)
        ], f => f.id)
          .map((c) => { return { id: c.id, name: c.name }; }),
        priceRange: {
          from: Math.min(...offers.map(o => o.totalPrice.toNumber())),
          to: Math.max(...offers.map(o => o.totalPrice.toNumber()))
        }
      };
    }

    this.logger.debug(`(FlightsLogic) flight offer filter params computed, userId=${userId}, count=${offers.length}, result=${JSON.stringify(result)}`);
    return result;
  }

  getFlightOfferSortFactorValue = (offer: MakeSearchResultEntity<IFlightOffer>, factor: FlightOffersSortFactor): number => {
    if (factor === 'duration') {
      const departFlightDuration = Math.round((offer.departFlight.arriveTimeUtc.getTime() - offer.departFlight.departTimeUtc.getTime()) / 60000);
      const arriveFlightDuration = offer.arriveFlight ? Math.round((offer.arriveFlight.arriveTimeUtc.getTime() - offer.arriveFlight.departTimeUtc.getTime()) / 60000) : undefined;
      return arriveFlightDuration ? 0.5 * (departFlightDuration + arriveFlightDuration) : departFlightDuration;
    }

    const utcNow = dayjs(undefined, { utc: true }).toDate();
    switch (factor) {
      case 'price':
        return offer.totalPrice.toNumber();
      case 'timetodeparture':
        return (offer.departFlight.departTimeUtc.getTime() - utcNow.getTime()) / 60000;
      case 'rating':
        return offer.departFlight.airlineCompany.reviewScore;
      case 'score':
        return this.getFlightOfferSortFactorValue(offer, 'duration') * this.getFlightOfferSortFactorValue(offer, 'price') * this.getFlightOfferSortFactorValue(offer, 'rating');
      default:
        this.logger.warn(`(FlightsLogic) unexpected flight offer sort factor: ${factor}`);
        throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'unexpected sorting', 'error-stub');
    }
  };

  computeTopFlightOffersInfo (offers: OfferWithSortFactors<IFlightOffer>[], userId: EntityId | 'guest'): ITopFlightOfferInfo[] | undefined {
    this.logger.debug(`(FlightsLogic) computing top flight offer values, userId=${userId}, count=${offers.length}`);

    if (offers.length === 0) {
      this.logger.debug(`(FlightsLogic) returning empty top flight offer values, userId=${userId}`);
      return undefined;
    }

    const factorConfigs: { factor: FlightOffersSortFactor, dir: 'asc' | 'desc' }[] = [
      { factor: 'price', dir: 'asc' },
      { factor: 'score', dir: 'desc' },
      { factor: 'duration', dir: 'asc' },
      { factor: 'rating', dir: 'desc' },
      { factor: 'timetodeparture', dir: 'asc' }
    ];
    const currentTopValues: { topOffer: OfferWithSortFactors<IFlightOffer>, topValue: number, factor: FlightOffersSortFactor }[] = [];
    for (let i = 0; i < factorConfigs.length; i++) {
      currentTopValues.push({
        topOffer: offers[0],
        topValue: this.getFlightOfferSortFactorValue(offers[0], factorConfigs[i].factor),
        factor: factorConfigs[i].factor
      });
    }

    for (let i = 0; i < offers.length; i++) {
      for (let j = 0; j < factorConfigs.length; j++) {
        const factorConfig = factorConfigs[j];
        const offer = offers[i];
        const value = this.getFlightOfferSortFactorValue(offer, factorConfig.factor);
        const currentTopValue = currentTopValues[j].topValue;
        if (factorConfig.dir === 'asc' && value < currentTopValue) {
          currentTopValues[j].topValue = value;
          currentTopValues[j].topOffer = offer;
        } else if (factorConfig.dir === 'desc' && value > currentTopValue) {
          currentTopValues[j].topValue = value;
          currentTopValues[j].topOffer = offer;
        }
      }
    }

    const result = currentTopValues.map(v => <ITopFlightOfferInfo>{
      duration: this.getFlightOfferSortFactorValue(v.topOffer, 'duration'),
      price: v.topOffer.totalPrice,
      factor: v.factor
    });

    this.logger.debug(`(FlightsLogic) flight offer filter params computed, userId=${userId}, count=${offers.length}, result=${JSON.stringify(result)}`);
    return result;
  }

  filterFlightOffers (offers: OfferWithSortFactors<IFlightOffer>[], filter: IFlightOffersFilterParams, userId: EntityId | 'guest'): OfferWithSortFactors<IFlightOffer>[] {
    this.logger.debug(`(FlightsLogic) filtering flight offer variants, filter=${JSON.stringify(filter)}, userId=${userId}, count=${offers.length}`);

    const isMatch = (offer: OfferWithSortFactors<IFlightOffer>): boolean => {
      if ((filter.airlineCompanyIds?.length ?? 0) > 0) {
        if (!filter.airlineCompanyIds?.includes(offer.departFlight.airlineCompany.id) &&
        !(offer.arriveFlight?.airlineCompany && filter.airlineCompanyIds?.includes(offer.arriveFlight.airlineCompany.id))) {
          return false;
        }
      }

      if (filter.departureTimeOfDay?.from || filter.departureTimeOfDay?.to) {
        const departureTimeOfDayUserLocal = getTimeOfDay(offer.departFlight.departTimeUtc, offer.departFlight.departAirport.city.utcOffsetMin);
        if (filter.departureTimeOfDay?.from && departureTimeOfDayUserLocal < filter.departureTimeOfDay.from) {
          return false;
        }

        if (filter.departureTimeOfDay?.to && departureTimeOfDayUserLocal > filter.departureTimeOfDay.to) {
          return false;
        }
      }

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
        const ratingMatches = ratingValues.some(r => Math.abs(r - Math.floor(offer.departFlight.airlineCompany.reviewScore)) < 0.01);
        if (!ratingMatches) {
          return false;
        }
      }

      return true;
    };

    const result = offers.filter(isMatch);

    this.logger.debug(`(FlightsLogic) flight offers filtered, userId=${userId}, count=${result.length}`);
    return result;
  }

  async generateFlightOffersFull (filter: IFlightOffersFilterParams, userId: EntityId | 'guest', primarySortFactor: FlightOffersSortFactor, secondarySortFactor: FlightOffersSortFactor): Promise<OfferWithSortFactors<IFlightOffer>[]> {
    this.logger.debug(`(FlightsLogic) generating full flight offer variants, userId=${userId}`);

    const varyDate = (date: Date): Date[] => {
      const result: Date[] = [];
      for (let i = -AppConfig.searchOffers.flexibleDatesRangeDays; i <= AppConfig.searchOffers.flexibleDatesRangeDays; i++) {
        result.push(dayjs(date).add(i, 'day').toDate());
      }
      return result;
    };

    // construct date variants
    const flexibleDates = filter.flexibleDates ?? false;
    let dateFromVariants = filter.dateFrom ? (flexibleDates ? varyDate(filter.dateFrom) : [filter.dateFrom]) : varyDate(dayjs().toDate());
    const dateToVariants = (filter.tripType ?? 'oneway') === 'return' ? (filter.dateTo ? (flexibleDates ? varyDate(filter.dateTo) : [filter.dateTo]) : varyDate(dayjs(filter.dateFrom ?? dayjs().toDate()).add(AppConfig.autoInputDatesRangeDays, 'day').toDate())) : undefined;
    if (dateToVariants) {
      dateFromVariants = dateFromVariants.filter(d => d.getTime() < dateToVariants[0].getTime());
      if (!dateFromVariants.length) {
        dateFromVariants.push(dateToVariants[0]);
      }
    }
    this.logger.debug(`(FlightsLogic) generating full flight offer variants, userId=${userId}, using date variants: from=[${dateFromVariants.map(d => d.toISOString()).join(', ')}], to=[${dateToVariants?.map(d => d.toISOString()).join(', ') ?? '(none)'}]`);

    // construct airport variants
    const cityAirports = await this.airportLogic.getAirportsForSearch([filter.fromCitySlug, filter.toCitySlug].filter(x => (x?.length ?? 0) > 0) as string[], !filter.fromCitySlug || !filter.toCitySlug);
    if (cityAirports.length === 0) {
      this.logger.warn(`(FlightsLogic) got empty list of airports to search, filter=${JSON.stringify(filter)}, userId=${userId}`);
      throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'airports data not found', 'error-stub');
    }

    const fromCitySlugs = filter.fromCitySlug ? [filter.fromCitySlug] : (cityAirports.map(x => x.city.slug).filter(s => s !== filter.toCitySlug));
    const toCitySlugs = filter.toCitySlug ? [filter.toCitySlug] : (cityAirports.map(x => x.city.slug).filter(s => s !== filter.fromCitySlug));
    if (toCitySlugs.length > fromCitySlugs.length && fromCitySlugs.length > 1 && (toCitySlugs.length % fromCitySlugs.length === 0)) {
      fromCitySlugs.splice(0, 1);
    }
    const cityAirportVariants: { from: MakeSearchResultEntity<IAirport>, to: MakeSearchResultEntity<IAirport> }[] = [];
    for (let i = 0; i < Math.min(SearchOffersListConstants.MaxOfferGenerationCityPairCount, Math.max(fromCitySlugs.length, toCitySlugs.length)); i++) {
      const fromCitySlug = fromCitySlugs[((i + 1) * SearchOffersListConstants.PrimeOfferIterator) % fromCitySlugs.length];
      const toCitySlug = toCitySlugs[((i + 2) * SearchOffersListConstants.PrimeOfferIterator) % toCitySlugs.length];
      const fromAirport = cityAirports.find(x => x.city.slug === fromCitySlug)!;
      const toAirport = cityAirports.find(x => x.city.slug === toCitySlug)!;
      cityAirportVariants.push({ from: fromAirport, to: toAirport });
    }
    this.logger.debug(`(FlightsLogic) generating full flight offer variants, userId=${userId}, city variants count=${cityAirportVariants.length}`);

    const tripType = filter.tripType ?? 'oneway';
    const numPassengers = filter.numPassengers ?? 1;
    const flightClass = filter.class ?? 'economy';

    const result: OfferWithSortFactors<IFlightOffer>[] = [];
    for (let i = 0; i < dateFromVariants.length; i++) {
      for (let j = 0; j < (dateToVariants?.length ?? 1); j++) {
        for (let k = 0; k < cityAirportVariants.length; k++) {
          const fromDate = dateFromVariants[i];
          const toDate = dateToVariants ? dateToVariants[j] : undefined;
          const routeVariant = cityAirportVariants[k];
          const offers = await this.generateFlightOfferVariants(fromDate, toDate, routeVariant.from, routeVariant.to, tripType, numPassengers, flightClass, primarySortFactor, secondarySortFactor);
          result.push(...offers);

          if (result.length > SearchOffersListConstants.MaxOfferGenerationMemoryBufferItems) {
            this.logger.warn(`(FlightsLogic) maximum number of flight offer items in memory buffer reached, stopping generation with current values, filter=${JSON.stringify(filter)}, userId=${userId}`);
            break;
          }
        }
      }
    }

    this.logger.debug(`(FlightsLogic) generating full flight offer variants, userId=${userId}, result count=${result.length}`);
    return result;
  }

  async generateFlightOfferVariants (fromDate: Date, toDate: Date | undefined, fromAirport: MakeSearchResultEntity<IAirport>, toAirport: MakeSearchResultEntity<IAirport>, tripType: TripType, numPassengers: number, flightClass: FlightClass, primarySortFactor: FlightOffersSortFactor, secondarySortFactor: FlightOffersSortFactor): Promise<OfferWithSortFactors<IFlightOffer>[]> {
    let flightPairs: {depart: MakeSearchResultEntity<IFlight>, arrive?: MakeSearchResultEntity<IFlight>}[] = [];
    if (tripType === 'oneway') {
      flightPairs = (await this.generateFlightVariants(fromDate, fromAirport, toAirport)).map((f) => { return { depart: f, arrive: undefined }; });
    } else {
      const departFlights = await this.generateFlightVariants(fromDate, fromAirport, toAirport);
      const arriveFlights = await this.generateFlightVariants(toDate!, toAirport, fromAirport);
      arriveFlights.splice(0, 1);
      for (let i = 0; i < Math.min(SearchOffersListConstants.MaxOfferGenerationRouteFlightsCount, Math.max(departFlights.length, arriveFlights.length)); i++) {
        const departFlight = departFlights[((i + 1) * SearchOffersListConstants.PrimeOfferIterator) % departFlights.length];
        const arriveFlight = arriveFlights[((i + 2) * SearchOffersListConstants.PrimeOfferIterator) % arriveFlights.length];
        flightPairs.push({ depart: departFlight, arrive: arriveFlight });
      }
    }

    const usedDataHashes = new Set<string>(); // for preventing duplicates
    const result: OfferWithSortFactors<IFlightOffer>[] = [];
    for (let i = 0; i < flightPairs.length; i++) {
      const offer: OfferWithSortFactors<IFlightOffer> = {
        class: flightClass,
        isFavourite: false,
        id: TemporaryEntityId,
        kind: 'flights',
        departFlight: flightPairs[i].depart,
        arriveFlight: flightPairs[i].arrive,
        numPassengers,
        totalPrice: new Decimal(0),
        primarySortFactor: 0,
        secondarySortFactor: 0
      };
      offer.totalPrice = await this.calculateOfferPrice(offer);
      offer.primarySortFactor = this.getFlightOfferSortFactorValue(offer, primarySortFactor);
      offer.secondarySortFactor = this.getFlightOfferSortFactorValue(offer, secondarySortFactor);
      const dataHash = buildFlightOfferUniqueDataKey(offer);
      if (!usedDataHashes.has(dataHash)) {
        result.push(offer);
        usedDataHashes.add(dataHash);
      }
    }

    return result;
  }

  async getNearestCompanies (city: MakeSearchResultEntity<ICity>): Promise<MakeSearchResultEntity<IAirlineCompany>[]> {
    this.logger.debug(`(FlightsLogic) filtering nearest companies, cityId=${city.id}`);

    const allAirlineCompanies = await this.airlineCompanyLogic.getAllAirlineCompanies();
    if ((allAirlineCompanies?.length ?? 0) === 0) {
      this.logger.debug(`(FlightsLogic) no airline companies found, returning empty list, cityId=${city.id}`);
      return [];
    }

    let companiesWithDistance = allAirlineCompanies.map((c) => { return { company: c, distance: calculateDistanceKm(c.city.geo, city.geo) }; });
    companiesWithDistance = orderBy(companiesWithDistance, ['distance'], ['asc']).slice(0, SearchOffersListConstants.MaxOfferGenerationRouteCompaniesCount);
    const result = companiesWithDistance.map(x => x.company);

    this.logger.debug(`(FlightsLogic) nearest companies filtered, cityId=${city.id}, count=${result.length}`);
    return result;
  }

  async generateFlightVariants (date: Date, fromAirport: MakeSearchResultEntity<IAirport>, toAirport: MakeSearchResultEntity<IAirport>): Promise<(MakeSearchResultEntity<IFlight> & { dataHash: string })[]> {
    const result: (MakeSearchResultEntity<IFlight> & { dataHash: string })[] = [];

    const airlineCompanies = await this.getNearestCompanies(fromAirport.city);
    if ((airlineCompanies?.length ?? 0) === 0) {
      this.logger.warn(`(FlightsLogic) cannot generate flight variants, got empty list of airline companies, date=${date}, fromCitySlug=${fromAirport.city.slug}, toCitySlug=${toAirport.city.slug}`);
      throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'airline companies data not found', 'error-stub');
    }

    const allAirplanes = await this.airplaneLogic.getAllAirplanes();
    if (allAirplanes.length === 0) {
      this.logger.warn(`(FlightsLogic) cannot generate flight variants, got empty list of airplanes, date=${date}, fromCitySlug=${fromAirport.city.slug}, toCitySlug=${toAirport.city.slug}`);
      throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'airplanes data not found', 'error-stub');
    }

    const utcOffsetMinutes = fromAirport.city.utcOffsetMin;

    const fromDateTimeUtc = dayjs(date).add(-utcOffsetMinutes, 'minute').utc().toDate();
    for (let i = 0; i < SearchOffersListConstants.MaxOfferGenerationRouteFlightsCount; i++) {
      const paramsHash = murmurHash(Buffer.concat([
        Uint8Array.of(date.getTime() / 60000),
        Uint8Array.from(Buffer.from(fromAirport.name.en, 'utf8')),
        Uint8Array.from(Buffer.from(toAirport.name.en, 'utf8')),
        Uint8Array.of(i)]).toString('base64'));

      const airlineCompany = airlineCompanies[paramsHash % airlineCompanies.length];
      const airplane = allAirplanes[paramsHash % allAirplanes.length];

      const departMinutes = (paramsHash % (24 * 60 / SearchOffersListConstants.FlightTimeOfDayIntervalMinutes)) * SearchOffersListConstants.FlightTimeOfDayIntervalMinutes;
      const departTimeUtc = dayjs(fromDateTimeUtc).add(departMinutes, 'minute').utc().toDate();

      const duration = Math.ceil(calculateDistanceKm(fromAirport.geo, toAirport.geo) / 20 + 120 + paramsHash % 30);
      const arriveTimeUtc = dayjs(departTimeUtc).add(duration, 'minute').utc().toDate();

      const newFlight = {
        id: TemporaryEntityId,
        airlineCompany,
        airplane,
        arriveAirport: toAirport,
        departAirport: fromAirport,
        departTimeUtc,
        arriveTimeUtc,
        dataHash: ''
      };
      newFlight.dataHash = buildFlightUniqueDataKey(newFlight);
      result.push(newFlight);
    }

    return result;
  }
}
