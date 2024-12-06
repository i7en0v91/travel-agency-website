<script setup lang="ts">

import { getI18nResName2 } from '@golobe-demo/shared';

interface IProps {
  ctrlKey: string,
  userName: string,
  arrowClass: string
};
defineProps<IProps>();

</script>

<template>
  <div class="w-max h-min z-[3] absolute flex flex-row flex-nowrap items-center gap-2 px-2 rounded-md shadow-md dark:shadow-md dark:shadow-slate-700 bg-white dark:bg-gray-900 booking-ticket-flight-label">
    <div :class="`absolute booking-ticket-flight-arrow ${arrowClass}`" />
    <StaticImage
      :ctrl-key="ctrlKey"
      :asset-src="{ filename: `image-link-flights.webp`, width: 590, height: 550 }"
      sizes="xs:10vw sm:10vw md:30vw lg:30vw xl:30vw"
      :ui="{ wrapper: 'w-[32px] h-[32px] flex-initial rounded-md booking-ticket-flight-img', img: 'w-[32px] h-[32px] rounded-md' }"
      :alt-res-name="getI18nResName2('ticket', 'cityImgAlt')"
      :show-stub="true"
    />
    <div class="block flex-1 w-full h-auto text-primary-900 dark:text-white booking-ticket-flight-texting">
      <div class="w-auto h-auto max-w-[160px] max-h-[60px] whitespace-nowrap truncate text-[16px] font-bold booking-ticket-flight-username">
        {{ userName }}
      </div>
      <div class="w-auto h-auto max-w-[160px] max-h-[60px] whitespace-nowrap truncate text-[14px] booking-ticket-flight-sub">
        {{ $t(getI18nResName2('ticket', 'boardingPass')) }}
      </div>
    </div>
  </div>
</template>
