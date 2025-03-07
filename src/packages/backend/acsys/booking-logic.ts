import type { IOfferBookingData, IAppLogger, EntityId, IStayOfferDetails, IFlightOffer, IOfferBooking } from '@golobe-demo/shared';
import type { IBookingLogic } from './../types';

export class BookingLogic implements IBookingLogic {
  private readonly logger: IAppLogger;
  private readonly prismaImplementation: IBookingLogic;

  public static inject = ['bookingLogicPrisma', 'logger'] as const;
  constructor (prismaImplementation: IBookingLogic, logger: IAppLogger) {
    this.logger = logger.addContextProps({ component: 'BookingLogic-Acsys' });
    this.prismaImplementation = prismaImplementation;
  }

  async deleteBooking(id: EntityId): Promise<void> {
    this.logger.debug('deleting booking', id);
    await this.prismaImplementation.deleteBooking(id);
    this.logger.debug('booking deleted', id);
  };

  async createBooking (data: IOfferBookingData): Promise<EntityId> {
    this.logger.debug('create booking', { offerId: data.offerId, kind: data.kind, userId: data.bookedUserId });
    const entityId = await this.prismaImplementation.createBooking(data);
    this.logger.debug('booking created', { id: entityId });
    return entityId;
  }

  async getBooking (id: EntityId): Promise<IOfferBooking<IFlightOffer | IStayOfferDetails>> {
    this.logger.debug('get booking', id);
    const result = await this.prismaImplementation.getBooking(id);
    this.logger.debug('booking found', { id, offerId: result.offer.id, bookedUserId: result.bookedUser.id });
    return result;
  }
}
