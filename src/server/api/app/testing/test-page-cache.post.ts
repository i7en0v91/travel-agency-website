import type { H3Event } from 'h3';
import { defineWebApiEventHandler } from '../../../utils/webapi-event-handler';
import { type EntityId, ImageCategory, type ILocalizableValue } from '../../../../shared/interfaces';
import { type ITestingPageCacheActionDto, type ITestingPageCacheActionResultDto, TestingPageCacheActionDtoSchema, TestingPageCacheActionEnum } from '../../../dto';
import { lookupValueOrThrow } from '../../../../shared/common';
import { AvailableLocaleCodes } from '../../../../shared/constants';
import { AppPage } from '../../../../shared/page-query-params';
import { AppException, AppExceptionCodeEnum } from '../../../../shared/exceptions';
import fromPairs from 'lodash-es/fromPairs';
import type { IAppLogger } from '../../../../shared/applogger';
import type { PrismaClient } from '@prisma/client';
import { getServerSession } from '#auth';

declare type HandlePageActionResult = {
  testId: string | undefined;
};

const NumGeneratedOffersForFlightPages = 5;
const NumGeneratedOffersForStayPages = 100;
const NumGeneratedOffersForBookingPages = 1000;

function getDbRepository(): PrismaClient {
  const client = (globalThis as any).GlobalPrismaClient;
  if(!client) {
    throw new Error('Prisma client is not available');
  }
  return client;
}

function convertLiteralToLocalizeable(value: string): ILocalizableValue {
  return (fromPairs(AvailableLocaleCodes.map(l => [l, value])) as any) as ILocalizableValue;
}

async function handleIndexPageActionRequest(action: TestingPageCacheActionEnum, testId: string | undefined, testToken: string | undefined, logger: IAppLogger, event: H3Event): Promise<HandlePageActionResult> {
  if(action === TestingPageCacheActionEnum.Prepare) {
    // nothing here
    return { testId: undefined };
  } else if(action === TestingPageCacheActionEnum.Change) {
    if(!testToken) {
      logger.warn( `(api:testing:page-action) testToken was not specified, page=index`);
      throw new AppException(AppExceptionCodeEnum.BAD_REQUEST, 'testToken parameter was not specified', 'error-stub');
    }

    const companyReviewsLogic = ServerServicesLocator.getCompanyReviewsLogic();
    const imageLogic = ServerServicesLocator.getImageLogic();
    const companyReviewImages = await imageLogic.getAllImagesByCategory(ImageCategory.CompanyReview, true, event.context.preview.mode);
    const companyReviewImage = companyReviewImages.find(i => !i.slug.includes('test'));
    if(!companyReviewImage) {
      logger.warn( `(api:testing:page-action) cannot find any company review image, need data seeding (empty DB?), page=index`);
      throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'cannot find company review image', 'error-stub');
    }

    const timestamp = new Date().getTime();
    const imageBytes = await imageLogic.getImageBytes(companyReviewImage.id, undefined, ImageCategory.CompanyReview, event, event.context.preview.mode);
    if(!imageBytes) {
      logger.warn( `(api:testing:page-action) cannot obtain company review image bytes, page=index, imageId=${companyReviewImage.id}`);
      throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'cannot load company review image', 'error-stub');
    }

    const image = await imageLogic.createImage({
      bytes: imageBytes.bytes,
      category: ImageCategory.CompanyReview,
      invertForDarkTheme: false,
      mimeType: imageBytes.mimeType,
      slug: `tests-page-cache-clean-companyReview-img-${timestamp}`,
      stubCssStyle: undefined,
      originalName: `tests-page-cache-clean-companyReview-${timestamp}-${companyReviewImage.fileId!}`,
      ownerId: undefined
    }, undefined, event, event.context.preview.mode);
    const imageId = image.id;

    const reviewId = await companyReviewsLogic.createReview({
      body: convertLiteralToLocalizeable(testToken),
      header: convertLiteralToLocalizeable(testToken),
      userName: convertLiteralToLocalizeable(testToken),
      imageId
    }, event.context.preview.mode);

    return {
      testId: reviewId
    };
  } else {
    if(!testId) {
      logger.warn( `(api:testing:page-action) testId was not specified, page=index`);
      throw new AppException(AppExceptionCodeEnum.BAD_REQUEST, 'testId parameter was not specified', 'error-stub');
    }
    const reviewId = testId;

    const companyReviewsLogic = ServerServicesLocator.getCompanyReviewsLogic();
    await companyReviewsLogic.deleteReview(reviewId);
    return {
      testId: reviewId
    };
  }
};

async function handleAuthFormPageActionRequest(page: AppPage, action: TestingPageCacheActionEnum, testId: string | undefined, testToken: string | undefined, logger: IAppLogger, event: H3Event): Promise<HandlePageActionResult> {
  if(action === TestingPageCacheActionEnum.Prepare) {
    // nothing here
    return { testId: undefined };
  } else if(action === TestingPageCacheActionEnum.Change) {
    if(!testToken) {
      logger.warn( `(api:testing:page-action) testToken was not specified, page=${page.valueOf()}`);
      throw new AppException(AppExceptionCodeEnum.BAD_REQUEST, 'testToken parameter was not specified', 'error-stub');
    }

    const authFormImageLogic = ServerServicesLocator.getAuthFormImageLogic();
    const authFormImages = await authFormImageLogic.getAllImages(event, event.context.preview.mode);
    if(!authFormImages.length) {
      logger.warn( `(api:testing:page-action) no auth form images registered in system (db seed needed?), page=${page.valueOf()}`);
      throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'no any auth forms images registered', 'error-stub');
    }

    const imageLogic = ServerServicesLocator.getImageLogic();
    const sampleImageSlug = authFormImages[0].image.slug;
    const imageData = await imageLogic.getImageBytes(undefined, sampleImageSlug, ImageCategory.AuthFormsImage, event, event.context.preview.mode);
    if(!imageData) {
      logger.warn( `(api:testing:page-action) failed to obtain image bytes, page=${page.valueOf()}, slug=${sampleImageSlug}`);
      throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'failed to load image', 'error-stub');
    }

    const imageSlug = `testing-auth-forms-${page.valueOf()}-${testToken}`;
    const authFormImageId = await authFormImageLogic.createImage({ bytes: imageData.bytes, mimeType: imageData.mimeType, slug: imageSlug, originalName: `${imageSlug}.png` }, 998, event, event.context.preview.mode);

    return {
      testId: authFormImageId
    };
  } else {
    if(!testId) {
      logger.warn( `(api:testing:page-action) testId was not specified, page=${page.valueOf()}`);
      throw new AppException(AppExceptionCodeEnum.BAD_REQUEST, 'testId parameter was not specified', 'error-stub');
    }
    const authFormImageId = testId;

    const authFormImageLogic = ServerServicesLocator.getAuthFormImageLogic();
    await authFormImageLogic.deleteImage(authFormImageId);
    return {
      testId: authFormImageId
    };
  }
};

async function handleFlightOfferPageActionRequest(page: AppPage, action: TestingPageCacheActionEnum, testId: string | undefined, testToken: string | undefined, logger: IAppLogger, event: H3Event): Promise<HandlePageActionResult> {
  if(action === TestingPageCacheActionEnum.Prepare) {
    const flightsLogic = ServerServicesLocator.getFlightsLogic();
    const flightOffers = (await flightsLogic.searchOffers({ }, 'guest', { direction: 'asc' }, { direction: 'asc' }, { skip: 0, take: NumGeneratedOffersForFlightPages }, false, false, event.context.preview.mode)).pagedItems;
    if(!flightOffers.length) {
      logger.warn( `(api:testing:page-action) no flight offers found (db seeding needed?), page=${page.valueOf()}`);
      throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'no flight offers found', 'error-stub');
    }

    const flightOffer = flightOffers[flightOffers.length - 1];
    return { testId: flightOffer.id };
  } else if(action === TestingPageCacheActionEnum.Change) {
    if(!testId) {
      logger.warn( `(api:testing:page-action) testId was not specified, page=${page.valueOf()}`);
      throw new AppException(AppExceptionCodeEnum.BAD_REQUEST, 'testId parameter was not specified', 'error-stub');
    }

    if(!testToken) {
      logger.warn( `(api:testing:page-action) testToken was not specified, page=${page.valueOf()}`);
      throw new AppException(AppExceptionCodeEnum.BAD_REQUEST, 'testToken parameter was not specified', 'error-stub');
    }

    const flightsLogic = ServerServicesLocator.getFlightsLogic();
    const dbRepository = getDbRepository();

    const flightOfferId: EntityId = testId;
    const flightOffer = await flightsLogic.getFlightOffer(flightOfferId, 'guest', event.context.preview.mode);
    const airplaneId = flightOffer.departFlight.airplane.id;

    const updated = (await dbRepository.localizeableValue.updateMany({
      where: {
        airplane: {
          id: airplaneId,
          isDeleted: false
        }
      },
      data: {
        version: { increment: 1 },
        ...(fromPairs(AvailableLocaleCodes.map(l => [l, `Airplane ${testToken}`])))
      }
    })).count > 0;
    if(!updated) {
      logger.warn( `(api:testing:page-action) failed to update airplane name, page=${page.valueOf()}, flightOfferId=${flightOfferId}, airplaneId=${airplaneId}`);
      throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'failed to update airplane name', 'error-stub');
    }

    return {
      testId
    };
  } else {
    return {
      testId
    };
  }
};

async function handleStayOfferPageActionRequest(page: AppPage, action: TestingPageCacheActionEnum, testId: string | undefined, testToken: string | undefined, logger: IAppLogger, event: H3Event): Promise<HandlePageActionResult> {
  if(action === TestingPageCacheActionEnum.Prepare) {
    const staysLogic = ServerServicesLocator.getStaysLogic();
    const staysOffers = (await staysLogic.searchOffers({ }, 'guest', { direction: 'asc' }, { skip: 0, take: NumGeneratedOffersForStayPages }, false, event.context.preview.mode)).pagedItems;
    if(!staysOffers.length) {
      logger.warn( `(api:testing:page-action) no stay offers found (db seeding needed?), page=${page.valueOf()}`);
      throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'no stay offers found', 'error-stub');
    }

    const stayOffer = staysOffers[staysOffers.length - 1];
    return { testId: stayOffer.id };
  } else if(action === TestingPageCacheActionEnum.Change) {
    if(!testId) {
      logger.warn( `(api:testing:page-action) testId was not specified, page=${page.valueOf()}`);
      throw new AppException(AppExceptionCodeEnum.BAD_REQUEST, 'testId parameter was not specified', 'error-stub');
    }

    if(!testToken) {
      logger.warn( `(api:testing:page-action) testToken was not specified, page=${page.valueOf()}`);
      throw new AppException(AppExceptionCodeEnum.BAD_REQUEST, 'testToken parameter was not specified', 'error-stub');
    }

    const staysLogic = ServerServicesLocator.getStaysLogic();
    const dbRepository = getDbRepository();

    const stayOfferId: EntityId = testId;
    const stayOffer = await staysLogic.getStayOffer(stayOfferId, 'guest', event.context.preview.mode);
    const hotelId = stayOffer.stay.id;

    const updated = (await dbRepository.localizeableValue.updateMany({
      where: {
        hotel: {
          id: hotelId,
          isDeleted: false
        }
      },
      data: {
        version: { increment: 1 },
        ...(fromPairs(AvailableLocaleCodes.map(l => [l, `Hotel ${testToken}`])))
      }
    })).count > 0;
    if(!updated) {
      logger.warn( `(api:testing:page-action) failed to update hotel name, page=${page.valueOf()}, stayOfferId=${stayOfferId}, hotelId=${hotelId}`);
      throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'failed to update hotel name', 'error-stub');
    }

    return {
      testId
    };
  } else {
    return {
      testId
    };
  }
};

async function handleFlightsOrStaysPageActionRequest(page: AppPage, action: TestingPageCacheActionEnum, testId: string | undefined, testToken: string | undefined, logger: IAppLogger, event: H3Event): Promise<HandlePageActionResult> {
  if(action === TestingPageCacheActionEnum.Prepare) {
    // nothing here
    return { testId: undefined };
  } else if(action === TestingPageCacheActionEnum.Change) {
    if(!testToken) {
      logger.warn( `(api:testing:page-action) testToken was not specified, page=${page.valueOf()}`);
      throw new AppException(AppExceptionCodeEnum.BAD_REQUEST, 'testToken parameter was not specified', 'error-stub');
    }

    const citiesLogic = ServerServicesLocator.getCitiesLogic();
    const popularCities = await citiesLogic.getPopularCities(event.context.preview.mode);
    if(!popularCities.length) {
      logger.warn( `(api:testing:page-action) no popular cities registered in system (db seed needed?), page=${page.valueOf()}`);
      throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'no any popular cities registered', 'error-stub');
    }

    const popularCityInfo = popularCities[0];
    const cityId = popularCityInfo.id;

    const dbRepository = getDbRepository();
    const updated = (await dbRepository.localizeableValue.updateMany({
      where: {
        city: {
          id: cityId,
          isDeleted: false
        }
      },
      data: {
        version: { increment: 1 },
        ...(fromPairs(AvailableLocaleCodes.map(l => [l, `City ${testToken}`])))
      }
    })).count > 0;
    if(!updated) {
      logger.warn( `(api:testing:page-action) failed to update popular city name, page=${page.valueOf()}, cityId=${cityId}, citySlug=${popularCityInfo.slug}`);
      throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'failed to update popular city name', 'error-stub');
    }

    return {
      testId: cityId
    };
  } else {
    return {
      testId
    };
  }
};

async function handleBookingPageActionRequest(action: TestingPageCacheActionEnum, testId: string | undefined, testToken: string | undefined, logger: IAppLogger, event: H3Event): Promise<HandlePageActionResult> {
  const authSession = await getServerSession(event);
  const userId = extractUserIdFromSession(authSession);
  if(!userId) {
    logger.warn(`(api:testing:page-action) failed to extract userId from session, page=${AppPage.BookingDetails.valueOf()}`);
    throw new AppException(
      AppExceptionCodeEnum.UNAUTHENTICATED,
      'failed to obtain userId',
      'error-page'
    );
  }

  if(action === TestingPageCacheActionEnum.Prepare) {
    const flightsLogic = ServerServicesLocator.getFlightsLogic();
    const flightOffers = (await flightsLogic.searchOffers({ tripType: 'return' }, 'guest', { direction: 'asc' }, { direction: 'asc' }, { skip: 0, take: NumGeneratedOffersForBookingPages }, false, false, event.context.preview.mode)).pagedItems;
    if(!flightOffers.length) {
      logger.warn( `(api:testing:page-action) no flight offers found (db seeding needed?), page=${AppPage.BookingDetails.valueOf()}`);
      throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'no flight offers found', 'error-stub');
    }

    const flightOffer = flightOffers[flightOffers.length - 1];

    const bookingLogic = ServerServicesLocator.getBookingLogic();
    const bookingId = await bookingLogic.createBooking({
      bookedUserId: userId,
      kind: 'flights',
      offerId: flightOffer.id
    });

    return { testId: bookingId };
  } else if(action === TestingPageCacheActionEnum.Change) {
    if(!testId) {
      logger.warn( `(api:testing:page-action) testId was not specified, page=${AppPage.BookingDetails.valueOf()}`);
      throw new AppException(AppExceptionCodeEnum.BAD_REQUEST, 'testId parameter was not specified', 'error-stub');
    }

    if(!testToken) {
      logger.warn( `(api:testing:page-action) testToken was not specified, page=${AppPage.BookingDetails.valueOf()}`);
      throw new AppException(AppExceptionCodeEnum.BAD_REQUEST, 'testToken parameter was not specified', 'error-stub');
    }

    const bookingId: EntityId = testId;
    const bookingLogic = ServerServicesLocator.getBookingLogic();
    const flightOfferId: EntityId = (await bookingLogic.getBooking(bookingId)).offer.id;

    const flightsLogic = ServerServicesLocator.getFlightsLogic();
    const dbRepository = getDbRepository();

    const flightOffer = await flightsLogic.getFlightOffer(flightOfferId, userId, event.context.preview.mode);
    const departCityId = flightOffer.departFlight.departAirport.city.id;

    const updated = (await dbRepository.localizeableValue.updateMany({
      where: {
        city: {
          id: departCityId,
          isDeleted: false
        }
      },
      data: {
        version: { increment: 1 },
        ...(fromPairs(AvailableLocaleCodes.map(l => [l, `City ${testToken}`])))
      }
    })).count > 0;
    if(!updated) {
      logger.warn( `(api:testing:page-action) failed to update depart city name, page=${AppPage.BookingDetails.valueOf()}, flightOfferId=${flightOfferId}, bookingId=${bookingId}`);
      throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'failed to update depart city name', 'error-stub');
    }

    return {
      testId
    };
  } else {
    return {
      testId
    };
  }
};


export default defineWebApiEventHandler(async (event : H3Event) => {
  const logger = ServerServicesLocator.getLogger();
  
  logger.debug('(api:testing:page-action) parsing page action request from HTTP body');
  const pageActionDto: ITestingPageCacheActionDto = TestingPageCacheActionDtoSchema.cast(await readBody(event));

  const page = pageActionDto.page === 'index' ? AppPage.Index : (lookupValueOrThrow(AppPage, pageActionDto.page) as AppPage);
  const pageAction = lookupValueOrThrow(TestingPageCacheActionEnum, pageActionDto.action) as TestingPageCacheActionEnum;
  let handleActionResult: HandlePageActionResult;
  logger.debug(`(api:testing:page-action) performing page action: page=${page.valueOf()}, action=${pageAction.valueOf()}, testId=${pageActionDto.testId ?? ''}, testToken=${pageActionDto.testToken ?? ''}`);
  switch(page) {
    case AppPage.Index:
      handleActionResult = await handleIndexPageActionRequest(pageAction, pageActionDto.testId, pageActionDto.testToken, logger, event);
      break;
    case AppPage.Login:
    case AppPage.ForgotPassword:
    case AppPage.ForgotPasswordComplete:
    case AppPage.ForgotPasswordSet:
    case AppPage.ForgotPasswordVerify:
    case AppPage.Signup:
    case AppPage.SignupComplete: 
    case AppPage.SignupVerify:
    case AppPage.EmailVerifyComplete:
      handleActionResult = await handleAuthFormPageActionRequest(page, pageAction, pageActionDto.testId, pageActionDto.testToken, logger, event);
      break;
    case AppPage.FlightDetails:
    case AppPage.BookFlight:
      handleActionResult = await handleFlightOfferPageActionRequest(page, pageAction, pageActionDto.testId, pageActionDto.testToken, logger, event);
      break;
    case AppPage.StayDetails:
    case AppPage.BookStay:
      handleActionResult = await handleStayOfferPageActionRequest(page, pageAction, pageActionDto.testId, pageActionDto.testToken, logger, event);
      break;
    case AppPage.Flights:
    case AppPage.Stays:
      handleActionResult = await handleFlightsOrStaysPageActionRequest(page, pageAction, pageActionDto.testId, pageActionDto.testToken, logger, event);
      break;
    case AppPage.BookingDetails:
      handleActionResult = await handleBookingPageActionRequest(pageAction, pageActionDto.testId, pageActionDto.testToken, logger, event);
      break;
    default:
      logger.warn(`(api:testing:page-action) unexpected page=${page.valueOf()}`);
      throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'not implemented', 'error-stub');
  }
  logger.debug(`(api:testing:page-action) page action performed: page=${page.valueOf()}, action=${pageAction.valueOf()}, testId=${pageActionDto.testId ?? ''}, testToken=${pageActionDto.testToken ?? ''}, result=${JSON.stringify(handleActionResult.testId)}`);
  
  handleCacheHeaders(event, {
    cacheControls: ['no-cache'],
    maxAge: 0
  });
  setHeader(event, 'content-type', 'application/json');
  event.node.res.statusCode = 200;

  const result: ITestingPageCacheActionResultDto = {
    testId: handleActionResult.testId
  };
  return result;
}, { logResponseBody: true, authorizedOnly: false, validationSchema: TestingPageCacheActionDtoSchema, allowedEnvironments: ['test'] });