<script setup lang="ts">
import { type OfferKind, getI18nResName2, getI18nResName3 } from '@golobe-demo/shared';
import { mapLoadOffersResult } from './../helpers/entity-mappers';
import { ApiEndpointLoadOffers, type ILoadOffersDto } from './../server/api-definitions';
import TabsGroup from '../components/forms/tabs-group.vue';
import FlightsListItemCard from './../components/common-page-components/offers-list-view/search-flights-result-card.vue';
import StaysListItemCard from './../components/common-page-components/offers-list-view/search-stays-result-card.vue';
import ComponentWaitingIndicator from '../components/forms/component-waiting-indicator.vue';
import { getCommonServices } from '../helpers/service-accessors';
import type { ControlKey } from './../helpers/components';
import { LOADING_STATE } from '../helpers/constants';

definePageMeta({
  middleware: 'auth',
  auth: true,
  title: { resName: getI18nResName2('favouritesPage', 'title'), resArgs: undefined }
});
useOgImage();

const CtrlKey: ControlKey = ['Page', 'Favourites'];
const FavouritesTabControl: ControlKey = [...CtrlKey, 'TabGroup'];
const FavouritesTabFlights: ControlKey = [...FavouritesTabControl, 'Flights', 'Tab'];
const FavouritesTabStays: ControlKey = [...FavouritesTabControl, 'Stays', 'Tab'];

const nuxtApp = useNuxtApp();
const logger = getCommonServices().getLogger().addContextProps({ component: 'Favourites' });
const userAccountStore = useUserAccountStore();
const { enabled } = usePreviewState();

const isError = ref(false);

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

const activeTabKey = ref<ControlKey | undefined>();

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

const OfferKinds: OfferKind[] = ['flights', 'stays'];
const tabProps = computed(() => OfferKinds.map(offerKind => {
  return {
    ctrlKey: offerKind === 'flights' ? FavouritesTabFlights : FavouritesTabStays,
    enabled: true,
    label: {
      slotName: offerKind
    },
    slotName: `${offerKind}List`,
    items: displayedItems.value[offerKind]
  };
}));

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
  <div class="px-[14px] py-[27px] sm:px-[20px] md:px-[40px] xl:px-[104px]">
    <h1 class="text-4xl font-semibold w-fit max-w-[90vw] break-words text-black dark:text-white mb-10">
      {{ $t(getI18nResName2('favouritesPage', 'title')) }}
    </h1>

    <ClientOnly>
      <ErrorHelm v-model:is-error="isError">
        <TabsGroup
          v-model:active-tab-key="activeTabKey"
          :ctrl-key="FavouritesTabControl"
          :tabs="tabProps"
          variant="split"
          :ui="{
            list: {
              height: 'h-14 sm:h-20'
            }
          }"
        >
          <template v-for="(slotName) in OfferKinds" #[slotName]="{ tab }" :key="`FavouritesPage-TabLabel-${slotName}`">
            <div class="w-full p-2 sm:py-3 flex flex-row flex-nowrap gap-2 items-center justify-center sm:justify-start">
              <UIcon :name="slotName === 'flights' ? 'i-material-symbols-flight' : 'i-material-symbols-bed'" class="flex-initial min-w-5 h-5 block sm:hidden"/>
              <div class="w-auto flex-1 flex flex-col flex-nowrap items-start truncate">
                <div class="whitespace-nowrap font-semibold text-start">
                  {{ $t(getI18nResName2('favouritesPage', slotName === 'flights' ? 'flightsTab' : 'staysTab')) }}
                </div>
                <div v-if="tab.items !== undefined" class="w-full h-auto hidden sm:block">
                  <div class="text-gray-400 dark:text-gray-500 mt-2 font-normal text-start">
                    {{ $t(getI18nResName2('favouritesPage', 'numMarked'), tab.items.length) }}
                  </div>
                </div>
              </div>
            </div>
          </template>

          <template v-for="(slotName) in OfferKinds" #[`${slotName}List`] :key="`FavouritesPage-TabContent-${slotName}`">
            <OfferTabbedView
              :ctrl-key="[...CtrlKey, 'OfferTabView']" 
              :selected-kind="slotName" 
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
          </template>
        </TabsGroup>
      </ErrorHelm>

      <template #fallback>
        <ComponentWaitingIndicator :ctrl-key="[...CtrlKey, 'ClientFallback']" class="my-8"/>
      </template>
    </ClientOnly>
  </div>
</template>
