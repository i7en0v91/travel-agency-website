<script setup lang="ts">
import { getI18nResName2, getI18nResName3 } from '@golobe-demo/shared';
import { mapLoadOffersResult } from './../helpers/entity-mappers';
import { ApiEndpointLoadOffers, type ILoadOffersDto } from './../server/api-definitions';
import OptionButtonGroup from './../components/option-buttons/option-button-group.vue';
import OfferTabbedView from './../components/common-page-components/offer-tabbed-view.vue';
import FlightsListItemCard from './../components/common-page-components/offers-list-view/search-flights-result-card.vue';
import StaysListItemCard from './../components/common-page-components/offers-list-view/search-stays-result-card.vue';
import ComponentWaitingIndicator from './../components/component-waiting-indicator.vue';
import { getCommonServices } from '../helpers/service-accessors';
import { areCtrlKeysEqual, type ControlKey } from './../helpers/components';
import { LOADING_STATE } from '../helpers/constants';

definePageMeta({
  middleware: 'auth',
  auth: true,
  title: { resName: getI18nResName2('favouritesPage', 'title'), resArgs: undefined }
});
useOgImage();

const CtrlKey: ControlKey = ['Page', 'Favourites'];
const FavouritesOptionButtonGroup: ControlKey = [...CtrlKey, 'OptionBtnGroup'];
const FavouritesOptionButtonFlights: ControlKey = [...FavouritesOptionButtonGroup, 'Flights', 'Option'];
const FavouritesOptionButtonStays: ControlKey = [...FavouritesOptionButtonGroup, 'Stays', 'Option'];
const DefaultActiveTabKey: ControlKey = FavouritesOptionButtonFlights;

const { enabled } = usePreviewState();
const nuxtApp = useNuxtApp();
const logger = getCommonServices().getLogger().addContextProps({ component: 'Favourites' });

const userAccountStore = useUserAccountStore();

const isError = ref(false);
const activeOptionCtrl = ref<ControlKey | undefined>();

const favouriteOfferIds = computed(() => {
  return userAccountStore.favourites ? 
    ( userAccountStore.favourites !== LOADING_STATE ? [
        ...userAccountStore.favourites.flights,
        ...userAccountStore.favourites.stays
      ] : LOADING_STATE 
    ) : undefined;
});

const fetchBody = computed(() => { 
  return (favouriteOfferIds.value && favouriteOfferIds.value !== LOADING_STATE) ? 
            ({ ids: favouriteOfferIds.value } as ILoadOffersDto) : 
            undefined;
 });
const offersDetailsFetch = 
  useFetch(`/${ApiEndpointLoadOffers}`, {
    server: false,
    lazy: true,
    immediate: false,
    cache: 'no-cache',
    dedupe: 'cancel',
    method: 'POST' as const,
    query: { drafts: enabled },
    body: fetchBody,
    watch: false,
    transform: mapLoadOffersResult,
    $fetch: nuxtApp.$fetchEx({ defautAppExceptionAppearance: 'error-stub' })
  });

const flightsTabHtmlId = useId();
const staysTabHtmlId = useId();

const displayedItems = computed(() => {
  return (offersDetailsFetch.status.value === 'success' && offersDetailsFetch.data.value)
    ? {
        flights: offersDetailsFetch.data.value.flights,
        stays: offersDetailsFetch.data.value.stays
      }
    : {
        flights: undefined,
        stays: undefined
      };
});

onMounted(() => {
  watch(fetchBody, () => {
    if(fetchBody.value) {
      offersDetailsFetch.refresh();
    }
  }, { immediate: true });

  watch(offersDetailsFetch.status, () => {
    logger.debug('offer details fetch effect handler', { ctrlKey: CtrlKey, status: offersDetailsFetch.status.value });
    if(offersDetailsFetch.status.value === 'error') {
      isError.value = true;
    }
  }, { immediate: true });
});

</script>

<template>
  <ClientOnly>
    <section class="favourites-page">
      <ErrorHelm v-model:is-error="isError" class="favourites-page-error-helm">
        <h1 class="favourites-page-title">
          {{ $t(getI18nResName2('favouritesPage', 'title')) }}
        </h1>
        <OptionButtonGroup
          v-model:active-option-key="activeOptionCtrl"
          class="favourites-page-tabs-control mt-xs-4"
          :ctrl-key="FavouritesOptionButtonGroup"
          role="tablist"
          :options="[
            { ctrlKey: FavouritesOptionButtonFlights, labelResName: getI18nResName2('favouritesPage', 'flightsTab'), shortIcon: 'airplane', enabled: true, role: { role: 'tab', tabPanelId: flightsTabHtmlId }, subtextResName: displayedItems.flights !== undefined ? getI18nResName2('favouritesPage', 'numMarked') : undefined, subtextResArgs: displayedItems.flights !== undefined ? { count: displayedItems.flights.length } : undefined},
            { ctrlKey: FavouritesOptionButtonStays, labelResName: getI18nResName2('favouritesPage', 'staysTab'), shortIcon: 'bed', enabled: true, role: { role: 'tab', tabPanelId: staysTabHtmlId }, subtextResName: displayedItems.flights !== undefined ? getI18nResName2('favouritesPage', 'numMarked') : undefined, subtextResArgs: displayedItems.stays !== undefined ? { count: displayedItems.stays.length } : undefined }
          ]"
        />
        <OfferTabbedView
          :ctrl-key="[...CtrlKey, 'OfferTabView']" 
          :selected-kind="areCtrlKeysEqual(activeOptionCtrl ?? DefaultActiveTabKey, FavouritesOptionButtonFlights) ? 'flights' : 'stays'" 
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
      <ComponentWaitingIndicator :ctrl-key="[...CtrlKey, 'ClientFallback']" class="my-xs-5"/>
    </template>
  </ClientOnly>
</template>
