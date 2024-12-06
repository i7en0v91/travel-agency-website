<script setup lang="ts">
import { AppPage, getPagePath, type Locale, getLocalizeableValue, getScoreClassResName, getI18nResName2, getI18nResName3, type EntityDataAttrsOnly, type IStayOffer, type OfferKind, ImageCategory } from '@golobe-demo/shared';
import range from 'lodash-es/range';
import { useUserFavouritesStore } from './../../../stores/user-favourites-store';
import { useOfferFavouriteStatus } from './../../../composables/offer-favourite-status';
import { useNavLinkBuilder } from './../../../composables/nav-link-builder';
import { usePreviewState } from './../../../composables/preview-state';
import { getCommonServices } from '../../../helpers/service-accessors';

interface IProps {
  ctrlKey: string,
  offer: EntityDataAttrsOnly<IStayOffer>
}
const props = withDefaults(defineProps<IProps>(), {
});

const { status } = useAuth();
const { locale, t } = useI18n();
const navLinkBuilder = useNavLinkBuilder();
const { requestUserAction } = usePreviewState();

const logger = getCommonServices().getLogger();

const isError = ref(false);

const stay = props.offer.stay;
const scoreClassResName = getScoreClassResName(stay.reviewSummary!.score);
const reviewsCountText = `${stay.reviewSummary!.numReviews} ${t(getI18nResName2('searchOffers', 'reviewsCount'), stay.reviewSummary!.numReviews)}`;

const userFavouritesStore = useUserFavouritesStore();
const favouriteStatusWatcher = useOfferFavouriteStatus(props.offer.id, props.offer.kind);

async function toggleFavourite (): Promise<void> {
  const offerId = props.offer.id;
  logger.verbose(`(SearchStayResultCard) toggling favourite, offerId=${offerId}, current=${favouriteStatusWatcher.isFavourite}`);
  if(!await requestUserAction()) {
    logger.verbose(`(SearchStayResultCard) favourite hasn't been toggled - not available in preview mode, offerId=${offerId}, current=${favouriteStatusWatcher.isFavourite}`);
    return;
  }
  const store = await userFavouritesStore.getInstance();
  const result = await store.toggleFavourite(offerId, 'stays' as OfferKind, props.offer);
  logger.verbose(`(SearchStayResultCard) favourite toggled, offerId=${offerId}, isFavourite=${result}`);
}

async function favouriteBtnClick (): Promise<void> {
  logger.debug(`(SearchStayResultCard) favourite button clicked, ctrlKey=${props.ctrlKey}, current=${favouriteStatusWatcher.isFavourite}`);
  await toggleFavourite();
}

const uiStyling = {
  base: 'w-full overflow-hidden h-full grid gap-x-6 grid-rows-searchstaysportrait xl:grid-rows-searchstayslandscape grid-cols-searchstaysportrait xl:grid-cols-searchstayslandscape',
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
          <div class="w-full h-auto text-gray-600 dark:text-gray-300 font-semibold text-xl row-start-2 row-end-3 col-start-1 col-end-2 xl:row-start-1 xl:row-end-2 xl:col-start-2 xl:col-end-3 pt-4 pl-4 xl:pl-0">
            {{ getLocalizeableValue(offer.stay.name, locale as Locale) }}
          </div>
        </template>

        <div class="w-full h-full row-start-1 row-end-2 col-start-1 col-end-3 xl:row-end-4 xl:col-end-2">
          <StaticImage
            :ctrl-key="`${ctrlKey}-StayPhoto`"
            :entity-src="props.offer.stay.photo"
            :category="ImageCategory.Hotel"
            sizes="xs:85vw sm:85vw md:85vw lg:75vw xl:30vw"
            :ui="{ 
              wrapper: 'w-full h-full rounded-t-xl xl:rounded-t-none xl:rounded-l-xl', 
              stub: 'rounded-t-xl xl:rounded-t-none xl:rounded-l-xl',
              img: 'aspect-square object-cover rounded-t-xl xl:rounded-l-xl xl:rounded-tr-none' 
            }"
            :show-stub="true"
            :alt-res-name="getI18nResName2('searchStays', 'hotelPhotoAlt')"
          />
        </div>
                      
        <div class="w-full truncate h-auto row-start-2 row-end-4 col-start-2 col-end-3 xl:row-start-1 xl:row-end-3 xl:col-start-3 xl:col-end-4 mb-4 sm:mb-0 pt-4 pr-4 flex flex-col flex-nowrap items-end ml-auto">
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

        <div class="w-full h-auto row-start-3 row-end-4 col-start-1 col-end-3 xl:row-start-2 xl:row-end-3 xl:col-start-2 xl:col-end-3 pl-4 xl:pl-0">
          <div class="w-full mt-2">
            <UIcon name="i-material-symbols-location-on-rounded" class="w-5 h-5 inline-block opacity-70 mr-2"/>
            <div class="w-fit truncate inline-block text-xs text-gray-500 dark:text-gray-400">
              {{ getLocalizeableValue(offer.stay.city.country.name, locale as Locale) }}, {{ getLocalizeableValue(offer.stay.city.name, locale as Locale) }}
            </div>
          </div>
          <div class="w-full flex flex-row flex-wrap items-center gap-2 mt-2">
            <div class="flex-initial flex flex-row flex-nowrap items-center gap-[2px]">
              <UIcon v-for="i in range(0, 5)" :key="`${props.ctrlKey}-HotelStar-${i}`" name="i-material-symbols-star" class="w-5 h-5 bg-red-400 inline-block" />
            </div>
            <div class="flex-initial flex-shrink-0 basis-auto truncate text-xs text-gray-600 dark:text-gray-300 mr-2">
              {{ $t(getI18nResName2('searchStays', 'stayRatingCaption')) }}
            </div>
            <div class="flex-initial flex flex-row flex-nowrap items-center gap-1 self-end">
              <UIcon name="i-ri-cup-fill" class="w-5 h-5 inline-block opacity-90 mr-2" />
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
          <div class="p-4 pt-0 xl:pl-0 w-full h-auto row-start-4 row-end-5 col-start-1 col-end-3 xl:row-start-3 xl:row-end-4 xl:col-start-2 xl:col-end-4">
            <UDivider color="gray" orientation="horizontal" class="w-full mt-4" size="xs"/>
            <div class="flex flex-row flex-nowrap gap-4 mt-4 ">
              <UButton
                v-if="status === 'authenticated'"
                :ui="{ base: 'aspect-square justify-center' }"
                size="lg"
                :icon="favouriteStatusWatcher.isFavourite ? 'i-heroicons-heart-solid' : 'i-heroicons-heart'"
                variant="outline"
                color="primary"
                @click="favouriteBtnClick"
              />

              <UButton size="lg" class="w-full flex-1" :ui="{ base: 'justify-center text-center' }" variant="solid" color="primary" :to="navLinkBuilder.buildLink(`/${getPagePath(AppPage.StayDetails)}/${props.offer.id}`, locale as Locale)" :external="false">
                {{ $t(getI18nResName2('searchStays', 'viewPlace')) }}
              </UButton>
            </div>
          </div>
        </template>
      </UCard>
    </div>
  </ErrorHelm>
</template>
