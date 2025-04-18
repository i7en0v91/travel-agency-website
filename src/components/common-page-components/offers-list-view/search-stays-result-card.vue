<script setup lang="ts">
import { toShortForm, type ControlKey } from './../../../helpers/components';
import { LOADING_STATE } from './../../../helpers/constants';
import { AppPage, getPagePath, type Locale, getLocalizeableValue, getScoreClassResName, getI18nResName2, getI18nResName3, type EntityDataAttrsOnly, type IStayOffer, ImageCategory, isElectronBuild } from '@golobe-demo/shared';
import range from 'lodash-es/range';
import { useNavLinkBuilder } from './../../../composables/nav-link-builder';
import { usePreviewState } from './../../../composables/preview-state';
import { getCommonServices } from '../../../helpers/service-accessors';
import { IconSvgCustomizers } from './../../../helpers/components';

interface IProps {
  ctrlKey: ControlKey,
  offer: EntityDataAttrsOnly<IStayOffer>,
  variant?: 'landscape-xl' | 'landscape-lg'
}
const { ctrlKey, offer, variant = 'landscape-xl' } = defineProps<IProps>();

const { locale, t } = useI18n();
const navLinkBuilder = useNavLinkBuilder();
const userNotificationStore = useUserNotificationStore();
const userAccountStore = useUserAccountStore();
const { requestUserAction } = usePreviewState();

const logger = getCommonServices().getLogger().addContextProps({ component: 'SearchStaysResultCard' });

const isError = ref(false);

const stay = offer.stay;
const scoreClassResName = getScoreClassResName(stay.reviewSummary!.score);
const reviewsCountText = `${stay.reviewSummary!.numReviews} ${t(getI18nResName2('searchOffers', 'reviewsCount'), stay.reviewSummary!.numReviews)}`;

const isFavourite = computed(() => 
  userAccountStore.favourites && userAccountStore.favourites !== LOADING_STATE && 
  userAccountStore.favourites['stays'].includes(offer.id)
);

async function toggleFavourite (): Promise<void> {
  const offerId = offer.id;
  logger.verbose('toggling favourite', { offerId, current: isFavourite.value });
  if(!await requestUserAction(userNotificationStore)) {
    logger.verbose('toggling favourite is not possible in current configuration', { offerId, current: isFavourite.value });
    return;
  }
  const userAccountStore = useUserAccountStore();
  const result = await userAccountStore.toggleFavourite('stays', offerId);
  logger.verbose('favourite toggled', { offerId, isFavourite: result });
}

async function favouriteBtnClick (): Promise<void> {
  logger.debug('favourite button clicked', { ctrlKey, current: isFavourite.value });
  await toggleFavourite();
}

const uiStyling = {
  base: `w-full overflow-hidden h-full grid gap-x-6 grid-rows-searchstaysportrait xl:grid-rows-searchstayslandscape grid-cols-searchstaysportrait xl:grid-cols-searchstayslandscape ${variant === 'landscape-lg' ? 'lg:grid-rows-searchstayslandscape lg:grid-cols-searchstayslandscape' : ''}`,
  background: 'bg-transparent dark:bg-transparent',
  shadow: 'shadow-none',
  rounded: 'rounded-none',
  ring: '!ring-0',
  header: {
    base: 'contents',
  },
  body: {
    base: 'contents',
  },
  footer: {
    base: 'contents'
  }
};      

</script>

<template>
  <ErrorHelm v-model:is-error="isError">
    <div class="w-full h-auto ring-1 ring-gray-200 dark:ring-gray-800 shadow-lg shadow-gray-200 dark:shadow-gray-700 rounded-xl">
      <UCard as="article" :ui="uiStyling">
        <template #header>
          <div :class="`w-full h-auto text-gray-600 dark:text-gray-300 font-semibold text-xl row-start-2 row-end-3 col-start-1 col-end-2 xl:row-start-1 xl:row-end-2 xl:col-start-2 xl:col-end-3 pt-4 pl-4 xl:pl-0 ${variant === 'landscape-lg' ? 'lg:row-start-1 lg:row-end-2 lg:col-start-2 lg:col-end-3 lg:pl-0' : ''}`">
            {{ getLocalizeableValue(offer.stay.name, locale as Locale) }}
          </div>
        </template>

        <div :class="`w-full h-full row-start-1 row-end-2 col-start-1 col-end-3 xl:row-end-4 xl:col-end-2 ${variant === 'landscape-lg' ? 'lg:row-end-4 lg:col-end-2' : ''}`">
          <StaticImage
            :ctrl-key="[...ctrlKey, 'StayPhoto']"
            :src="offer.stay.photo"
            :category="ImageCategory.Hotel"
            sizes="xs:85vw sm:85vw md:85vw lg:75vw xl:30vw"
            :ui="{ 
              wrapper: `w-full h-full rounded-t-xl xl:rounded-t-none xl:rounded-l-xl ${variant === 'landscape-lg' ? 'lg:rounded-t-none lg:rounded-l-xl' : '' }`, 
              stub: `rounded-t-xl xl:rounded-t-none xl:rounded-l-xl ${ variant === 'landscape-lg' ? 'lg:rounded-t-none lg:rounded-l-xl' : '' } `,
              img: `aspect-square object-cover rounded-t-xl xl:rounded-l-xl xl:rounded-tr-none ${ variant === 'landscape-lg'  ? 'lg:rounded-l-xl lg:rounded-tr-none' : ''}` 
            }"
            stub="default"
            :alt="{ resName: getI18nResName2('searchStays', 'hotelPhotoAlt') }"
          />
        </div>
                      
        <div :class="`w-full truncate h-auto row-start-2 row-end-4 col-start-2 col-end-3 xl:row-start-1 xl:row-end-3 xl:col-start-3 xl:col-end-4 mb-4 sm:mb-0 pt-4 pr-4 flex flex-col flex-nowrap items-end ml-auto ${ variant === 'landscape-lg' ? 'lg:row-start-1 lg:row-end-3 lg:col-start-3 lg:col-end-4' : '' }`">
          <div class="w-fit h-auto text-xs leading-none text-gray-500 dark:text-gray-400">
            {{ $t(getI18nResName2('searchOffers', 'startingPrice')) }}
          </div>
          <div class="text-2xl leading-10 font-semibold text-end text-red-400">
            <span>{{ $n(Math.floor(offer.totalPrice.toNumber()), 'currency') }}<wbr>&#47;<span>{{ $t(getI18nResName2('searchStays', 'night')) }}</span></span>
          </div>
          <div class="w-fit h-auto text-xs leading-none text-gray-500 dark:text-gray-400">
            <span>{{ $t(getI18nResName2('searchStays', 'excludingTax')) }}</span>
          </div>
        </div>

        <div :class="`w-full h-auto row-start-3 row-end-4 col-start-1 col-end-3 xl:row-start-2 xl:row-end-3 xl:col-start-2 xl:col-end-3 pl-4 xl:pl-0 ${ variant === 'landscape-lg' ? 'lg:row-start-2 lg:row-end-3 lg:col-start-2 lg:col-end-3 pl-4 lg:pl-0' : '' }`">
          <div class="w-full flex flex-row flex-nowrap items-center mt-2">
            <UIcon 
              name="i-material-symbols-location-on-rounded" 
              mode="svg" 
              class="w-5 h-5 inline-block mr-2"
              :customize="IconSvgCustomizers.opacity(0.7)"
              />
            <div class="w-fit truncate inline-block text-xs text-gray-500 dark:text-gray-400">
              {{ getLocalizeableValue(offer.stay.city.country.name, locale as Locale) }}, {{ getLocalizeableValue(offer.stay.city.name, locale as Locale) }}
            </div>
          </div>
          <div class="w-full flex flex-row flex-wrap items-center gap-2 mt-2">
            <div class="flex-initial flex flex-row flex-nowrap items-center gap-[2px]">
              <UIcon 
                v-for="i in range(0, 5)" 
                :key="`${toShortForm(ctrlKey)}-HotelStar-${i}`" 
                name="i-material-symbols-star" 
                mode="svg" 
                class="w-5 h-5 inline-block" 
                :customize="IconSvgCustomizers.fill('#f87171')"
              />
            </div>
            <div class="flex-initial flex-shrink-0 basis-auto truncate text-xs text-gray-600 dark:text-gray-300 mr-2">
              {{ $t(getI18nResName2('searchStays', 'stayRatingCaption')) }}
            </div>
            <div class="flex-initial flex flex-row flex-nowrap items-center gap-1 self-end">
              <UIcon 
                name="i-ri-cup-fill" 
                mode="svg"
                class="w-5 h-5 inline-block mr-2"
                :customize="IconSvgCustomizers.opacity(0.9)"
              />
              <div class="text-xs text-gray-600 dark:text-gray-300">20+</div>
              <div class="w-full truncate text-xs text-gray-600 dark:text-gray-300">
                {{ $t(getI18nResName3('searchStays', 'filters', 'amenities')) }}
              </div>
            </div>
          </div>
          <div class="w-fit flex flex-row flex-wrap items-center gap-2 mt-2">
            <UBadge 
              :ui="{ 
                base: 'w-fit h-auto p-2 text-center',
                rounded: 'rounded-md'
              }"
              size="sm"
            >
              {{ offer.stay.reviewSummary!.score.toFixed(1) }}
            </UBadge>
            <div class="w-fit h-auto text-xs font-semibold">
              {{ $t(scoreClassResName) }}
            </div>
            <div class="w-fit h-auto text-xs text-gray-500 dark:text-gray-400">
              {{ reviewsCountText }}
            </div>
          </div>
        </div>

        <template #footer>
          <div :class="`p-4 pt-0 xl:pl-0 w-full h-auto row-start-4 row-end-5 col-start-1 col-end-3 xl:row-start-3 xl:row-end-4 xl:col-start-2 xl:col-end-4 ${ variant === 'landscape-lg' ? 'lg:row-start-3 lg:row-end-4 lg:col-start-2 lg:col-end-4 lg:pl-0' : '' }`">
            <UDivider color="gray" orientation="horizontal" class="w-full mt-4" size="xs"/>
            <div class="flex flex-row flex-nowrap gap-4 mt-4 ">
              <ClientOnly>
                <UButton
                  v-if="userAccountStore.isAuthenticated"
                  :ui="{ base: 'aspect-square justify-center' }"
                  size="lg"
                  :icon="isFavourite ? 'i-heroicons-heart-solid' : 'i-heroicons-heart'"
                  variant="outline"
                  color="primary"
                  @click="favouriteBtnClick"
                />
                <template #fallback />
              </ClientOnly>

              <UButton size="lg" class="w-full flex-1" :ui="{ base: 'justify-center text-center' }" variant="solid" color="primary" :to="navLinkBuilder.buildLink(`/${getPagePath(AppPage.StayDetails)}/${offer.id}`, locale as Locale)" :external="false" :target="isElectronBuild() ? '_blank' : undefined">
                {{ $t(getI18nResName2('searchStays', 'viewPlace')) }}
              </UButton>
            </div>
          </div>
        </template>
      </UCard>
    </div>
  </ErrorHelm>
</template>
