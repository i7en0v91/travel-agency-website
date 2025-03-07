<script setup lang="ts">
import type { ControlKey } from './../../helpers/components';

import { getI18nResName2 } from '@golobe-demo/shared';

interface IProps {
  ctrlKey: ControlKey,
  userName: string,
  arrowClass: string
};
defineProps<IProps>();

</script>

<template>
  <div class="booking-ticket-flight-label p-xs-2 px brdr-2">
    <div :class="`booking-ticket-flight-arrow ${arrowClass}`" />
    <StaticImage
      :ctrl-key="[...ctrlKey, 'StaticImg']"
      :src="{ filename: `image-link-flights.webp`, width: 590, height: 550 }"
      sizes="xs:10vw sm:10vw md:30vw lg:30vw xl:30vw"
      class="booking-ticket-flight-img brdr-2"
      :alt="{ resName: getI18nResName2('ticket', 'cityImgAlt') }"
      stub="default"
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
