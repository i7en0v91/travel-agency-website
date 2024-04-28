<script setup lang="ts">

import { getI18nResName2 } from './../../shared/i18n';

interface IProps {
  ctrlKey: string,
  userName: string,
  arrowClass: string
};
defineProps<IProps>();

</script>

<template>
  <div class="booking-ticket-flight-label p-xs-2 px brdr-2">
    <div :class="`booking-ticket-flight-arrow ${arrowClass}`" />
    <StaticImage
      :ctrl-key="ctrlKey"
      :asset-src="{ filename: `image-link-flights.webp`, width: 590, height: 550 }"
      sizes="xs:10vw sm:10vw md:30vw lg:30vw xl:30vw"
      class="booking-ticket-flight-img brdr-2"
      :alt-res-name="getI18nResName2('ticket', 'cityImgAlt')"
      :show-stub="true"
    />
    <div class="booking-ticket-flight-texting">
      <div class="booking-ticket-flight-username">
        {{ userName }}
      </div>
      <div class="booking-ticket-flight-sub">
        {{ $t(getI18nResName2('ticket', 'boardingPass')) }}
      </div>
    </div>
  </div>
</template>
