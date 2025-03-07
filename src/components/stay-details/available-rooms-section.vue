<script setup lang="ts">
import { toShortForm, type ControlKey } from './../../helpers/components';
import { type Locale, getI18nResName3, getI18nResName2, type Timestamp, type StayServiceLevel, type EntityId, type Price, ImageCategory, AppPage, getPagePath } from '@golobe-demo/shared';
import { PerfectScrollbar } from 'vue3-perfect-scrollbar';
import range from 'lodash-es/range';
import { useNavLinkBuilder } from './../../composables/nav-link-builder';

const { locale } = useI18n();
const navLinkBuilder = useNavLinkBuilder();
const route = useRoute();

interface IRoomInfo {
  serviceLevel: StayServiceLevel,
  price: Price,
  image: {
    slug: string,
    timestamp: Timestamp
  }
}

interface IProps {
  ctrlKey: ControlKey,
  offerId?: EntityId,
  rooms?: IRoomInfo[]
}

defineProps<IProps>();

</script>

<template>
  <section class="stay-available-rooms">
    <h2 class="available-rooms-title">
      {{ $t(getI18nResName3('stayDetailsPage', 'availableRooms', 'title')) }}
    </h2>
    <div class="available-rooms-list-div">
      <PerfectScrollbar
        :options="{
          suppressScrollY: true,
          wheelPropagation: true
        }"
        :watch-options="false"
        tag="div"
        class="stay-details-overview-highlights-scroll"
      >
        <ol class="available-rooms-list mt-xs-4 mt-s-5 pb-xs-2">
          <li v-for="(room, idx) in rooms ?? (range(0, 4).map(_ => undefined))" :key="`${toShortForm(ctrlKey)}-Room-${idx}`" class="available-room">
            <div class="available-room-image-div">
              <StaticImage
                :key="`${toShortForm(ctrlKey)}-AvailableRoomImage-${idx}`"
                :ctrl-key="[...ctrlKey, 'StaticImg', idx]"
                class="available-room-image"
                :src="room?.image"
                :category="ImageCategory.HotelRoom"
                sizes="xs:30vw sm:20vw md:20vw lg:10vw xl:10vw"
                :alt="{ resName: getI18nResName2('stayDetailsPage', 'stayServiceImageAlt') }"
              />
            </div>
            <div class="available-room-description-div px-xs-3">
              <div v-if="room" class="available-room-description">
                {{ $t(getI18nResName3('stayDetailsPage', 'availableRooms', room.serviceLevel === 'Base' ? 'base' : 'city')) }}
              </div>
              <div v-else class="data-loading-stub text-data-loading" />
            </div>
            <div class="available-room-booking">
              <div class="available-room-price pt-s-2">
                <span v-if="room">{{ $n(Math.floor(room.price.toNumber()), 'currency') }}<wbr>&#47;<span class="stays-price-night">{{ $t(getI18nResName2('searchStays', 'night')) }}</span></span>
                <div v-else class="data-loading-stub text-data-loading" />
              </div>
              <NuxtLink class="btn btn-primary available-room-book-btn brdr-1" :to="offerId ? navLinkBuilder.buildLink(`/${getPagePath(AppPage.BookStay)}/${offerId!}`, locale as Locale, { serviceLevel: room!.serviceLevel }) : navLinkBuilder.buildLink(route.fullPath, locale as Locale)">
                {{ $t(getI18nResName2('offerDetailsPage', 'bookBtn')) }}
              </NuxtLink>
            </div>
          </li>
        </ol>
      </PerfectScrollbar>
    </div>
  </section>
</template>
