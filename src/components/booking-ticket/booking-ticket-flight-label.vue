<script setup lang="ts">
import type { ControlKey } from './../../helpers/components';

import { getI18nResName2 } from '@golobe-demo/shared';
import RefArrow from '~/public/img/ref-arrow.svg';

interface IProps {
  ctrlKey: ControlKey,
  userName: string,
  ui: {
    arrow: string
  }
};
defineProps<IProps>();

</script>

<template>
  <div class="w-max h-min z-[3] absolute flex flex-row flex-nowrap items-center gap-2 px-2 rounded-md shadow-md dark:shadow-md dark:shadow-slate-700 bg-white dark:bg-gray-900">
    <RefArrow :class="`absolute block w-[12px] h-[8px] *:!fill-white dark:*:!fill-gray-900 ${ui.arrow}`" />
    <StaticImage
      :ctrl-key="[...ctrlKey, 'StaticImg']"
      :src="{ filename: `image-link-flights.webp`, width: 590, height: 550 }"
      sizes="xs:10vw sm:10vw md:30vw lg:30vw xl:30vw"
      :ui="{ wrapper: 'w-[32px] h-[32px] flex-initial rounded-md', img: 'w-[32px] h-[32px] rounded-md' }"
      :alt="{ resName: getI18nResName2('ticket', 'cityImgAlt') }"
      stub="default"
    />
    <div class="block flex-1 w-full h-auto text-primary-900 dark:text-white">
      <div class="w-auto h-auto max-w-[160px] max-h-[60px] whitespace-nowrap truncate text-[16px] font-bold">
        {{ userName }}
      </div>
      <div class="w-auto h-auto max-w-[160px] max-h-[60px] whitespace-nowrap truncate text-[14px]">
        {{ $t(getI18nResName2('ticket', 'boardingPass')) }}
      </div>
    </div>
  </div>
</template>
