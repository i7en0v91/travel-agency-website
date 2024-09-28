<script setup lang="ts">
import { getI18nResName3, type I18nResName } from '@golobe-demo/shared';
import { TabIndicesUpdateDefaultTimeout, updateTabIndices } from './../../helpers/dom';

interface IProps {
  ctrlKey: string
}

defineProps<IProps>();

const CollapsedListSize = 5;

interface IAmenityItem {
  resName: I18nResName,
  icon: string
}

const listExpanded = ref(false);

function toggleList () {
  listExpanded.value = !listExpanded.value;
  setTimeout(() => updateTabIndices(), TabIndicesUpdateDefaultTimeout);
}

const amenities: IAmenityItem[] = [
  { resName: getI18nResName3('searchStays', 'amenities', 'airConditioner'), icon: 'plus-simple' },
  { resName: getI18nResName3('searchStays', 'amenities', 'bar'), icon: 'cup' },
  { resName: getI18nResName3('searchStays', 'amenities', 'fitness'), icon: 'fitness' },
  { resName: getI18nResName3('searchStays', 'amenities', 'frontDesk'), icon: 'plus-simple' },
  { resName: getI18nResName3('searchStays', 'amenities', 'indoorPool'), icon: 'pool' },
  { resName: getI18nResName3('searchStays', 'amenities', 'outdoorPool'), icon: 'pool' },
  { resName: getI18nResName3('searchStays', 'amenities', 'restaraunt'), icon: 'restaraunt' },
  { resName: getI18nResName3('searchStays', 'amenities', 'roomService'), icon: 'room-service' },
  { resName: getI18nResName3('searchStays', 'amenities', 'spa'), icon: 'spa' },
  { resName: getI18nResName3('searchStays', 'amenities', 'teaCoffee'), icon: 'cup' },
  { resName: getI18nResName3('searchStays', 'amenities', 'wifi'), icon: 'wifi' }
];

</script>

<template>
  <section class="stay-amenities">
    <h2 class="stay-amenities-title">
      {{ $t(getI18nResName3('stayDetailsPage', 'amenities', 'title')) }}
    </h2>
    <ul class="stay-amenities-grid mt-xs-5 pb-xs-2">
      <li v-for="(amenity, idx) in (listExpanded ? amenities : amenities.slice(0, CollapsedListSize))" :key="`${ctrlKey}-${idx}`" class="stay-amenities-item">
        <span :class="`stay-amenities-item-icon amenity-icon-${amenity.icon} mr-xs-2`" />
        <span class="stay-amenities-item-text">
          {{ $t(amenity.resName) }}
        </span>
      </li>
      <SimpleButton
        class="stay-amenities-list-toggler mx-xs-2 p-xs-2"
        :ctrl-key="`${ctrlKey}-ListToggler`"
        :label-res-name="listExpanded ? getI18nResName3('stayDetailsPage', 'amenities', 'collapseItems') : getI18nResName3('stayDetailsPage', 'amenities', 'moreItems')"
        :label-res-args="listExpanded ? undefined : (amenities.length - 1)"
        kind="support"
        @click="toggleList"
      />
    </ul>
  </section>
</template>
