<script setup lang="ts">
import { AppPage, getPagePath, type Locale, getLocalizeableValue, getScoreClassResName, extractAirportCode, getValueForFlightDurationFormatting, getValueForTimeOfDayFormatting, getI18nResName2, getI18nResName3, type EntityDataAttrsOnly, type IFlightOffer, type OfferKind, ImageCategory, isElectronBuild } from '@golobe-demo/shared';
import { useUserFavouritesStore } from './../../../stores/user-favourites-store';
import { useOfferFavouriteStatus } from './../../../composables/offer-favourite-status';
import { useNavLinkBuilder } from './../../../composables/nav-link-builder';
import { usePreviewState } from './../../../composables/preview-state';
import { getCommonServices } from '../../../helpers/service-accessors';

interface IProps {
  ctrlKey: string,
  offer: EntityDataAttrsOnly<IFlightOffer>
}
const props = withDefaults(defineProps<IProps>(), {
});

const { status } = useAuth();
const { locale, t } = useI18n();
const navLinkBuilder = useNavLinkBuilder();
const { requestUserAction } = usePreviewState();

const logger = getCommonServices().getLogger();
const userFavouritesStore = useUserFavouritesStore();

const isError = ref(false);

const airlineCompany = props.offer.departFlight.airlineCompany;
const airlineCompanyLogoTooltip = computed(() => getLocalizeableValue(airlineCompany.name, locale.value as Locale));
const scoreClassResName = getScoreClassResName(airlineCompany.reviewSummary.score);
const reviewsCountText = `${airlineCompany.reviewSummary.numReviews} ${t(getI18nResName2('searchOffers', 'reviewsCount'), airlineCompany.reviewSummary.numReviews)}`;

const offerFlights = props.offer.arriveFlight ? [props.offer.departFlight, props.offer.arriveFlight] : [props.offer.departFlight];
const favouriteStatusWatcher = useOfferFavouriteStatus(props.offer.id, props.offer.kind);

async function toggleFavourite (): Promise<void> {
  const offerId = props.offer.id;
  logger.verbose(`(SearchFlightsResultCard) toggling favourite, offerId=${offerId}, current=${favouriteStatusWatcher.isFavourite}`);
  if(!await requestUserAction()) {
    logger.verbose(`(SearchFlightsResultCard) favourite hasn't been toggled - not allowed in preview mode, offerId=${offerId}`);
    return;  
  }
  const store = await userFavouritesStore.getInstance();
  const result = await store.toggleFavourite(offerId, 'flights' as OfferKind, props.offer);
  logger.verbose(`(SearchFlightsResultCard) favourite toggled, offerId=${offerId}, isFavourite=${result}`);
}

async function favouriteBtnClick (): Promise<void> {
  logger.debug(`(SearchFlightsResultCard) favourite button clicked, ctrlKey=${props.ctrlKey}, current=${favouriteStatusWatcher.isFavourite}`);
  await toggleFavourite();
}

const uiStyling = {
  base: 'w-full h-full overflow-hidden flex flex-row flex-wrap gap-2 sm:gap-y-0 sm:grid sm:gap-x-6 sm:grid-rows-searchflightswide md:grid-rows-searchflights lg:grid-rows-searchflightswide sm:grid-cols-searchflightswide md:grid-cols-searchflights lg:grid-cols-searchflightswide',
  background: 'bg-transparent dark:bg-transparent',
  shadow: 'shadow-none',
  rounded: 'rounded-none',
  ring: '!ring-0',
  header: {
    base: 'contents'
  },
  body: {
    base: 'contents'
  },
  footer: {
    base: 'contents'
  }
};


</script>

<template>
  <ErrorHelm v-model:is-error="isError">
    <div class="w-full h-auto p-4 ring-1 ring-gray-200 dark:ring-gray-800 shadow-lg shadow-gray-200 dark:shadow-gray-700 rounded-xl">
      <UCard as="article" :ui="uiStyling">
        <template #header>
          <div class="w-fit flex-grow flex-shrink basis-0 sm:w-full h-max order-2 sm:order-1 row-start-1 row-end-2 col-start-2 col-end-3 flex flex-row flex-wrap items-start justify-between gap-2">
            <div class="flex flex-row flex-wrap items-center gap-2 justify-end">
              <UBadge 
                :ui="{ 
                  base: 'w-fit h-auto p-2 text-center',
                  rounded: 'rounded-md'
                }"
                size="sm"
              >
                {{ offer.departFlight.airlineCompany.reviewSummary.score.toFixed(1) }}
              </UBadge>
              <div class="w-fit h-auto text-xs text-end font-semibold">
                {{ $t(scoreClassResName) }}
              </div>
              <div class="w-fit h-auto text-xs text-end text-nowrap text-gray-500 dark:text-gray-400">
                {{ reviewsCountText }}
              </div>
            </div>
            <div class="flex flex-col flex-nowrap items-end ml-auto mb-4 sm:mb-0 md:mb-4 lg:mb-0">
              <div class="text-xs text-end leading-none text-gray-500 dark:text-gray-400">
                {{ $t(getI18nResName3('searchOffers', 'startingPrice')) }}
              </div>
              <div class="text-2xl leading-10 font-semibold text-end text-red-400">
                <span>{{ $n(Math.floor(offer.totalPrice.toNumber()), 'currency') }}</span>
              </div>
            </div>
          </div>
        </template>

        <div class="flex-initial w-fit h-min order-1 sm:order-2 float-right row-start-1 row-end-2 col-start-1 col-end-2 sm:row-end-4 md:row-end-3 lg:row-end-4">
          <StaticImage
            :ctrl-key="`${ctrlKey}-CompanyLogo`"
            :entity-src="props.offer.departFlight.airlineCompany.logoImage"
            :category="ImageCategory.AirlineLogo"
            sizes="xs:60vw sm:40vw md:40vw lg:30vw xl:30vw"
            :ui="{ wrapper: 'w-[160px] h-auto', img: 'object-cover' }"
            :show-stub="false"
            :request-extra-display-options="true"
            :alt-res-name="getI18nResName2('searchFlights', 'airlineCompanyLogoAlt')"
            :title="airlineCompanyLogoTooltip"
          />
        </div>

        <div class="order-3 row-start-2 row-end-3 col-start-1 col-end-3 sm:col-start-2 sm:col-end-3 md:col-start-2 md:col-end-3 lg:col-start-2 lg:col-end-3">
          <div class="grid grid-cols-1 grid-rows-1 overflow-x-auto">
            <div class="grid grid-flow-row auto-rows-auto grid-cols-searchflightsdates mt-4">
              <div v-for="(flight) in offerFlights" :key="`FO-${flight.id}`" class="w-full contents">
                <UCheckbox :model-value="false" disabled :ui="{ wrapper: 'mr-4 mb-4 self-start col-start-1 col-end-2' }"/>
                <div class="w-max col-start-2 col-end-3 mb-4">
                  <div class="w-fit flex flex-row flex-nowrap items-center text-sm font-semibold text-gray-600 dark:text-gray-300">
                    {{ $d(getValueForTimeOfDayFormatting(flight.departTimeUtc, flight.departAirport.city.utcOffsetMin), 'daytime') }}
                    &nbsp;-&nbsp;
                    {{ $d(getValueForTimeOfDayFormatting(flight.arriveTimeUtc, flight.departAirport.city.utcOffsetMin), 'daytime') }}
                  </div>
                  <div class="text-gray-500 dark:text-gray-400 whitespace-nowrap text-xs">
                    {{ getLocalizeableValue(flight.departAirport.city.name, locale as Locale) }}
                  </div>
                </div>
                <div class="flex w-full self-center col-start-3 col-end-4 text-center mx-10 max-w-[250px] text-xs font-semibold text-gray-600 dark:text-gray-300 mb-4">
                  {{ $t(getI18nResName2('searchFlights', 'nonStop')) }}
                </div>
                <div class="w-fit col-start-4 col-end-5 mb-4">
                  <div class="w-fit flex flex-row flex-nowrap items-center text-sm font-semibold text-gray-600 dark:text-gray-300">
                    {{ $t(getI18nResName2('searchFlights', 'flightDuration'), getValueForFlightDurationFormatting(flight.departTimeUtc, flight.arriveTimeUtc)) }}
                  </div>
                  <div class="whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                    {{ extractAirportCode(getLocalizeableValue(flight.departAirport.city.name, locale as Locale)) }}
                    &nbsp;-&nbsp;
                    {{ extractAirportCode(getLocalizeableValue(flight.arriveAirport.city.name, locale as Locale)) }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <template #footer>
          <div class="order-4 w-full row-start-3 row-end-4 col-start-1 col-end-3 sm:col-start-2 sm:col-end-3 md:col-start-1 md:col-end-3 lg:col-start-2 lg:col-end-3">
            <UDivider color="gray" orientation="horizontal" class="w-full mt-4" size="xs"/>
            <div class="flex flex-row flex-nowrap gap-4 mt-4 p-1">
              <UButton
                v-if="status === 'authenticated'"
                :ui="{ base: 'aspect-square justify-center' }"
                size="lg"
                :icon="favouriteStatusWatcher.isFavourite ? 'i-heroicons-heart-solid' : 'i-heroicons-heart'"
                variant="outline"
                color="primary"
                @click="favouriteBtnClick"
              />

              <UButton size="lg" class="w-full flex-1" :ui="{ base: 'justify-center text-center' }" variant="solid" color="primary" :to="navLinkBuilder.buildLink(`/${getPagePath(AppPage.FlightDetails)}/${offer.id}`, locale as Locale)" :external="false"  :target="isElectronBuild() ? '_blank' : undefined">
                {{ $t(getI18nResName2('searchFlights', 'viewDetails')) }}
              </UButton>
            </div>
          </div>
        </template>
      </UCard>
    </div>
  </ErrorHelm>
</template>
