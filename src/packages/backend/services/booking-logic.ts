import { type IOfferBookingData, AppException, AppExceptionCodeEnum, DbVersionInitial, newUniqueId, type IAppLogger, type EntityId, type IStayOfferDetails, type IFlightOffer, type IOfferBooking, type EntityDataAttrsOnly } from '@golobe-demo/shared';
import type { IStaysLogic, IBookingLogic } from './../types';
import type { PrismaClient } from '@prisma/client';
import { BookingInfoQuery, MapBooking } from './queries';
import { executeInTransaction } from './../helpers/db';

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

  async deleteBooking(id: EntityId): Promise<void> {
    this.logger.verbose(`(BookingLogic) deleting booking: id=${id}`);
    await executeInTransaction(async () => {
      await this.dbRepository.userStayOffer.updateMany({
        where: {
          booking: {
            id,
          },
          isFavourite: false,
          isDeleted: false
        },
        data: {
          isDeleted: true,
          version: { increment: 1 }
        }
      });
      await this.dbRepository.userFlightOffer.updateMany({
        where: {
          booking: {
            id
          },
          isFavourite: false,
          isDeleted: false
        },
        data: {
          isDeleted: true,
          version: { increment: 1 }
        }
      });
      await this.dbRepository.booking.update({
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
    
    this.logger.verbose(`(BookingLogic) booking deleted: id=${id}`);
  };

  async createBooking (data: IOfferBookingData): Promise<EntityId> {
    this.logger.verbose(`(BookingLogic) create booking, offerId=${data.offerId}, kind=${data.kind}, userId=${data.bookedUserId}`);

    const entityId = await executeInTransaction(async () => {
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
              id: newUniqueId(),
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
              id: newUniqueId(),
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
          id: newUniqueId(),
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
    }, this.dbRepository);

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
          Base: this.staysLogic.calculatePrice(stayOffer.stay, 'Base'),
          CityView1: this.staysLogic.calculatePrice(stayOffer.stay, 'CityView1'),
          CityView2: this.staysLogic.calculatePrice(stayOffer.stay, 'CityView2'),
          CityView3: this.staysLogic.calculatePrice(stayOffer.stay, 'CityView3')
        }
      } as any;
      result.offer = stayOffer;
    }

    this.logger.verbose(`(BookingLogic) booking found, id=${id}, offerId=${result.offer.id}, bookedUserId=${result.bookedUser.id}`);
    return result;
  }
}
