import { type ISearchFlightOffersResult, type ISearchFlightOffersResultFilterParams,type ITopFlightOfferInfo, CachedResultsInAppServicesEnabled, type IFlightOffersFilterParams, normalizePrice, AppException, AppExceptionCodeEnum, AppConfig, FlightTimeOfDayIntervalMinutes, MaxOfferGenerationRouteCompaniesCount, MaxOfferGenerationRouteFlightsCount, MaxOfferGenerationMemoryBufferItems, SearchOffersPrimeOfferIterator, MaxOfferGenerationCityPairCount, DefaultFlightOffersSorting, DbVersionInitial, TemporaryEntityId, calculateDistanceKm, getTimeOfDay, newUniqueId, type IAppLogger, type ICity, type FlightOffersSortFactor, type IPagination, type ISorting, type Price, type EntityId, type IFlight, type IAirlineCompany, type IAirplane, type DistanceUnitKm, type IFlightOffer, type FlightClass, type EntityDataAttrsOnly, type TripType, type IAirport, type PreviewMode } from '@golobe-demo/shared';
import type { IAirplaneLogic, IAirportLogic, IAirlineCompanyLogic, IFlightsLogic, IGeoLogic } from './../types';
import { buildFlightUniqueDataKey, buildFlightOfferUniqueDataKey } from './../helpers/utils';
import type { PrismaClient } from '@prisma/client';
import type { Storage, StorageValue } from 'unstorage';
import { Decimal } from 'decimal.js';
import dayjs from 'dayjs';
import orderBy from 'lodash-es/orderBy';
import uniqBy from 'lodash-es/uniqBy';
import { murmurHash } from 'ohash';
import { FlightOfferInfoQuery, MapFlightOffer } from './queries';
import type { IFlightOfferMaterializer } from './../common-services/offer-materializers';
import { executeInTransaction } from './../helpers/db';

declare type OfferWithSortFactors<TOffer extends IFlightOffer> = EntityDataAttrsOnly<TOffer> & { primarySortFactor: number, secondarySortFactor: number };

export class FlightsLogic implements IFlightsLogic {
  private logger: IAppLogger;
  private dbRepository: PrismaClient;
  private geoLogic: IGeoLogic;
  private airportLogic: IAirportLogic;
  private airlineCompanyLogic: IAirlineCompanyLogic;
  private airplaneLogic: IAirplaneLogic;
  private cache: Storage<StorageValue>;
  private offerMaterializer: IFlightOfferMaterializer;

  public static inject = ['dbRepository', 'cache', 'geoLogic', 'airportLogic', 'airplaneLogic', 'airlineCompanyLogic', 'flightOfferMaterializer', 'logger'] as const;
  constructor (dbRepository: PrismaClient, cache: Storage<StorageValue>, geoLogic: IGeoLogic, airportLogic: IAirportLogic, airplaneLogic: IAirplaneLogic, airlineCompanyLogic: IAirlineCompanyLogic, flightOfferMaterializer: IFlightOfferMaterializer, logger: IAppLogger) {
    this.logger = logger;
    this.geoLogic = geoLogic;
    this.airlineCompanyLogic = airlineCompanyLogic;
    this.airportLogic = airportLogic;
    this.dbRepository = dbRepository;
    this.airplaneLogic = airplaneLogic;
    this.cache = cache;
    this.offerMaterializer = flightOfferMaterializer;
  }

  async deleteFlightOffer(id: EntityId): Promise<void> {
    this.logger.verbose(`(FlightsLogic) deleting flight offer: id=${id}`);
    await executeInTransaction(async () => {
      await this.dbRepository.booking.updateMany({
        where: {
          flightOffer: {
            id
          },
          isDeleted: false
        },
        data: {
          isDeleted: true,
          version: { increment: 1 }
        }
      });
      await this.dbRepository.userFlightOffer.updateMany({
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
      await this.dbRepository.flightOffer.update({
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
    this.logger.verbose(`(FlightsLogic) flight offer deleted: id=${id}`);
  };

  async deleteFlight(id: EntityId): Promise<void> {
    this.logger.verbose(`(FlightsLogic) deleting flight: id=${id}`);
    await this.dbRepository.flight.update({
      where: {
        id,
        isDeleted: false
      },
      data: {
        isDeleted: true,
        version: { increment: 1 }
      }
    });
    this.logger.verbose(`(FlightsLogic) flight deleted: id=${id}`);
  };

  async getFlightOffer (id: EntityId, userId: EntityId | 'guest'): Promise<IFlightOffer> {
    this.logger.verbose(`(FlightsLogic) get flight offer, id=${id}, userId=${userId}`);
    const entity = await this.dbRepository.flightOffer.findFirst({
      where: {
        isDeleted: false,
        id
      },
      select: FlightOfferInfoQuery(userId).select
    });
    if (!entity) {
      this.logger.warn(`(FlightsLogic) flight offer was not found, id=${id}, userId=${userId}`);
      throw new AppException(AppExceptionCodeEnum.OBJECT_NOT_FOUND, 'flight offer not found', 'error-page');
    }

    this.logger.verbose(`(FlightsLogic) get flight offer - found, id=${id}, userId=${userId}, modifiedUtc=${entity.modifiedUtc}, price=${entity.totalPrice}`);
    return MapFlightOffer(entity);
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
          isFavourite: result
        }
      });
    } else {
      this.logger.debug(`(FlightsLogic) creating favourite record, id=${offerId}, userId=${userId}`);
      result = true;
      await this.dbRepository.userFlightOffer.create({
        data: {
          id: newUniqueId(),
          version: DbVersionInitial,
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

  async calculateOfferPrice (offer: EntityDataAttrsOnly<IFlightOffer>): Promise<Price> {
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

  async getFlightPromoPrice (cityId: EntityId, previewMode: PreviewMode): Promise<Price> {
    this.logger.debug(`(FlightsLogic) get promo price, cityId=${cityId}, previewMode=${previewMode}`);

    const company = await this.airlineCompanyLogic.getNearestCompany(CachedResultsInAppServicesEnabled);
    const distance = await this.geoLogic.getAverageDistance(cityId, CachedResultsInAppServicesEnabled, previewMode);
    const flightClass: FlightClass = 'economy';
    const result = normalizePrice(this.calculateFlightPrice(company, undefined, undefined, distance, 120, flightClass), 1);

    this.logger.debug(`(FlightsLogic) promo price, cityId=${cityId}, result=${result}, previewMode=${previewMode}`);
    return result;
  }

  async searchOffers (filter: IFlightOffersFilterParams, userId: EntityId | 'guest', primarySorting: ISorting<FlightOffersSortFactor>, secondarySorting: ISorting<FlightOffersSortFactor>, pagination: IPagination, narrowFilterParams: boolean, topOffersStats: boolean, previewMode: boolean = false): Promise<ISearchFlightOffersResult> {
    this.logger.verbose(`(FlightsLogic) search offers, filter=${JSON.stringify(filter)}, userId=${userId}, primarySorting=${JSON.stringify(primarySorting)}, secondarySorting=${JSON.stringify(secondarySorting)}, pagination=${JSON.stringify(pagination)}, narrowFilterParams=${narrowFilterParams}, topOffersStats=${topOffersStats}, previewMode=${previewMode}`);

    try {
      const primarySortFactor = primarySorting.factor ?? DefaultFlightOffersSorting;
      const secondarySortFactor = secondarySorting.factor ?? DefaultFlightOffersSorting;
      let variants = await this.generateFlightOffersFull(filter, userId, primarySortFactor, secondarySortFactor, previewMode);
      this.logger.debug(`(FlightsLogic) sorting flight offer variants, userId=${userId}, previewMode=${previewMode}`);
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
      this.logger.debug(`(FlightsLogic) applying pagination to flight offer, userId=${userId}, skip=${skip}, take=${take}, previewMode=${previewMode}`);
      if (pagination.skip >= variants.length) {
        variants = [];
      } else {
        variants = variants.slice(skip, skip + take);
      }
      await this.offerMaterializer.ensureOffersMaterialized(variants, userId, previewMode);

      const result: ISearchFlightOffersResult = {
        pagedItems: variants,
        paramsNarrowing: filterParams,
        topOffers,
        totalCount
      };
      this.logger.verbose(`(FlightsLogic) search offers - completed, filter=${JSON.stringify(filter)}, userId=${userId}, count=${variants.length}, previewMode=${previewMode}`);
      return result;
    } catch (err: any) {
      this.logger.warn('(FlightsLogic) exception occured while searching offers', err, { filter, pagination, userId, previewMode });
      throw err;
    }
  }

  async getUserFavouriteOffers (userId: EntityId): Promise<ISearchFlightOffersResult<IFlightOffer & { addDateUtc: Date }>> {
    this.logger.verbose(`(FlightsLogic) get user favourite offers, userId=${userId}`);

    const userOffers = await this.dbRepository.userFlightOffer.findMany({
      where: {
        isDeleted: false,
        isFavourite: true,
        userId
      },
      select: {
        modifiedUtc: true,
        offer: {
          select: FlightOfferInfoQuery(userId).select
        }
      }
    });

    const mappedItems = userOffers.map((uo) => { return { addDateUtc: uo.modifiedUtc, ...(MapFlightOffer(uo.offer)) }; }).filter(o => !o.isDeleted);
    const result: ISearchFlightOffersResult<IFlightOffer & { addDateUtc: Date }> = {
      pagedItems: mappedItems,
      paramsNarrowing: undefined,
      topOffers: undefined,
      totalCount: mappedItems.length
    };

    this.logger.verbose(`(FlightsLogic) get user favourite offers completed, userId=${userId}, count=${result.totalCount}`);
    return result;
  }

  async getUserTickets(userId: EntityId): Promise<ISearchFlightOffersResult<IFlightOffer & { bookingId: EntityId, bookDateUtc: Date; }>> {
    this.logger.verbose(`(FlightsLogic) get user tickets, userId=${userId}`);

    const userOffers = await this.dbRepository.userFlightOffer.findMany({
      where: {
        isDeleted: false,
        booking: {
          isDeleted: false
        },
        userId
      },
      select: {
        offer: {
          select: FlightOfferInfoQuery(userId).select
        },
        booking: {
          select: {
            id: true,
            modifiedUtc: true
          }
        }
      }
    });

    const mappedItems = userOffers.map((uo) => { return { bookingId: uo.booking!.id, bookDateUtc: uo.booking!.modifiedUtc, ...(MapFlightOffer(uo.offer)) }; }).filter(o => !o.isDeleted);
    const result: ISearchFlightOffersResult<IFlightOffer & { bookingId: EntityId, bookDateUtc: Date; }> = {
      pagedItems: mappedItems,
      paramsNarrowing: undefined,
      topOffers: undefined,
      totalCount: mappedItems.length
    };

    this.logger.verbose(`(FlightsLogic) get user tickets completed, userId=${userId}, count=${result.totalCount}`);
    return result;
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

  getFlightOfferSortFactorValue = (offer: EntityDataAttrsOnly<IFlightOffer>, factor: FlightOffersSortFactor): number => {
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
        return offer.departFlight.airlineCompany.reviewSummary.score;
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
        const ratingMatches = ratingValues.some(r => Math.abs(r - Math.floor(offer.departFlight.airlineCompany.reviewSummary.score)) < 0.01);
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

  async generateFlightOffersFull (filter: IFlightOffersFilterParams, userId: EntityId | 'guest', primarySortFactor: FlightOffersSortFactor, secondarySortFactor: FlightOffersSortFactor, previewMode: boolean): Promise<OfferWithSortFactors<IFlightOffer>[]> {
    this.logger.debug(`(FlightsLogic) generating full flight offer variants, userId=${userId}, previewMode=${previewMode}`);

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
    this.logger.debug(`(FlightsLogic) generating full flight offer variants, userId=${userId}, previewMode=${previewMode}, using date variants: from=[${dateFromVariants.map(d => d.toISOString()).join(', ')}], to=[${dateToVariants?.map(d => d.toISOString()).join(', ') ?? '(none)'}]`);

    // construct airport variants
    const cityAirports = await this.airportLogic.getAirportsForSearch([filter.fromCitySlug, filter.toCitySlug].filter(x => (x?.length ?? 0) > 0) as string[], !filter.fromCitySlug || !filter.toCitySlug, previewMode);
    if (cityAirports.length === 0) {
      this.logger.warn(`(FlightsLogic) got empty list of airports to search, filter=${JSON.stringify(filter)}, userId=${userId}, previewMode=${previewMode}`);
      throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'airports data not found', 'error-stub');
    }

    const fromCitySlugs = filter.fromCitySlug ? [filter.fromCitySlug] : (cityAirports.map(x => x.city.slug).filter(s => s !== filter.toCitySlug));
    const toCitySlugs = filter.toCitySlug ? [filter.toCitySlug] : (cityAirports.map(x => x.city.slug).filter(s => s !== filter.fromCitySlug));
    if (toCitySlugs.length > fromCitySlugs.length && fromCitySlugs.length > 1 && (toCitySlugs.length % fromCitySlugs.length === 0)) {
      fromCitySlugs.splice(0, 1);
    }
    const cityAirportVariants: { from: EntityDataAttrsOnly<IAirport>, to: EntityDataAttrsOnly<IAirport> }[] = [];
    for (let i = 0; i < Math.min(MaxOfferGenerationCityPairCount, Math.max(fromCitySlugs.length, toCitySlugs.length)); i++) {
      const fromCitySlug = fromCitySlugs[((i + 1) * SearchOffersPrimeOfferIterator) % fromCitySlugs.length];
      const toCitySlug = toCitySlugs[((i + 2) * SearchOffersPrimeOfferIterator) % toCitySlugs.length];
      const fromAirport = cityAirports.find(x => x.city.slug === fromCitySlug)!;
      const toAirport = cityAirports.find(x => x.city.slug === toCitySlug)!;
      cityAirportVariants.push({ from: fromAirport, to: toAirport });
    }
    this.logger.debug(`(FlightsLogic) generating full flight offer variants, userId=${userId}, previewMode=${previewMode}, city variants count=${cityAirportVariants.length}`);

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
          const offers = await this.generateFlightOfferVariants(fromDate, toDate, routeVariant.from, routeVariant.to, tripType, numPassengers, flightClass, primarySortFactor, secondarySortFactor, previewMode);
          result.push(...offers);

          if (result.length > MaxOfferGenerationMemoryBufferItems) {
            this.logger.warn(`(FlightsLogic) maximum number of flight offer items in memory buffer reached, stopping generation with current values, filter=${JSON.stringify(filter)}, userId=${userId}, previewMode=${previewMode}`);
            break;
          }
        }
      }
    }

    this.logger.debug(`(FlightsLogic) generating full flight offer variants, userId=${userId}, previewMode=${previewMode}, result count=${result.length}`);
    return result;
  }

  async generateFlightOfferVariants (fromDate: Date, toDate: Date | undefined, fromAirport: EntityDataAttrsOnly<IAirport>, toAirport: EntityDataAttrsOnly<IAirport>, tripType: TripType, numPassengers: number, flightClass: FlightClass, primarySortFactor: FlightOffersSortFactor, secondarySortFactor: FlightOffersSortFactor, previewMode: PreviewMode): Promise<OfferWithSortFactors<IFlightOffer>[]> {
    let flightPairs: {depart: EntityDataAttrsOnly<IFlight>, arrive?: EntityDataAttrsOnly<IFlight>}[] = [];
    if (tripType === 'oneway') {
      flightPairs = (await this.generateFlightVariants(fromDate, fromAirport, toAirport, previewMode)).map((f) => { return { depart: f, arrive: undefined }; });
    } else {
      const departFlights = await this.generateFlightVariants(fromDate, fromAirport, toAirport, previewMode);
      const arriveFlights = await this.generateFlightVariants(toDate!, toAirport, fromAirport, previewMode);
      arriveFlights.splice(0, 1);
      for (let i = 0; i < Math.min(MaxOfferGenerationRouteFlightsCount, Math.max(departFlights.length, arriveFlights.length)); i++) {
        const departFlight = departFlights[((i + 1) * SearchOffersPrimeOfferIterator) % departFlights.length];
        const arriveFlight = arriveFlights[((i + 2) * SearchOffersPrimeOfferIterator) % arriveFlights.length];
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

  getNearestCompaniesCacheKey (cityId: EntityId, previewMode: PreviewMode): string {
    return `NearestCompanies${previewMode ? 'Preview' : ''}-${cityId}`;
  }

  async getNearestCompanies (city: EntityDataAttrsOnly<ICity>, previewMode: PreviewMode): Promise<EntityDataAttrsOnly<IAirlineCompany>[]> {
    this.logger.debug(`(FlightsLogic) filtering nearest companies, cityId=${city.id}, previewMode=${previewMode}`);

    const cacheKey = this.getNearestCompaniesCacheKey(city.id, previewMode);
    let result = (await this.cache.getItem<EntityDataAttrsOnly<IAirlineCompany>[]>(cacheKey));
    if(!result) {
      this.logger.debug(`(FlightsLogic) nearest companies cache miss, computing, cityId=${city.id}, previewMode=${previewMode}`);
      const allAirlineCompanies = await this.airlineCompanyLogic.getAllAirlineCompanies(CachedResultsInAppServicesEnabled, previewMode);
      if ((allAirlineCompanies?.length ?? 0) === 0) {
        this.logger.debug(`(FlightsLogic) no airline companies found, returning empty list, cityId=${city.id}, previewMode=${previewMode}`);
        return [];
      }

      let companiesWithDistance = allAirlineCompanies.map((c) => { return { company: c, distance: calculateDistanceKm(c.city.geo, city.geo) }; });
      companiesWithDistance = orderBy(companiesWithDistance, ['distance'], ['asc']).slice(0, MaxOfferGenerationRouteCompaniesCount);
      result = companiesWithDistance.map(x => x.company);
      await this.cache.setItem(cacheKey, result);
    }

    this.logger.debug(`(FlightsLogic) nearest companies filtered, cityId=${city.id}, previewMode=${previewMode}, count=${result.length}`);
    return result;
  }

  async generateFlightVariants (date: Date, fromAirport: EntityDataAttrsOnly<IAirport>, toAirport: EntityDataAttrsOnly<IAirport>, previewMode: PreviewMode): Promise<(EntityDataAttrsOnly<IFlight> & { dataHash: string })[]> {
    const result: (EntityDataAttrsOnly<IFlight> & { dataHash: string })[] = [];

    const airlineCompanies = await this.getNearestCompanies(fromAirport.city, previewMode);
    if ((airlineCompanies?.length ?? 0) === 0) {
      this.logger.warn(`(FlightsLogic) cannot generate flight variants, got empty list of airline companies, date=${date}, fromCitySlug=${fromAirport.city.slug}, toCitySlug=${toAirport.city.slug}, previewMode=${previewMode}`);
      throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'airline companies data not found', 'error-stub');
    }

    const allAirplanes = await this.airplaneLogic.getAllAirplanes(CachedResultsInAppServicesEnabled, previewMode);
    if (allAirplanes.length === 0) {
      this.logger.warn(`(FlightsLogic) cannot generate flight variants, got empty list of airplanes, date=${date}, fromCitySlug=${fromAirport.city.slug}, toCitySlug=${toAirport.city.slug}, previewMode=${previewMode}`);
      throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'airplanes data not found', 'error-stub');
    }

    const utcOffsetMinutes = fromAirport.city.utcOffsetMin;

    const fromDateTimeUtc = dayjs(date).add(-utcOffsetMinutes, 'minute').utc().toDate();
    for (let i = 0; i < MaxOfferGenerationRouteFlightsCount; i++) {
      const paramsHash = murmurHash(Buffer.concat([
        Uint8Array.of(date.getTime() / 60000),
        Uint8Array.from(Buffer.from(fromAirport.name.en, 'utf8')),
        Uint8Array.from(Buffer.from(toAirport.name.en, 'utf8')),
        Uint8Array.of(i)]).toString('base64'));

      const airlineCompany = airlineCompanies[paramsHash % airlineCompanies.length];
      const airplane = allAirplanes[paramsHash % allAirplanes.length];

      const departMinutes = (paramsHash % (24 * 60 / FlightTimeOfDayIntervalMinutes)) * FlightTimeOfDayIntervalMinutes;
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
