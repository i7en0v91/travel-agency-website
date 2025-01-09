<script setup lang="ts">
import { QueryInternalRequestParam, isElectronBuild, type BookingPageArgs, AppException, AppExceptionCodeEnum, clampTextLine, getLocalizeableValue, getValueForFlightDurationFormatting, getValueForFlightDayFormatting, getValueForTimeOfDayFormatting, extractAirportCode, ImageCategory, type ICity, type EntityDataAttrsOnly, type ILocalizableValue, type IFlightOffer, type IStayOfferDetails, type EntityId, type ReviewSummary, getI18nResName2, getI18nResName3, AppPage, type Locale, AvailableLocaleCodes, DefaultTheme } from '@golobe-demo/shared';
import fromPairs from 'lodash-es/fromPairs';
import { type IBookingTicketFlightGfxProps, type IBookingTicketStayTitleProps, type IBookingTicketProps } from './../../types';
import { ApiEndpointBookingOffer, ApiEndpointStayOfferReviewSummary } from './../../server/api-definitions';
import BookingTicket from './../../components/booking-ticket/booking-ticket.vue';
import ComponentWaitingIndicator from '../../components/forms/component-waiting-indicator.vue';
import TermsOfUse from './../../components/booking-page/terms-of-use.vue';
import { getObject } from './../../helpers/rest-utils';
import { type IOfferBookingStore } from './../../stores/offer-booking-store';
import { mapFlightOfferDetails, mapStayOfferDetails, mapReviewSummary } from './../../helpers/entity-mappers';
import { type IReviewSummaryDto } from '../../server/api-definitions';
import type ModalWaitingIndicator from '../../components/forms/modal-waiting-indicator.vue';
import { useDocumentDownloader, type IDocumentDownloader } from './../../composables/document-downloader';
import { useNavLinkBuilder } from './../../composables/nav-link-builder';
import { getCommonServices } from '../../helpers/service-accessors';
import { useModalWaiter, type IModalWaiter } from '../../composables/modal-waiter';
import { type ComponentInstance } from 'vue';
import { LocatorClasses } from '../../helpers/constants';

const DisplayedUserNameMaxLength = 25;

const { t, d, locale } = useI18n();
const navLinkBuilder = useNavLinkBuilder();

const route = useRoute();
const { status } = useAuth();
const logger = getCommonServices().getLogger();

const reqEvent = import.meta.server ? useRequestEvent() : undefined;
const isOgImageRequestMode = import.meta.server && !!reqEvent?.context.ogImageContext;
const isDownloadFromElectron = import.meta.client && isElectronBuild() && (route.query ?? {})[QueryInternalRequestParam] === '1';

let authUserForbidden = false;

const isAuthenticated = status.value === 'authenticated' || (import.meta.server && reqEvent?.context.authenticated);
let isUnAuthOgImageRequestMode = isOgImageRequestMode && !isAuthenticated;

logger.verbose(`(BookingDetails) route=${route.fullPath}`);

const bookingParam = route.params?.id?.toString() ?? '';
if (bookingParam.length === 0) {
  await navigateTo(navLinkBuilder.buildPageLink(AppPage.Index, locale.value as Locale));
}
const bookingId: EntityId = bookingParam;

definePageMeta({
  title: { resName: getI18nResName2('bookingPage', 'pageTitle'), resArgs: undefined }
});

const CtrlKey = `BookingDetails${bookingId}`;

const isError = ref(false);
const theme = useThemeSettings();

const modalWaiterRef = shallowRef<ComponentInstance<typeof ModalWaitingIndicator>>() as Ref<ComponentInstance<typeof ModalWaitingIndicator>>;
const modalWaiterOpen = ref<boolean>(false);
let modalWaiter: IModalWaiter | undefined;
let documentDownloader: IDocumentDownloader | undefined;

let offerDataAvailable: ComputedRef<boolean | undefined>;
let offer: Ref<EntityDataAttrsOnly<IFlightOffer | IStayOfferDetails> | undefined>;
let offerBookingStore: IOfferBookingStore<IFlightOffer | IStayOfferDetails> | undefined;

async function initializeVariables(): Promise<void> {
  if (!isUnAuthOgImageRequestMode) {
    logger.debug(`(BookingDetails) using full booking store mode, route=${route.fullPath}`);
    const offerBookingStoreFactory = await useOfferBookingStoreFactory() as IOfferBookingStoreFactory;
    try {
      offerBookingStore = await offerBookingStoreFactory.getUserBooking(bookingId!, !!reqEvent?.context.ogImageContext, reqEvent);
    } catch (err: any) {
      if (AppException.isAppException(err) && (err as AppException).code === AppExceptionCodeEnum.FORBIDDEN) {
        authUserForbidden = true;
        if (isOgImageRequestMode) {
          logger.verbose(`(BookingDetails) authenticated user doesn't have access to booking, switching to unauthenticated og image request mode, route=${route.fullPath}`);
          isUnAuthOgImageRequestMode = true;
        } else {
          throw err;
        }
      } else {
        throw err;
      }
    }
    if (offerBookingStore) {
      logger.debug(`(BookingDetails) booking data ready, updating, route=${route.fullPath}, bookingId=${offerBookingStore?.booking?.id}, offerId=${offerBookingStore.booking?.offer?.id}`);
      offer = ref<EntityDataAttrsOnly<IFlightOffer | IStayOfferDetails> | undefined>(offerBookingStore.booking?.offer);
      offerDataAvailable = computed(() => offerBookingStore!.status === 'success' && offerBookingStore!.booking?.offer && !isError.value);
    }
  }

  if (isUnAuthOgImageRequestMode) {
    logger.debug(`(BookingDetails) using unauthenticated og image request mode, route=${route.fullPath}`);

    const url = `/${ApiEndpointBookingOffer(bookingId!)}`;
    // no need to payload, as it's ogImage request
    const resultDto = await getObject<EntityDataAttrsOnly<IFlightOffer | IStayOfferDetails>>(url, undefined, 'default', true, reqEvent, 'default');
    if (!resultDto) {
      logger.warn(`(BookingDetails) exception occured while fetching booking offer data, bookingId=${bookingId}`);
      throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'unexpected HTTP request error', 'error-stub');
    }

    let stayReviewSummary: ReviewSummary | undefined;
    if(resultDto.kind === 'stays') {
      const reviewSummaryUrl = `/${ApiEndpointStayOfferReviewSummary(resultDto.id)}`;
      const reviewSummaryDto = await getObject<IReviewSummaryDto>(reviewSummaryUrl, undefined, 'default', false, reqEvent, 'default');
      if (!reviewSummaryDto) {
        logger.warn(`(BookingDetails) exception occured while fetching stay offer review summary, bookingId=${bookingId}, offerId=${resultDto.id}`);
        throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'unexpected HTTP request error', 'error-stub');
      }
      stayReviewSummary = mapReviewSummary(reviewSummaryDto);
    }

    const offerData = resultDto.kind === 'flights'
      ? mapFlightOfferDetails(resultDto as any) as EntityDataAttrsOnly<IFlightOffer>
      : mapStayOfferDetails(resultDto as any, stayReviewSummary!) as EntityDataAttrsOnly<IStayOfferDetails>;

    logger.verbose(`(BookingDetails) booking offer fetched, bookingId=${bookingId}, offerId=${offerData.id}, kind=${offerData.kind}`);
    offer = ref(offerData);
    offerDataAvailable = computed(() => true);
  }
}
await initializeVariables();

function getLocalizableAirportText (city: EntityDataAttrsOnly<ICity>): ILocalizableValue {
  return (fromPairs(AvailableLocaleCodes.map(l => [l, `${getLocalizeableValue(city!.name, l as Locale)}(${extractAirportCode(getLocalizeableValue(city!.name, locale.value as Locale))})`])) as any) as ILocalizableValue;
}

const userName = computed(() => offerBookingStore?.booking ? `${clampTextLine(`${offerBookingStore.booking!.bookedUser!.firstName ?? ''}`, DisplayedUserNameMaxLength)} ${(offerBookingStore.booking!.bookedUser!.lastName ?? '').length > 0 ? `${offerBookingStore.booking!.bookedUser!.lastName!.substring(0, 1).toUpperCase()}.` : ''}` : undefined);
const ticketProps = computed<IBookingTicketProps>(() => (offerDataAvailable?.value && offer?.value && offerBookingStore?.booking)
  ? ({
      ctrlKey: `${CtrlKey}-Ticket`,
      generalInfo: {
        ctrlKey: `${CtrlKey}-Ticket-General`,
        avatar: offerBookingStore.booking!.bookedUser!.avatar ?? null,
        texting: {
          name: userName.value!,
          sub: offer.value.kind === 'flights' ? getI18nResName2('ticket', 'boardingPass') : null
        },
        classResName: getI18nResName3('ticket', 'class', (offer.value.kind === 'flights' ? (offer.value as EntityDataAttrsOnly<IFlightOffer>).class : (offerBookingStore.booking!.serviceLevel! === 'Base' ? 'base' : 'city')))
      },
      dates: {
        ctrlKey: `${CtrlKey}-Ticket-Dates`,
        from: {
          ctrlKey: `${CtrlKey}-Ticket-DatesFrom`,
          label: offer.value.kind === 'flights' ? d(getValueForTimeOfDayFormatting((offer.value as EntityDataAttrsOnly<IFlightOffer>).departFlight.departTimeUtc, (offer.value as EntityDataAttrsOnly<IFlightOffer>).departFlight.departAirport.city.utcOffsetMin), 'daytime') : d((offer.value as EntityDataAttrsOnly<IStayOfferDetails>).checkIn, 'day'),
          sub: offer.value.kind === 'flights' ? getLocalizableAirportText((offer.value as EntityDataAttrsOnly<IFlightOffer>).departFlight.departAirport.city) : getI18nResName2('ticket', 'checkIn')
        },
        to: {
          ctrlKey: `${CtrlKey}-Ticket-DatesTo`,
          label: offer.value.kind === 'flights' ? d(getValueForTimeOfDayFormatting((offer.value as EntityDataAttrsOnly<IFlightOffer>).departFlight.arriveTimeUtc, (offer.value as EntityDataAttrsOnly<IFlightOffer>).departFlight.departAirport.city.utcOffsetMin), 'daytime') : d((offer.value as EntityDataAttrsOnly<IStayOfferDetails>).checkOut, 'day'),
          sub: offer.value.kind === 'flights' ? getLocalizableAirportText((offer.value as EntityDataAttrsOnly<IFlightOffer>).departFlight.arriveAirport.city) : getI18nResName2('ticket', 'checkOut')
        }
      },
      details: {
        ctrlKey: `${CtrlKey}-Ticket-Details`,
        items: offer.value.kind === 'flights'
          ? ([
              { ctrlKey: `${CtrlKey}-Ticket-Details-Date`, caption: getI18nResName3('ticket', 'details', 'date'), icon: 'i-heroicons-calendar-days-20-solid', text: d(getValueForFlightDayFormatting((offer.value as EntityDataAttrsOnly<IFlightOffer>).departFlight.departTimeUtc, (offer.value as EntityDataAttrsOnly<IFlightOffer>).departFlight.departAirport.city.utcOffsetMin), 'day') },
              { ctrlKey: `${CtrlKey}-Ticket-Details-Duration`, caption: getI18nResName3('ticket', 'details', 'duration'), icon: 'i-ion-stopwatch', text: t(getI18nResName2('searchFlights', 'flightDuration'), getValueForFlightDurationFormatting((offer.value as EntityDataAttrsOnly<IFlightOffer>).departFlight.departTimeUtc, (offer.value as EntityDataAttrsOnly<IFlightOffer>).departFlight.arriveTimeUtc)) },
              { ctrlKey: `${CtrlKey}-Ticket-Details-Gate`, caption: getI18nResName3('ticket', 'details', 'gate'), icon: 'i-material-symbols-door-front', text: 'A12' },
              { ctrlKey: `${CtrlKey}-Ticket-Details-Seat`, caption: getI18nResName3('ticket', 'details', 'seat'), icon: 'i-material-symbols-airline-seat-recline-extra', text: '128' }
            ])
          : ([
              { ctrlKey: `${CtrlKey}-Ticket-Details-CheckInTime`, caption: getI18nResName3('ticket', 'details', 'checkInTime'), icon: 'i-ion-stopwatch', text: d(new Date(2000, 1, 1, 12, 0, 0, 0), 'daytime') },
              { ctrlKey: `${CtrlKey}-Ticket-Details-CheckOutTime`, caption: getI18nResName3('ticket', 'details', 'checkOutTime'), icon: 'i-ion-stopwatch', text: d(new Date(2000, 1, 1, 12, 0, 0, 0), 'daytime') },
              { ctrlKey: `${CtrlKey}-Ticket-Details-Room`, caption: getI18nResName3('ticket', 'details', 'room'), icon: 'i-material-symbols-door-front', text: t(getI18nResName3('ticket', 'details', 'onArrival')) }
            ])
      },
      titleOrGfx: offer.value.kind === 'flights'
        ? ({
            ctrlKey: `${CtrlKey}-Ticket-Details-FlightGfx`,
            userName: userName.value!
          } as IBookingTicketFlightGfxProps)
        : ({
            ctrlKey: `${CtrlKey}-Ticket-Details-StayTitle`,
            cityName: (offer.value as EntityDataAttrsOnly<IStayOfferDetails>).stay.city.name,
            stayName: (offer.value as EntityDataAttrsOnly<IStayOfferDetails>).stay.name
          } as IBookingTicketStayTitleProps),
      offerKind: offer.value.kind
    })
  : { ctrlKey: `${CtrlKey}-Ticket` });

const ticketReturnFlightProps = computed<IBookingTicketProps | undefined>(() => (offerDataAvailable?.value && offerBookingStore?.booking && offer?.value && offer.value.kind === 'flights' && !!(offer.value as EntityDataAttrsOnly<IFlightOffer>).arriveFlight)
  ? ({
      ctrlKey: `${CtrlKey}-TicketReturnFlight`,
      generalInfo: {
        ctrlKey: `${CtrlKey}-TicketReturnFlight-General`,
        avatar: offerBookingStore.booking!.bookedUser!.avatar ?? null,
        texting: {
          name: userName.value!,
          sub: getI18nResName2('ticket', 'boardingPass')
        },
        classResName: getI18nResName3('ticket', 'class', (offer.value as EntityDataAttrsOnly<IFlightOffer>).class)
      },
      dates: {
        ctrlKey: `${CtrlKey}-TicketReturnFlight-Dates`,
        from: {
          ctrlKey: `${CtrlKey}-TicketReturnFlight-DatesFrom`,
          label: d(getValueForTimeOfDayFormatting((offer.value as EntityDataAttrsOnly<IFlightOffer>).arriveFlight!.departTimeUtc, (offer.value as EntityDataAttrsOnly<IFlightOffer>).arriveFlight!.departAirport.city.utcOffsetMin), 'daytime'),
          sub: getLocalizableAirportText((offer.value as EntityDataAttrsOnly<IFlightOffer>).arriveFlight!.departAirport.city)
        },
        to: {
          ctrlKey: `${CtrlKey}-TicketReturnFlight-DatesTo`,
          label: d(getValueForTimeOfDayFormatting((offer.value as EntityDataAttrsOnly<IFlightOffer>).arriveFlight!.arriveTimeUtc, (offer.value as EntityDataAttrsOnly<IFlightOffer>).arriveFlight!.departAirport.city.utcOffsetMin), 'daytime'),
          sub: getLocalizableAirportText((offer.value as EntityDataAttrsOnly<IFlightOffer>).arriveFlight!.arriveAirport.city)
        }
      },
      details: {
        ctrlKey: `${CtrlKey}-TicketReturnFlight-Details`,
        items: ([
          { ctrlKey: `${CtrlKey}-TicketReturnFlight-Details-Date`, caption: getI18nResName3('ticket', 'details', 'date'), icon: 'i-heroicons-calendar-days-20-solid', text: d(getValueForFlightDayFormatting((offer.value as EntityDataAttrsOnly<IFlightOffer>).arriveFlight!.departTimeUtc, (offer.value as EntityDataAttrsOnly<IFlightOffer>).arriveFlight!.departAirport.city.utcOffsetMin), 'day') },
          { ctrlKey: `${CtrlKey}-TicketReturnFlight-Details-Duration`, caption: getI18nResName3('ticket', 'details', 'duration'), icon: 'i-ion-stopwatch', text: t(getI18nResName2('searchFlights', 'flightDuration'), getValueForFlightDurationFormatting((offer.value as EntityDataAttrsOnly<IFlightOffer>).arriveFlight!.departTimeUtc, (offer.value as EntityDataAttrsOnly<IFlightOffer>).arriveFlight!.arriveTimeUtc)) },
          { ctrlKey: `${CtrlKey}-TicketReturnFlight-Details-Gate`, caption: getI18nResName3('ticket', 'details', 'gate'), icon: 'i-material-symbols-door-front', text: 'A12' },
          { ctrlKey: `${CtrlKey}-TicketReturnFlight-Details-Seat`, caption: getI18nResName3('ticket', 'details', 'seat'), icon: 'i-material-symbols-airline-seat-recline-extra', text: '128' }
        ])
      },
      titleOrGfx: ({
        ctrlKey: `${CtrlKey}-TicketReturnFlight-Details-FlightGfx`,
        userName: userName.value!
      } as IBookingTicketFlightGfxProps),
      offerKind: 'flights'
    })
  : undefined);

const displayedPrice = computed(() => offer?.value?.kind === 'flights' ? offer.value?.totalPrice : (offerBookingStore ? ((offer?.value as EntityDataAttrsOnly<IStayOfferDetails>).prices[offerBookingStore!.serviceLevel!]) : offer?.value?.totalPrice));

if (import.meta.server) {
  const offerKind = offer!.value!.kind;
  const bookingOgImageQueryInfo = (reqEvent!.context.cacheablePageParams as any) as BookingPageArgs;
  const isInternalRequest = bookingOgImageQueryInfo?.i === '1';
  if (isAuthenticated && !authUserForbidden && isInternalRequest) {
    const theme = bookingOgImageQueryInfo?.theme ?? DefaultTheme;
    const isSecondPage = bookingOgImageQueryInfo?.isSecondPage === '1';

    logger.debug(`(BookingDetails) internal booking ticket og image request using theme=${theme}, isSecondPage=${isSecondPage}, bookingId=${bookingId}`);
    useOgImage({
      name: 'OgBookingTicket',
      props: {
        ...(isSecondPage ? ticketReturnFlightProps.value : ticketProps.value),
        theme
      }
    }, true);
  } else if (offerKind === 'flights') {
    const flightOffer = offer!.value as EntityDataAttrsOnly<IFlightOffer>;
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
    const stayOffer = offer!.value as EntityDataAttrsOnly<IStayOfferDetails>;
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

onMounted(async () => {
  modalWaiter = useModalWaiter(modalWaiterRef, modalWaiterOpen);
  documentDownloader = useDocumentDownloader(modalWaiter);

  if (offerBookingStore) {
    logger.debug(`(BookingDetails) starting status watcher, bookingId=${bookingId}`);
    watch(() => offerBookingStore!.status, () => {
      logger.debug(`(BookingDetails) status changed, bookingId=${bookingId}, status=${offerBookingStore!.status}`);
      if (offerBookingStore!.status === 'error') {
        isError.value = true;
      }
      if (offerDataAvailable.value) {
        offer.value = offerBookingStore!.booking!.offer;
        updatePageTitle();
      }
    });
  }

  watch(locale, () => {
    logger.debug(`(BookingDetails) locale changed, updating title, bookingId=${bookingId}, status=${offerBookingStore!.status}`);
    updatePageTitle();
  });

  updatePageTitle();
});


async function onDownloadBtnClick (): Promise<void> {
  logger.debug(`(BookingDetails) download btn handler, bookingId=${bookingId}`);
  if (!offerBookingStore || !(offerDataAvailable.value && offerBookingStore.booking && offer?.value)) {
    logger.warn(`(BookingDetails) cannot download document, data is not initialized, bookingId=${bookingId}`);
    throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'unexpected error', 'error-stub');
  }  

  await documentDownloader!.download(offerBookingStore.booking!.id, offer.value, offerBookingStore.booking!.bookedUser!.firstName, offerBookingStore.booking!.bookedUser!.lastName, locale.value as Locale, theme.currentTheme.value);
}

</script>

<template>
  <div class="w-full h-auto">
    <ClientOnly>
      <article :class="`px-[14px] py-[27px] sm:px-[20px] md:px-[40px] xl:px-[104px] group booking-page-group ${LocatorClasses.BookingDetails}`">
        <ErrorHelm v-model:is-error="isError">
          <OfferDetailsBreadcrumbs
            v-if="!isDownloadFromElectron"
            :ctrl-key="`${CtrlKey}-Breadcrumbs`"
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
              :ctrl-key="`${CtrlKey}-Ticket`"
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
              :ctrl-key="`${CtrlKey}-TicketReturnFlight`"
              :general-info="ticketReturnFlightProps?.generalInfo"
              :dates="ticketReturnFlightProps?.dates"
              :offer-kind="ticketReturnFlightProps?.offerKind"
              :details="ticketReturnFlightProps?.details"
              :title-or-gfx="ticketReturnFlightProps?.titleOrGfx"
            />
          </div>
          <TermsOfUse :ctrl-key="`${CtrlKey}-TermsOfUse`" />
        </ErrorHelm>
      </article>
      <template #fallback>
        <ComponentWaitingIndicator ctrl-key="BookingPageClientFallback" class="my-8"/>
      </template>
    </ClientOnly>
    <ModalWaitingIndicator ref="modalWaiterRef" v-model:open="modalWaiterOpen" :ctrl-key="`${CtrlKey}-Waiter`" :label-res-name="getI18nResName2('bookingCommon', 'generatingDoc')"/>
  </div>
</template>
