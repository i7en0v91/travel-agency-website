<script setup lang="ts">
import { type Locale, getI18nResName3, getI18nResName2, type Timestamp, type StayServiceLevel, type EntityId, type Price, ImageCategory, AppPage, getPagePath } from '@golobe-demo/shared';
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
  ctrlKey: string,
  offerId?: EntityId,
  rooms?: IRoomInfo[]
}

withDefaults(defineProps<IProps>(), {
  offerId: undefined,
  rooms: undefined
});

</script>

<template>
  <section class="w-full h-auto">
    <h2 class="w-fit max-w-[90vw] text-3xl font-semibold text-gray-600 dark:text-gray-300 break-words">
      {{ $t(getI18nResName3('stayDetailsPage', 'availableRooms', 'title')) }}
    </h2>
    <div class="w-full overflow-x-auto h-auto">
      <ol class="mt-6 sm:mt-8 pb-2 w-full grid grid-flow-row grid-cols-stayroomsxs sm:grid-cols-stayroomssm items-center gap-4">
        <li v-for="(room, idx) in rooms ?? (range(0, 4).map(_ => undefined))" :key="`${ctrlKey}-Room-${idx}`" class="contents">
          <div class="w-full h-auto block">
            <StaticImage
              :key="`${ctrlKey}-AvailableRoomImage-${idx}`"
              :ctrl-key="`${ctrlKey}-AvailableRoomImage-${idx}`"
              :ui="{ wrapper: 'w-12 h-12 rounded', img: 'rounded', stub: 'rounded' }"
              :entity-src="room?.image"
              :category="ImageCategory.HotelRoom"
              sizes="xs:30vw sm:20vw md:20vw lg:10vw xl:10vw"
              :alt-res-name="getI18nResName2('stayDetailsPage', 'stayServiceImageAlt')"
            />
          </div>
          <div class="w-full h-full flex flex-row flex-wrap items-center text-gray-600 dark:text-gray-300">
            <div v-if="room" class="w-fit h-auto">
              {{ $t(getI18nResName3('stayDetailsPage', 'availableRooms', room.serviceLevel === 'Base' ? 'base' : 'city')) }}
            </div>
            <USkeleton v-else class="w-full h-3" />
          </div>
          <div class="w-full h-full col-start-1 col-end-3 sm:col-start-3 sm:col-end-4 flex flex-row-reverse sm:flex-row flex-nowrap items-center gap-2 justify-between sm:w-full px-1">
            <div class="flex-grow-0 flex-shrink basis-auto text-primary-900 dark:text-white font-bold sm:inline-block">
              <span v-if="room" class="text-2xl">{{ $n(Math.floor(room.price.toNumber()), 'currency') }}<wbr>&#47;<span class="text-base">{{ $t(getI18nResName2('searchStays', 'night')) }}</span></span>
              <USkeleton v-else class="w-10 h-8" />
            </div>
            <UButton size="lg" class="block flex-1 text-center sm:float-right sm:w-auto sm:ml-8 lg:ml-16" :ui="{ base: 'justify-center text-center' }" variant="solid" color="primary" :to="offerId ? navLinkBuilder.buildLink(`/${getPagePath(AppPage.BookStay)}/${offerId!}`, locale as Locale, { serviceLevel: room!.serviceLevel }) : navLinkBuilder.buildLink(route.fullPath, locale as Locale)" :external="false">
              {{ $t(getI18nResName2('offerDetailsPage', 'bookBtn')) }}
            </UButton>
          </div>
        </li>
      </ol>
    </div>
  </section>
</template>
