<script setup lang="ts">
import type { ControlKey } from './../../helpers/components';

import { AppPage, type Locale, getI18nResName3, AppConfig, type GeoPoint, type EntityDataAttrsOnly, type ICity } from '@golobe-demo/shared';
import InteractiveMap from './../common-page-components/map/interactive-map.vue';
import ComponentWaitingIndicator from '../forms/component-waiting-indicator.vue';
import { useNavLinkBuilder } from './../../composables/nav-link-builder';

const { t, locale } = useI18n();

interface IProps {
  ctrlKey: ControlKey,
  visibility: 'wait' | 'visible',
  location?: GeoPoint,
  city?: EntityDataAttrsOnly<ICity>
}

defineProps<IProps>();

const navLinkBuilder = useNavLinkBuilder();

const webUrl = ref<string>();

</script>

<template>
  <section>
    <div class="flex flex-row flex-wrap items-center justify-between gap-2">
      <h2 class="flex-initial block w-fit max-w-[90vw] text-3xl font-semibold text-gray-600 dark:text-gray-300 break-words mt-1">
        {{ $t(getI18nResName3('stayDetailsPage', 'location', 'title')) }}
      </h2>
      <UButton v-if="!!AppConfig.maps" size="lg" class="block flex-initial text-center sm:float-right sm:w-auto" :ui="{ base: 'justify-center text-center' }" variant="solid" color="primary" :to="webUrl ?? navLinkBuilder.buildPageLink(AppPage.Index, locale as Locale)" :external="true" target="_blank">
        {{ $t(getI18nResName3('stayDetailsPage', 'location', 'viewOnWebsite'), { webLink: t(AppConfig.maps.providerDisplayResName) }) }}
      </UButton>
    </div>
    <ComponentWaitingIndicator v-if="!location || visibility === 'wait'" :ctrl-key="[...ctrlKey, 'Waiter']" class="my-8" />
    <InteractiveMap
      v-else
      v-model:web-url="webUrl"
      :ctrl-key="[...ctrlKey, 'InteractiveMap']"
      :origin="location"
      :city="city"
      style-class="w-full !h-[450px] rounded-2xl [&:has(.fullscreen)]:rounded-none"
      class="mt-8 rounded-2xl [&:has(.fullscreen)]:rounded-none"
    />
  </section>
</template>
