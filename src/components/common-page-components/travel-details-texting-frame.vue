<script setup lang="ts">
import { PerfectScrollbar } from 'vue3-perfect-scrollbar';
import { type ITravelDetailsTextingData, type EntityId } from './../../shared/interfaces';
import { getI18nResName2 } from './../../shared/i18n';

interface IProps {
  ctrlKey: string,
  cityId?: EntityId,
  texting?: ITravelDetailsTextingData,
  isInitial?: boolean
};

const props = withDefaults(defineProps<IProps>(), {
  texting: undefined,
  cityId: undefined,
  tabbable: undefined
});

const { locale } = useI18n();
const localePath = useLocalePath();

const fadeIn = ref<boolean | undefined>(undefined);
const cssClass = computed(() => {
  if (!props.texting) {
    return props.isInitial ? 'initialized' : 'initializing';
  }
  if (fadeIn.value) {
    return 'initialized loaded fadein';
  } else {
    return 'initialized loaded';
  }
});

function setFrame (isFront: boolean) {
  fadeIn.value = isFront;
}

defineExpose({
  setFrame
});

</script>

<template>
  <div :class="`travel-details-frame travel-details-texting-frame p-xs-4 brdr-4 ${cssClass}`">
    <div class="travel-details-texting-header">
      <div class="travel-details-texting-price brdr-2 p-xs-2 ml-xs-2">
        {{ $t(getI18nResName2('travelDetails', 'priceFrom')) }}
        <div :class="`${texting?.price ? 'travel-details-price-value' : 'data-loading-stub text-data-loading'} mt-xs-1`">
          {{ texting?.price ? `\$${texting?.price}` : '&nbsp;' }}
        </div>
      </div>
      <div :class="`${texting?.header ? 'travel-details-texting-title' : 'data-loading-stub text-data-loading'}`" role="heading" aria-level="3">
        {{ texting?.header ? (texting?.header as any)[locale] : '&nbsp;' }}
      </div>
    </div>
    <PerfectScrollbar
      :options="{
        suppressScrollX: true,
        wheelPropagation: true
      }"
      :watch-options="false"
      tag="div"
      :class="texting?.text ? 'travel-details-texting-paragraph mt-xs-3' : 'data-loading-stub text-data-loading'"
    >
      {{ texting?.text ? (texting?.text as any)[locale] : '&nbsp;' }}
    </PerfectScrollbar>
    <NuxtLink :class="`btn btn-primary brdr-1 travel-details-book-btn ${ (!fadeIn && !isInitial) ? 'nontabbable' : '' }`" :to="props.cityId ? localePath('/flights') /**TODO: update link to flights listing */ : localePath('/stays')">
      {{ $t(getI18nResName2('travelDetails', 'btn')) }}
    </NuxtLink>
  </div>
</template>
