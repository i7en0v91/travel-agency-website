<script setup lang="ts">
import { getPagePath, type IUserProfileInfo, type ReviewSummary, type OfferKind, QueryInternalRequestParam, isElectronBuild, type BookingPageArgs, AppException, AppExceptionCodeEnum, clampTextLine, getLocalizeableValue, getValueForFlightDurationFormatting, getValueForFlightDayFormatting, getValueForTimeOfDayFormatting, extractAirportCode, ImageCategory, type ICity, type EntityDataAttrsOnly, type ILocalizableValue, type IFlightOffer, type IStayOfferDetails, type EntityId, getI18nResName2, getI18nResName3, AppPage, type Locale, AvailableLocaleCodes, DefaultTheme, type IOfferBooking, type IAppLogger } from '@golobe-demo/shared';
import type { ControlKey } from './../../helpers/components';
import type { H3Event } from 'h3';
import fromPairs from 'lodash-es/fromPairs';
import type { IBookingTicketFlightGfxProps, IBookingTicketStayTitleProps, IBookingTicketProps } from './../../types';
import { ApiEndpointStayOfferDetails, ApiEndpointBookingDetails, ApiEndpointFlightOfferDetails, ApiEndpointStayOfferReviewSummary } from './../../server/api-definitions';
import { getObject } from './../../helpers/rest-utils';
import { LOADING_STATE } from './../../helpers/constants';
import BookingTicket from './../../components/booking-ticket/booking-ticket.vue';
import ComponentWaitingIndicator from '../../components/forms/component-waiting-indicator.vue';
import TermsOfUse from './../../components/booking-page/terms-of-use.vue';
import { mapBookingDetails, mapFlightOfferDetails, mapStayOfferDetails, mapReviewSummary } from './../../helpers/entity-mappers';
import type { IFlightOfferDetailsDto, IStayOfferDetailsDto, IBookingDetailsDto, IReviewSummaryDto } from '../../server/api-definitions';
import type ModalWaitingIndicator from '../../components/forms/modal-waiting-indicator.vue';
import { useDocumentDownloader, type IDocumentDownloader } from './../../composables/document-downloader';
import { useNavLinkBuilder } from './../../composables/nav-link-builder';
import { getCommonServices, getServerServices } from '../../helpers/service-accessors';
import { useModalWaiter, type IModalWaiter } from '../../composables/modal-waiter';
import { LocatorClasses } from '../../helpers/constants';

definePageMeta({
  title: { resName: getI18nResName2('bookingPage', 'pageTitle'), resArgs: undefined }
});

const CtrlKey: ControlKey = ['Page', 'BookingDetails'];

const DisplayedUserNameMaxLength = 25;

const { t, d, locale } = useI18n();
const navLinkBuilder = useNavLinkBuilder();

const route = useRoute();
const nuxtApp = useNuxtApp();
const { enabled } = usePreviewState();
const { status, data } = useAuth();

const bookingParam = route.params?.id?.toString() ?? '';
if (bookingParam.length === 0) {
  await navigateTo(navLinkBuilder.buildPageLink(AppPage.Index, locale.value as Locale));
}
const bookingId: EntityId = bookingParam;
const logger = getCommonServices().getLogger().addContextProps({ component: 'Booking', bookingId });

const reqEvent = import.meta.server ? useRequestEvent()! : undefined;
const isDownloadFromElectron = import.meta.client && isElectronBuild() && (route.query ?? {})[QueryInternalRequestParam] === '1';

const userAccountStore = useUserAccountStore();

const isError = ref(false);
const isFetchError = computed(() => import.meta.client && 
  bookingFetch.status.value === 'error' ||
  flightOfferFetch.status.value === 'error' ||
  stayOfferFetch.status.value === 'error' ||
  stayReviewsFetch.status.value === 'error'
);
const theme = useThemeSettings();

const modalWaiterRef = useTemplateRef('modal-waiter');
const modalWaiterOpen = ref<boolean>(false);
let modalWaiter: IModalWaiter | undefined;
let documentDownloader: IDocumentDownloader | undefined;

const hasAccessToBooking = computed(() => {
  if(import.meta.server) {
    return true;
  }

  return (
    userAccountStore.isAuthenticated && 
    userAccountStore.bookings &&
    userAccountStore.bookings !== LOADING_STATE &&
    userAccountStore.bookings.some(i => i.bookingId === bookingId)
  );
});

const bookingFetch = await useFetch<IBookingDetailsDto>(() => `/${ApiEndpointBookingDetails(bookingId)}`,
  {
    server: false,
    lazy: true,
    cache: 'no-store',
    dedupe: 'cancel',
    watch: false,
    immediate: true,
    $fetch: nuxtApp.$fetchEx({ defautAppExceptionAppearance: 'error-stub' })
  });
const bookingDetailsDto = computed(() => {
  return bookingFetch.status.value === 'success' ? bookingFetch.data.value : undefined;
});

const flightOfferFetch = useFetch<IFlightOfferDetailsDto>(() => `/${ApiEndpointFlightOfferDetails(bookingDetailsDto.value?.flightOffer?.id ?? '')}`,
  {
    server: false,
    lazy: true,
    cache: 'default',
    dedupe: 'defer',
    query: { drafts: enabled },
    watch: false,
    immediate: false,
    $fetch: nuxtApp.$fetchEx({ defautAppExceptionAppearance: 'error-stub' })
  });

const stayOfferFetch = useFetch(() => `/${ApiEndpointStayOfferDetails(bookingDetailsDto.value?.stayOffer?.id ?? '')}`,
  {
    server: false,
    lazy: true,
    cache: 'default',
    dedupe: 'defer',
    query: { drafts: enabled },
    watch: false,
    immediate: false,
    $fetch: nuxtApp.$fetchEx({ defautAppExceptionAppearance: 'error-stub' })
  });

const stayReviewsFetch = useFetch<IReviewSummaryDto>(() => `/${ApiEndpointStayOfferReviewSummary(bookingDetailsDto.value?.stayOffer?.id ?? '')}`,
  {
    server: false,
    lazy: true,
    cache: 'default',
    dedupe: 'defer',
    watch: false,
    immediate: false,
    $fetch: nuxtApp.$fetchEx({ defautAppExceptionAppearance: 'error-stub' })
  });

const booking = computed(() => bookingDetailsDto.value ? mapBookingDetails(bookingDetailsDto.value) : undefined);
const offer = computed(() => {
  return (bookingFetch.status.value === 'success' && bookingFetch.data.value!.kind === 'flights') ? 
    ((flightOfferFetch.status.value === 'success' && flightOfferFetch.data.value) ?
      mapFlightOfferDetails(flightOfferFetch.data.value) as EntityDataAttrsOnly<IFlightOffer> :
      undefined
    ) 
    : 
    ((stayOfferFetch.status.value === 'success' && stayOfferFetch.data.value) &&
        (stayReviewsFetch.status.value === 'success' && stayReviewsFetch.data.value)) ?
      mapStayOfferDetails(
        stayOfferFetch.data.value as IStayOfferDetailsDto, 
        mapReviewSummary(stayReviewsFetch!.data.value!)
      ) : undefined;
});

async function fetchStayOfferReviewSummaryOnServer(offerId: EntityId, event: H3Event): Promise<ReviewSummary> {
  logger.debug('sending fetch stay review summary HTTP request', { offerId });

  const resultDto = await getObject<IReviewSummaryDto>(`/${ApiEndpointStayOfferReviewSummary(offerId)}`, undefined, 'no-cache', false, event, 'throw');
  if (!resultDto) {
    logger.warn('exception occured while sending fetch stay review summary HTTP request', undefined, { offerId });
    throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'unexpected HTTP request error', 'error-stub');
  }
  const result = mapReviewSummary(resultDto);

  logger.debug('fetch stay review summary HTTP request completed', { offerId, result });
  return result;
}

async function fetchOfferOnServer<TOffer extends IFlightOffer | IStayOfferDetails> (
  offerId: EntityId, 
  kind: OfferKind, 
  event: H3Event
): Promise<EntityDataAttrsOnly<TOffer>> {
  logger.debug('sending fetch offer HTTP request', { offerId, kind });

  const url = kind === 'flights' ? `/${ApiEndpointFlightOfferDetails(offerId)}` : `/${ApiEndpointStayOfferDetails(offerId)}`;
  const resultDto = await getObject(url, undefined, 'no-cache', false, undefined, 'default');
  if (!resultDto) {
    logger.warn('exception occured while sending get HTTP request', undefined, { offerId, kind });
    throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'unexpected HTTP request error', 'error-stub');
  }
  
  let reviewSummary: ReviewSummary | undefined;
  if(kind === 'stays') {
    reviewSummary = await fetchStayOfferReviewSummaryOnServer(offerId, event);
  }

  const result = kind === 'flights'
    ? mapFlightOfferDetails(resultDto as IFlightOfferDetailsDto) as EntityDataAttrsOnly<IFlightOffer>
    : mapStayOfferDetails(resultDto as IStayOfferDetailsDto, reviewSummary!) as EntityDataAttrsOnly<IStayOfferDetails>;

  logger.debug('fetch offer HTTP request completed', { offerId, kind, result });
  return (result as any) as EntityDataAttrsOnly<TOffer>;
}

async function fetchBookingOnServer (bookingId: EntityId, logger: IAppLogger): Promise<EntityDataAttrsOnly<IOfferBooking<IFlightOffer | IStayOfferDetails>>> {
  logger.debug('obtaining booking data', { bookingId });
  const bookingLogic = getServerServices()!.getBookingLogic();
  const booking = await bookingLogic.getBooking(bookingId);

  const isOgImageRequest = !!reqEvent!.context.ogImageContext;
  const bookingOgImageQueryInfo = (reqEvent!.context.cacheablePageParams as any) as BookingPageArgs;
  const isInternalRequest = bookingOgImageQueryInfo?.i === '1';
  if(!isInternalRequest && !isOgImageRequest) {
    const userId = (data.value as any)?.id as EntityId;
    if (!userId || (booking.userId !== userId)) {
      logger.warn('cannot obtain complete booking info - access is forbidden', undefined, { userId, bookingUserId: booking.userId  });
      throw new AppException(
        AppExceptionCodeEnum.FORBIDDEN,
        'access to the booking is forbidden',
        'error-page'
      );
    }
  }

  logger.verbose('booking data obtained', { bookingId, result: booking });
  return booking;
}

// KB: for simplicity rendering ticket images for PDF documents has been implemented via OgImage module - obtaining personal information bypassing user account store
const bookingOnServer = import.meta.server ? (await fetchBookingOnServer(bookingId, logger)) : undefined;
const offerOnServer = import.meta.server ? (await fetchOfferOnServer(bookingOnServer!.offer.id, bookingOnServer!.offer.kind, reqEvent!)) : undefined;
let userInfoOnServer: IUserProfileInfo | undefined;
if(import.meta.server) {
  userInfoOnServer = await getServerServices()!.getUserLogic().getUser(bookingOnServer!.userId, 'profile', reqEvent!);
  if(!userInfoOnServer) {
    logger.error('booking user not found', { bookingId: bookingOnServer?.id, userId: bookingOnServer?.userId });
    throw new AppException(AppExceptionCodeEnum.OBJECT_NOT_FOUND, 'user not found', 'error-page');
  }
}

const userName = computed(() => {
  if(import.meta.client && !booking.value) {
    return undefined;
  }
  const firstName = import.meta.server ? userInfoOnServer!.firstName : (userAccountStore.name && userAccountStore.name !== LOADING_STATE ? userAccountStore.name.firstName : undefined);
  const lastName = import.meta.server ? userInfoOnServer!.lastName : (userAccountStore.name && userAccountStore.name !== LOADING_STATE ? userAccountStore.name.lastName : undefined);
  return `${clampTextLine(`${firstName ?? ''}`, DisplayedUserNameMaxLength)} ${(lastName ?? '').length > 0 ? `${lastName!.substring(0, 1).toUpperCase()}.` : ''}`;
});
const displayedPrice = computed(() => {
  const offerData = import.meta.server ? offerOnServer : offer.value;
  const bookingData = import.meta.server ? bookingOnServer : booking.value;
  if(!offerData) {
    return undefined;
  }
  
  return offerData.kind === 'flights' ? 
    offerData.totalPrice : 
    (
      bookingData ? 
      (offerData as EntityDataAttrsOnly<IStayOfferDetails>).prices[bookingData.serviceLevel!] : 
        undefined
    );
});
const ticketProps = computed<IBookingTicketProps>(() => {
  const offerData = import.meta.server ? offerOnServer : offer.value;
  const bookingData = import.meta.server ? bookingOnServer : booking.value;
  const avatar = import.meta.server ? 
    userInfoOnServer?.avatar : 
    ((userAccountStore.avatar && userAccountStore.avatar !== LOADING_STATE) ? userAccountStore.avatar : null);
  return (offerData && bookingData)
  ? ({
      ctrlKey: [...CtrlKey, 'Ticket'] as ControlKey,
      generalInfo: {
        ctrlKey: [...CtrlKey, 'Ticket', 'General'] as ControlKey,
        avatar,
        texting: {
          name: userName.value!,
          sub: offerData.kind === 'flights' ? getI18nResName2('ticket', 'boardingPass') : null
        },
        classResName: getI18nResName3('ticket', 'class', (offerData.kind === 'flights' ? (offerData as EntityDataAttrsOnly<IFlightOffer>).class : (bookingData.serviceLevel! === 'Base' ? 'base' : 'city')))
      },
      dates: {
        ctrlKey: [...CtrlKey, 'Ticket', 'Dates'] as ControlKey,
        from: {
          ctrlKey: [...CtrlKey, 'Ticket', 'Dates', 'From'],
          label: offerData.kind === 'flights' ? d(getValueForTimeOfDayFormatting((offerData as EntityDataAttrsOnly<IFlightOffer>).departFlight.departTimeUtc, (offerData as EntityDataAttrsOnly<IFlightOffer>).departFlight.departAirport.city.utcOffsetMin), 'daytime') : d((offerData as EntityDataAttrsOnly<IStayOfferDetails>).checkIn, 'day'),
          sub: offerData.kind === 'flights' ? getLocalizableAirportText((offerData as EntityDataAttrsOnly<IFlightOffer>).departFlight.departAirport.city) : getI18nResName2('ticket', 'checkIn')
        },
        to: {
          ctrlKey: [...CtrlKey, 'Ticket', 'Dates', 'To'] as ControlKey,
          label: offerData.kind === 'flights' ? d(getValueForTimeOfDayFormatting((offerData as EntityDataAttrsOnly<IFlightOffer>).departFlight.arriveTimeUtc, (offerData as EntityDataAttrsOnly<IFlightOffer>).departFlight.departAirport.city.utcOffsetMin), 'daytime') : d((offerData as EntityDataAttrsOnly<IStayOfferDetails>).checkOut, 'day'),
          sub: offerData.kind === 'flights' ? getLocalizableAirportText((offerData as EntityDataAttrsOnly<IFlightOffer>).departFlight.arriveAirport.city) : getI18nResName2('ticket', 'checkOut')
        }
      },
      details: {
        ctrlKey: [...CtrlKey, 'Ticket', 'Details'] as ControlKey,
        items: offerData.kind === 'flights'
          ? ([
              { ctrlKey: [...CtrlKey, 'Ticket', 'Details', 'Dates'] as ControlKey, caption: getI18nResName3('ticket', 'details', 'date'), icon: 'i-heroicons-calendar-days-20-solid', text: d(getValueForFlightDayFormatting((offerData as EntityDataAttrsOnly<IFlightOffer>).departFlight.departTimeUtc, (offerData as EntityDataAttrsOnly<IFlightOffer>).departFlight.departAirport.city.utcOffsetMin), 'day') },
              { ctrlKey: [...CtrlKey, 'Ticket', 'Details', 'Duration'] as ControlKey, caption: getI18nResName3('ticket', 'details', 'duration'), icon: 'i-ion-stopwatch', text: t(getI18nResName2('searchFlights', 'flightDuration'), getValueForFlightDurationFormatting((offerData as EntityDataAttrsOnly<IFlightOffer>).departFlight.departTimeUtc, (offerData as EntityDataAttrsOnly<IFlightOffer>).departFlight.arriveTimeUtc)) },
              { ctrlKey: [...CtrlKey, 'Ticket', 'Details', 'Gate'] as ControlKey, caption: getI18nResName3('ticket', 'details', 'gate'), icon: 'i-material-symbols-door-front', text: 'A12' },
              { ctrlKey: [...CtrlKey, 'Ticket', 'Details', 'Seat'] as ControlKey, caption: getI18nResName3('ticket', 'details', 'seat'), icon: 'i-material-symbols-airline-seat-recline-extra', text: '128' }
            ])
          : ([
              { ctrlKey: [...CtrlKey, 'Ticket', 'Details', 'CheckIn'] as ControlKey, caption: getI18nResName3('ticket', 'details', 'checkInTime'), icon: 'i-ion-stopwatch', text: d(new Date(2000, 1, 1, 12, 0, 0, 0), 'daytime') },
              { ctrlKey: [...CtrlKey, 'Ticket', 'Details', 'CheckOut'] as ControlKey, caption: getI18nResName3('ticket', 'details', 'checkOutTime'), icon: 'i-ion-stopwatch', text: d(new Date(2000, 1, 1, 12, 0, 0, 0), 'daytime') },
              { ctrlKey: [...CtrlKey, 'Ticket', 'Details', 'Room'] as ControlKey, caption: getI18nResName3('ticket', 'details', 'room'), icon: 'i-material-symbols-door-front', text: t(getI18nResName3('ticket', 'details', 'onArrival')) }
            ])
      },
      titleOrGfx: offerData.kind === 'flights'
        ? ({
            ctrlKey: [...CtrlKey, 'Ticket', 'Details', 'FlightGfx']  as ControlKey,
            userName: userName.value!
          } as IBookingTicketFlightGfxProps)
        : ({
            ctrlKey: [...CtrlKey, 'Ticket', 'Details', 'Title']  as ControlKey,
            cityName: (offerData as EntityDataAttrsOnly<IStayOfferDetails>).stay.city.name,
            stayName: (offerData as EntityDataAttrsOnly<IStayOfferDetails>).stay.name
          } as IBookingTicketStayTitleProps),
      offerKind: offerData.kind
    })
  : { ctrlKey: [...CtrlKey, 'Ticket']  as ControlKey };
 });

const ticketReturnFlightProps = computed<IBookingTicketProps | undefined>(() => {
  const offerData = import.meta.server ? offerOnServer : offer.value;
  const avatar = import.meta.server ? 
    userInfoOnServer?.avatar : 
    ((userAccountStore.avatar && userAccountStore.avatar !== LOADING_STATE) ? userAccountStore.avatar : null);
  return (offerData && offerData.kind === 'flights' && !!(offerData as EntityDataAttrsOnly<IFlightOffer>).arriveFlight) ? 
    ({
      ctrlKey: [...CtrlKey, 'Ticket', 'ReturnFlight'],
      generalInfo: {
        ctrlKey: [...CtrlKey, 'Ticket', 'ReturnFlight', 'General'],
        avatar,
        texting: {
          name: userName.value!,
          sub: getI18nResName2('ticket', 'boardingPass')
        },
        classResName: getI18nResName3('ticket', 'class', (offerData as EntityDataAttrsOnly<IFlightOffer>).class)
      },
      dates: {
        ctrlKey: [...CtrlKey, 'Ticket', 'ReturnFlight', 'Dates'],
        from: {
          ctrlKey: [...CtrlKey, 'Ticket', 'ReturnFlight', 'Dates', 'From'],
          label: d(getValueForTimeOfDayFormatting((offerData as EntityDataAttrsOnly<IFlightOffer>).arriveFlight!.departTimeUtc, (offerData as EntityDataAttrsOnly<IFlightOffer>).arriveFlight!.departAirport.city.utcOffsetMin), 'daytime'),
          sub: getLocalizableAirportText((offerData as EntityDataAttrsOnly<IFlightOffer>).arriveFlight!.departAirport.city)
        },
        to: {
          ctrlKey: [...CtrlKey, 'Ticket', 'ReturnFlight', 'Dates', 'To'],
          label: d(getValueForTimeOfDayFormatting((offerData as EntityDataAttrsOnly<IFlightOffer>).arriveFlight!.arriveTimeUtc, (offerData as EntityDataAttrsOnly<IFlightOffer>).arriveFlight!.departAirport.city.utcOffsetMin), 'daytime'),
          sub: getLocalizableAirportText((offerData as EntityDataAttrsOnly<IFlightOffer>).arriveFlight!.arriveAirport.city)
        }
      },
      details: {
        ctrlKey: [...CtrlKey, 'Ticket', 'ReturnFlight', 'Details'],
        items: ([
          { ctrlKey: [...CtrlKey, 'Ticket', 'ReturnFlight', 'Details', 'Dates'], caption: getI18nResName3('ticket', 'details', 'date'), icon: 'i-heroicons-calendar-days-20-solid', text: d(getValueForFlightDayFormatting((offerData as EntityDataAttrsOnly<IFlightOffer>).arriveFlight!.departTimeUtc, (offerData as EntityDataAttrsOnly<IFlightOffer>).arriveFlight!.departAirport.city.utcOffsetMin), 'day') },
          { ctrlKey: [...CtrlKey, 'Ticket', 'ReturnFlight', 'Details', 'Duration'], caption: getI18nResName3('ticket', 'details', 'duration'), icon: 'i-ion-stopwatch', text: t(getI18nResName2('searchFlights', 'flightDuration'), getValueForFlightDurationFormatting((offerData as EntityDataAttrsOnly<IFlightOffer>).arriveFlight!.departTimeUtc, (offerData as EntityDataAttrsOnly<IFlightOffer>).arriveFlight!.arriveTimeUtc)) },
          { ctrlKey: [...CtrlKey, 'Ticket', 'ReturnFlight', 'Details', 'Gate'], caption: getI18nResName3('ticket', 'details', 'gate'), icon: 'i-material-symbols-door-front', text: 'A12' },
          { ctrlKey: [...CtrlKey, 'Ticket', 'ReturnFlight', 'Details', 'Seat'], caption: getI18nResName3('ticket', 'details', 'seat'), icon: 'i-material-symbols-airline-seat-recline-extra', text: '128' }
        ])
      },
      titleOrGfx: ({
        ctrlKey: [...CtrlKey, 'Ticket', 'ReturnFlight', 'Details', 'FlightGfx'],
        userName: userName.value!
      } as IBookingTicketFlightGfxProps),
      offerKind: 'flights'
    })
  : undefined;
});

if(import.meta.server) {
  const offerKind = offerOnServer!.kind;
  const bookingOgImageQueryInfo = (reqEvent!.context.cacheablePageParams as any) as BookingPageArgs;
  const isAuthenticated = status.value === 'authenticated' || reqEvent!.context.authenticated;
  const isInternalRequest = bookingOgImageQueryInfo?.i === '1';
  if (isAuthenticated && isInternalRequest) {
    const theme = bookingOgImageQueryInfo?.theme ?? DefaultTheme;
    const isSecondPage = bookingOgImageQueryInfo?.isSecondPage === '1';

    logger.debug('internal booking ticket og image request using', { theme, isSecondPage, bookingId });
    useOgImage({
      name: 'OgBookingTicket',
      props: {
        ...(isSecondPage ? ticketReturnFlightProps.value : ticketProps.value),
        theme
      }
    }, true);
  } else if (offerKind === 'flights') {
    const flightOffer = offerOnServer as EntityDataAttrsOnly<IFlightOffer>;
    useOgImage({
      name: 'OgOfferSummary',
      props: {
        kind: 'flights',
        title: flightOffer.departFlight.airplane.name,
        city: flightOffer.departFlight.departAirport.city,
        price: displayedPrice.value!.toNumber(),
        dateUnixUtc: flightOffer.departFlight.departTimeUtc.getTime(),
        utcOffsetMin: flightOffer.departFlight.departAirport.city.utcOffsetMin,
        image: {
          ...flightOffer.departFlight.airplane.images.find(x => x.kind === 'main')!.image,
          category: ImageCategory.Airplane
        }
      }
    }, true);
  } else {
    const stayOffer = offerOnServer as EntityDataAttrsOnly<IStayOfferDetails>;
    useOgImage({
      name: 'OgOfferSummary',
      props: {
        kind: 'stays',
        title: stayOffer.stay.name,
        city: stayOffer.stay.city,
        price: displayedPrice.value!.toNumber(),
        dateUnixUtc: stayOffer.checkIn.getTime(),
        image: {
          ...(stayOffer.stay.images.find(i => i.order === 0)),
          category: ImageCategory.Hotel
        }
      }
    });
  }
}

async function onDownloadBtnClick (): Promise<void> {
  logger.debug('download btn handler', bookingId);
  if (!booking.value || !offer.value) {
    logger.warn('cannot download document, data is not initialized', undefined, bookingId);
    throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'unexpected error', 'error-stub');
  }  

  const firstName = (userAccountStore.name && userAccountStore.name !== LOADING_STATE ? userAccountStore.name.firstName : undefined) ?? undefined;
  const lastName = (userAccountStore.name && userAccountStore.name !== LOADING_STATE ? userAccountStore.name.lastName : undefined) ?? undefined;

  await documentDownloader!.download(booking.value!.id, offer.value, firstName, lastName, locale.value as Locale, theme.currentTheme.value);
}

function getLocalizableAirportText (city: EntityDataAttrsOnly<ICity>): ILocalizableValue {
  return (fromPairs(AvailableLocaleCodes.map(l => [l, `${getLocalizeableValue(city!.name, l as Locale)}(${extractAirportCode(getLocalizeableValue(city!.name, locale.value as Locale))})`])) as any) as ILocalizableValue;
}

function updatePageTitle () {
  if (!offer?.value) {
    return;
  }

  if (offer.value.kind === 'flights') {
    const flight = (offer.value as EntityDataAttrsOnly<IFlightOffer>).departFlight;
    extendTitleWithFlightDetails(flight.departAirport.city.name, flight.arriveAirport.city.name);
  } else {
    const stayOffer = offer.value as EntityDataAttrsOnly<IStayOfferDetails>;
    extendTitleWithStayDetails(stayOffer.stay.name, stayOffer.checkIn, stayOffer.checkOut);
  }
}

function extendTitleWithFlightDetails (fromCityName: ILocalizableValue, toCityName: ILocalizableValue) {
  const from = getLocalizeableValue(fromCityName, locale.value as Locale);
  const to = getLocalizeableValue(toCityName, locale.value as Locale);
  (route.meta.title as any).resName = getI18nResName2('bookingPage', 'flightTitleExt');
  (route.meta.title as any).resArgs = { from, to };
}

function extendTitleWithStayDetails (stayName: ILocalizableValue, checkIn: Date, checkOut: Date) {
  const titleArgs = {
    stay: getLocalizeableValue(stayName, locale.value as Locale),
    from: d(checkIn, 'day'),
    to: d(checkOut, 'day')
  };
  (route.meta.title as any).resName = getI18nResName2('bookingPage', 'stayTitleExt');
  (route.meta.title as any).resArgs = titleArgs;
}

if (import.meta.server) {
  updatePageTitle();
}
onMounted(() => {
  modalWaiter = useModalWaiter(modalWaiterRef as any, modalWaiterOpen);
  documentDownloader = useDocumentDownloader(modalWaiter);

  watch(isFetchError, () => {
    logger.debug('fetch exception watcher');
    if(isFetchError.value) {
      isError.value = true;
    }
  });

  watch(bookingFetch.status, () => {
    logger.debug('booking fetch status watcher', { status: bookingFetch.status.value });
    if(bookingFetch.status.value === 'success' && bookingFetch.data.value) {
      const offerKind = bookingFetch.data.value.kind;
      logger.debug('booking fetch succeeded, fetching offer', { offerKind });
      if(offerKind === 'flights') {
        flightOfferFetch.refresh();
      } else {
        stayOfferFetch.refresh();
      }
    }
  }, { immediate: true });

  watch(stayOfferFetch.status, () => {
    logger.debug('stay offer fetch status watcher', { status: stayOfferFetch.status.value });
    if(stayOfferFetch.status.value === 'success' && stayOfferFetch.data.value) {
      logger.debug('stay offer fetch succeeded, fetching reviews summary');
      stayReviewsFetch.refresh();
    }
  }, { immediate: true });

  watch(hasAccessToBooking, () => {
    if(!hasAccessToBooking.value) {
      logger.info('user lost access to booking, leaving page', { bookingId });
      if(booking.value) {
        const offerId = booking.value.offer.id;
        const offerUrl = booking.value.offer.kind === 'flights' ?
          navLinkBuilder.buildLink(`/${getPagePath(AppPage.FlightDetails)}/${offerId}`, locale.value as Locale) : 
          navLinkBuilder.buildLink(`/${getPagePath(AppPage.StayDetails)}/${offerId}`, locale.value as Locale);
        navigateTo(offerUrl);
      } else {
        throw new AppException(AppExceptionCodeEnum.UNAUTHENTICATED, 'user lost access to booking', 'error-page');
      }
    }
  }, { immediate: false });

  watchEffect(updatePageTitle);
});

</script>

<template>
  <div class="w-full h-auto">
    <ClientOnly>
      <article :class="`px-[14px] py-[27px] sm:px-[20px] md:px-[40px] xl:px-[104px] group booking-page-group ${LocatorClasses.BookingDetails}`">
        <ErrorHelm v-model:is-error="isError">
          <LazyOfferDetailsBreadcrumbs
            v-if="!isDownloadFromElectron"
            :ctrl-key="[...CtrlKey, 'Breadcrumbs']"
            :offer-kind="offer?.kind"
            :city="offer ? (offer.kind === 'flights' ? (offer as IFlightOffer).departFlight.departAirport.city : (offer as IStayOfferDetails).stay.city) : undefined"
            :place-name="offer ? (offer.kind === 'flights' ? (offer as IFlightOffer).departFlight.departAirport.name : (offer as IStayOfferDetails).stay.name) : undefined"
          />
          <OfferDetailsSummary
            :ctrl-key="CtrlKey"
            class="mt-6 sm:mt-8"
            :offer-kind="offer?.kind"
            :offer-id="offer?.id"
            :city="offer ? (offer.kind === 'flights' ? (offer as IFlightOffer).departFlight.departAirport.city : (offer as IStayOfferDetails).stay.city) : undefined"
            :title="offer ? (offer.kind === 'flights' ? (offer as IFlightOffer).departFlight.airplane.name : (offer as IStayOfferDetails).stay.name) : undefined"
            :price="displayedPrice"
            :review-score="offer ? (offer.kind === 'flights' ? (offer as IFlightOffer).departFlight.airlineCompany.reviewSummary.score : (offer as IStayOfferDetails).stay.reviewSummary?.score) : undefined"
            :num-reviews="offer ? (offer.kind === 'flights' ? (offer as IFlightOffer).departFlight.airlineCompany.reviewSummary.numReviews : (offer as IStayOfferDetails).stay.reviewSummary?.numReviews) : undefined"
            :variant="isDownloadFromElectron ? 'booking-download' : 'booking'"
            :btn-res-name="getI18nResName2('bookingPage', 'downloadBtn')"
            :btn-link-url="null"
            @btn-click="onDownloadBtnClick"
          />
          <div class="w-full h-auto mt-6 sm:mt-8">
            <BookingTicket
              :ctrl-key="[...CtrlKey, 'Ticket']"
              :general-info="ticketProps?.generalInfo"
              :dates="ticketProps?.dates"
              :offer-kind="ticketProps?.offerKind"
              :details="ticketProps?.details"
              :title-or-gfx="ticketProps?.titleOrGfx"
            />
          </div>
          <div class="w-full h-auto mt-6 sm:mt-8">
            <BookingTicket
              v-if="ticketReturnFlightProps"
              :ctrl-key="[...CtrlKey, 'Ticket', 'ReturnFlight']"
              :general-info="ticketReturnFlightProps?.generalInfo"
              :dates="ticketReturnFlightProps?.dates"
              :offer-kind="ticketReturnFlightProps?.offerKind"
              :details="ticketReturnFlightProps?.details"
              :title-or-gfx="ticketReturnFlightProps?.titleOrGfx"
            />
          </div>
          <TermsOfUse :ctrl-key="[...CtrlKey, 'TermsOfUse']" />
        </ErrorHelm>
      </article>
      <template #fallback>
        <ComponentWaitingIndicator :ctrl-key="['Page', 'BookingDetails', 'ClientFallback']" class="py-8"/>
      </template>
    </ClientOnly>
    <ModalWaitingIndicator ref="modal-waiter" v-model:open="modalWaiterOpen" :ctrl-key="[...CtrlKey, 'Waiter']" :label-res-name="getI18nResName2('bookingCommon', 'generatingDoc')"/>
  </div>
</template>
