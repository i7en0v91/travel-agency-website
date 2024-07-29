import { type IAppLogger, type EntityId, type IStayOfferDetails, type IBookingLogic, type IFlightOffer, type IOfferBooking, type IOfferBookingData } from './../../backend/app-facade/interfaces';

export class BookingLogic implements IBookingLogic {
  private readonly logger: IAppLogger;
  private readonly prismaImplementation: IBookingLogic;

  public static inject = ['bookingLogicPrisma', 'logger'] as const;
  constructor (prismaImplementation: IBookingLogic, logger: IAppLogger) {
    this.logger = logger;
    this.prismaImplementation = prismaImplementation;
  }

  async deleteBooking(id: EntityId): Promise<void> {
    this.logger.debug(`(BookingLogic-Acsys) deleting booking: id=${id}`);
    await this.prismaImplementation.deleteBooking(id);
    this.logger.debug(`(BookingLogic-Acsys) booking deleted: id=${id}`);
  };

  async createBooking (data: IOfferBookingData): Promise<EntityId> {
    this.logger.debug(`(BookingLogic-Acsys) create booking, offerId=${data.offerId}, kind=${data.kind}, userId=${data.bookedUserId}`);
    const entityId = await this.prismaImplementation.createBooking(data);
    this.logger.debug(`(BookingLogic-Acsys) booking created, id=${entityId}`);
    return entityId;
  }

  async getBooking (id: EntityId): Promise<IOfferBooking<IFlightOffer | IStayOfferDetails>> {
    this.logger.debug(`(BookingLogic-Acsys) get booking, id=${id}`);
    const result = await this.prismaImplementation.getBooking(id);
    this.logger.debug(`(BookingLogic-Acsys) booking found, id=${id}, offerId=${result.offer.id}, bookedUserId=${result.bookedUser.id}`);
    return result;
  }
}
