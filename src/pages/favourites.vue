<script setup lang="ts">
import { type OfferKind, AppException, AppExceptionCodeEnum, getI18nResName2, getI18nResName3 } from '@golobe-demo/shared';
import { FavouritesTabStays, FavouritesTabGroup, FavouritesTabFlights } from './../helpers/constants';
import { defaultErrorHandler } from './../helpers/exceptions';
import TabsGroup from '../components/forms/tabs-group.vue';
import FlightsListItemCard from './../components/common-page-components/offers-list-view/search-flights-result-card.vue';
import StaysListItemCard from './../components/common-page-components/offers-list-view/search-stays-result-card.vue';
import { useUserFavouritesStore } from './../stores/user-favourites-store';
import ComponentWaitingIndicator from '../components/forms/component-waiting-indicator.vue';
import { getCommonServices } from '../helpers/service-accessors';

definePageMeta({
  middleware: 'auth',
  auth: true,
  title: { resName: getI18nResName2('favouritesPage', 'title'), resArgs: undefined }
});
useOgImage();

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

const activeTabKey = ref<string | undefined>();

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
  <div class="px-[14px] py-[27px] sm:px-[20px] md:px-[40px] xl:px-[104px]">
    <h1 class="text-4xl font-semibold w-fit max-w-[90vw] break-words text-black dark:text-white mb-10">
      {{ $t(getI18nResName2('favouritesPage', 'title')) }}
    </h1>

    <ClientOnly>
      <ErrorHelm v-model:is-error="isError">
        <TabsGroup
          v-model:activeTabKey="activeTabKey"
          :ctrl-key="FavouritesTabGroup"
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
              ctrl-key="favouritesList" 
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
        <ComponentWaitingIndicator ctrl-key="FavouritesPageClientFallback" class="my-8"/>
      </template>
    </ClientOnly>
  </div>
</template>
