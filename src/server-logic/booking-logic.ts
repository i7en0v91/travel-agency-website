import type { PrismaClient } from '@prisma/client';
import { type IStaysLogic, type EntityId, type IStayOfferDetails, type IBookingLogic, type IFlightOffer, type IOfferBooking, type IOfferBookingData, type EntityDataAttrsOnly } from '../shared/interfaces';
import { type IAppLogger } from '../shared/applogger';
import { DbVersionInitial } from '../shared/constants';
import { AppException, AppExceptionCodeEnum } from '../shared/exceptions';
import { BookingInfoQuery, MapBooking } from './queries';

export class BookingLogic implements IBookingLogic {
  private logger: IAppLogger;
  private dbRepository: PrismaClient;
  private staysLogic: IStaysLogic;

  public static inject = ['staysLogic', 'dbRepository', 'logger'] as const;
  constructor (staysLogic: IStaysLogic, dbRepository: PrismaClient, logger: IAppLogger) {
    this.logger = logger;
    this.dbRepository = dbRepository;
    this.staysLogic = staysLogic;
  }

  async createBooking (data: IOfferBookingData): Promise<EntityId> {
    this.logger.verbose(`(BookingLogic) create booking, offerId=${data.offerId}, kind=${data.kind}, userId=${data.bookedUserId}`);

    const entityId = await this.dbRepository.$transaction(async () => {
      let userOfferId: EntityId | undefined;
      this.logger.debug(`(BookingLogic) checking user offer record, offerId=${data.offerId}, kind=${data.kind}, userId=${data.bookedUserId}`);
      if (data.kind === 'flights') {
        userOfferId = (await this.dbRepository.userFlightOffer.findFirst({
          where: {
            isDeleted: false,
            offerId: data.offerId,
            userId: data.bookedUserId
          },
          select: {
            id: true
          }
        }))?.id;

        if (!userOfferId) {
          this.logger.debug(`(BookingLogic) user offer record doesn't exist, creating, offerId=${data.offerId}, kind=${data.kind}, userId=${data.bookedUserId}`);
          userOfferId = (await this.dbRepository.userFlightOffer.create({
            data: {
              offer: {
                connect: { id: data.offerId }
              },
              user: {
                connect: {
                  id: data.bookedUserId
                }
              },
              isFavourite: false,
              version: DbVersionInitial
            },
            select: {
              id: true
            }
          })).id;
        }
      } else {
        userOfferId = (await this.dbRepository.userStayOffer.findFirst({
          where: {
            isDeleted: false,
            offerId: data.offerId,
            userId: data.bookedUserId
          },
          select: {
            id: true
          }
        }))?.id;

        if (!userOfferId) {
          this.logger.debug(`(BookingLogic) user offer record doesn't exist, creating, offerId=${data.offerId}, kind=${data.kind}, userId=${data.bookedUserId}`);
          userOfferId = (await this.dbRepository.userStayOffer.create({
            data: {
              offer: {
                connect: { id: data.offerId }
              },
              user: {
                connect: {
                  id: data.bookedUserId
                }
              },
              isFavourite: false,
              version: DbVersionInitial
            },
            select: {
              id: true
            }
          })).id;
        }
      }

      this.logger.debug(`(BookingLogic) creating booking record, offerId=${data.offerId}, kind=${data.kind}, userId=${data.bookedUserId}, userOfferId=${userOfferId}`);
      return (await this.dbRepository.booking.create({
        data: {
          flightOffer: data.kind === 'flights' ? { connect: { id: userOfferId } } : undefined,
          stayOffer: data.kind === 'stays' ? { connect: { id: userOfferId } } : undefined,
          user: {
            connect: {
              id: data.bookedUserId
            }
          },
          serviceLevel: data.serviceLevel,
          version: DbVersionInitial
        },
        select: {
          id: true
        }
      })).id;
    });

    this.logger.verbose(`(BookingLogic) booking created, id=${entityId}`);
    return entityId;
  }

  async getBooking (id: EntityId): Promise<IOfferBooking<IFlightOffer | IStayOfferDetails>> {
    this.logger.verbose(`(BookingLogic) get booking, id=${id}`);
    const entity = await this.dbRepository.booking.findUnique({
      where: {
        isDeleted: false,
        id
      },
      select: BookingInfoQuery.select
    });
    if (!entity) {
      this.logger.warn(`(BookingLogic) booking not found, id=${id}`);
      throw new AppException(AppExceptionCodeEnum.OBJECT_NOT_FOUND, 'booking not found', 'error-page');
    }

    const result = MapBooking(entity);
    if (result.offer.kind === 'stays') {
      this.logger.debug(`(BookingLogic) filling prices for stay offer details, bookingId=${id}, offerId=${result.offer.id}`);
      let stayOffer = result.offer as EntityDataAttrsOnly<IStayOfferDetails>;
      stayOffer = {
        ...result.offer,
        prices: {
          base: this.staysLogic.calculatePrice(stayOffer.stay, 'base'),
          'cityView-1': this.staysLogic.calculatePrice(stayOffer.stay, 'cityView-1'),
          'cityView-2': this.staysLogic.calculatePrice(stayOffer.stay, 'cityView-2'),
          'cityView-3': this.staysLogic.calculatePrice(stayOffer.stay, 'cityView-3')
        }
      } as any;
      result.offer = stayOffer;
    }

    this.logger.verbose(`(BookingLogic) booking found, id=${id}, offerId=${result.offer.id}, bookedUserId=${result.bookedUser.id}`);
    return result;
  }
}
