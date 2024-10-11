<script setup lang="ts">
import { AppException, AppExceptionCodeEnum, getI18nResName2, getI18nResName3 } from '@golobe-demo/shared';
import { FavouritesOptionButtonStays, FavouritesOptionButtonGroup, FavouritesOptionButtonFlights } from './../helpers/constants';
import { defaultErrorHandler } from './../helpers/exceptions';
import OptionButtonGroup from './../components/option-buttons/option-button-group.vue';
import OfferTabbedView from './../components/common-page-components/offer-tabbed-view.vue';
import FlightsListItemCard from './../components/common-page-components/offers-list-view/search-flights-result-card.vue';
import StaysListItemCard from './../components/common-page-components/offers-list-view/search-stays-result-card.vue';
import { useUserFavouritesStore } from './../stores/user-favourites-store';
import ComponentWaitingIndicator from './../components/component-waiting-indicator.vue';
import { getCommonServices } from '../helpers/service-accessors';

definePageMeta({
  middleware: 'auth',
  auth: true,
  title: { resName: getI18nResName2('favouritesPage', 'title'), resArgs: undefined }
});
useOgImage();

const DefaultActiveTabKey = FavouritesOptionButtonFlights;

const logger = getCommonServices().getLogger();
const isError = ref(false);

const userFavouritesStore = useUserFavouritesStore();
let userFavourites: Awaited<ReturnType<typeof userFavouritesStore.getInstance>> | undefined;
try {
  userFavourites = await userFavouritesStore.getInstance();
} catch (err: any) {
  logger.warn('(Favourites) failed to initialized user favourites store', err);
  isError.value = true;
}

const flightsTabHtmlId = useId();
const staysTabHtmlId = useId();

const activeOptionCtrl = ref<string | undefined>();

const displayedItems = computed(() => {
  return userFavourites
    ? {
        flights: userFavourites.status === 'success' ? (userFavourites.items.filter(i => i.kind === 'flights')) : undefined,
        stays: userFavourites.status === 'success' ? (userFavourites.items.filter(i => i.kind === 'stays')) : undefined
      }
    : {
        flights: undefined,
        stays: undefined
      };
});

onMounted(() => {
  watch(() => userFavourites?.status, () => {
    logger.debug(`(Favourites) handling favourites store status change, status=${userFavourites!.status}`);
    switch (userFavourites!.status) {
      case 'success':
        isError.value = false;
        break;
      case 'error':
        isError.value = true;
        break;
    }
  });

  if (userFavourites?.status === 'error') {
    defaultErrorHandler(new AppException(
      AppExceptionCodeEnum.UNKNOWN,
      'unhandled exception occured',
      'error-stub'));
  }
});

</script>

<template>
  <ClientOnly>
    <!--
    <section class="favourites-page">
      <ErrorHelm v-model:is-error="isError" class="favourites-page-error-helm">
        <h1 class="favourites-page-title">
          {{ $t(getI18nResName2('favouritesPage', 'title')) }}
        </h1>
        <OptionButtonGroup
          v-model:active-option-ctrl="activeOptionCtrl"
          class="favourites-page-tabs-control mt-xs-4"
          :ctrl-key="FavouritesOptionButtonGroup"
          role="tablist"
          :options="[
            { ctrlKey: FavouritesOptionButtonFlights, labelResName: getI18nResName2('favouritesPage', 'flightsTab'), shortIcon: 'airplane', enabled: true, role: { role: 'tab', tabPanelId: flightsTabHtmlId }, subtextResName: displayedItems.flights !== undefined ? getI18nResName2('favouritesPage', 'numMarked') : undefined, subtextResArgs: displayedItems.flights !== undefined ? { count: displayedItems.flights.length } : undefined},
            { ctrlKey: FavouritesOptionButtonStays, labelResName: getI18nResName2('favouritesPage', 'staysTab'), shortIcon: 'bed', enabled: true, role: { role: 'tab', tabPanelId: staysTabHtmlId }, subtextResName: displayedItems.flights !== undefined ? getI18nResName2('favouritesPage', 'numMarked') : undefined, subtextResArgs: displayedItems.stays !== undefined ? { count: displayedItems.stays.length } : undefined }
          ]"
        />
        <OfferTabbedView
          ctrl-key="favouritesList" 
          :selected-kind="(activeOptionCtrl ?? DefaultActiveTabKey) === FavouritesOptionButtonFlights ? 'flights' : 'stays'" 
          :tab-panel-ids="{ flights: flightsTabHtmlId, stays: staysTabHtmlId }" 
          :displayed-items="displayedItems"
          :no-offers-res-name="{
            flights: getI18nResName3('favouritesPage', 'noMarkedOffers', 'flights'),
            stays: getI18nResName3('favouritesPage', 'noMarkedOffers', 'stays'),
          }"
          :card-component-types="{
            flights: FlightsListItemCard,
            stays: StaysListItemCard
          }" />
      </ErrorHelm>
    </section>
    <template #fallback>
      <ComponentWaitingIndicator ctrl-key="FavouritesPageClientFallback" class="my-xs-5"/>
    </template>
    -->
    <div>PAGE CONTENT</div>
  </ClientOnly>
</template>
