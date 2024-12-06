<script setup lang="ts">
import { getI18nResName3, type I18nResName } from '@golobe-demo/shared';

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
}

const amenities: IAmenityItem[] = [
  { resName: getI18nResName3('searchStays', 'amenities', 'airConditioner'), icon: 'i-mynaui-air-conditioner' },
  { resName: getI18nResName3('searchStays', 'amenities', 'bar'), icon: 'i-cil-drink-alcohol' },
  { resName: getI18nResName3('searchStays', 'amenities', 'fitness'), icon: 'i-ion-ios-fitness' },
  { resName: getI18nResName3('searchStays', 'amenities', 'frontDesk'), icon: 'i-fluent-person-desktop-20-filled' },
  { resName: getI18nResName3('searchStays', 'amenities', 'indoorPool'), icon: 'i-fluent-swimming-pool-20-filled' },
  { resName: getI18nResName3('searchStays', 'amenities', 'outdoorPool'), icon: 'i-fluent-swimming-pool-20-filled' },
  { resName: getI18nResName3('searchStays', 'amenities', 'restaraunt'), icon: 'i-ep-knife-fork' },
  { resName: getI18nResName3('searchStays', 'amenities', 'roomService'), icon: 'i-mynaui-reception-bell-solid' },
  { resName: getI18nResName3('searchStays', 'amenities', 'teaCoffee'), icon: 'i-ri-cup-fill' },
  { resName: getI18nResName3('searchStays', 'amenities', 'wifi'), icon: 'i-material-symbols-wifi' },
  { resName: getI18nResName3('searchStays', 'amenities', 'spa'), icon: 'i-material-symbols-spa' }
];

const uiStyling = {
  base: 'text-orange-500 dark:text-orange-400',
  variant: {
    link: 'hover:no-underline'
  }
};

</script>

<template>
  <section>
    <h2 class="flex-initial block w-fit max-w-[90vw] text-3xl font-semibold text-gray-600 dark:text-gray-300 break-words">
      {{ $t(getI18nResName3('stayDetailsPage', 'amenities', 'title')) }}
    </h2>
    <ul class="w-full h-auto grid grid-flow-row auto-rows-auto grid-cols-1 sm:grid-cols-stayamenitiessm gap-4 overflow-x-hidden items-center justify-start mt-8 pb-2">
      <li v-for="(amenity, idx) in (listExpanded ? amenities : amenities.slice(0, CollapsedListSize))" :key="`${ctrlKey}-${idx}`" class="w-full h-min overflow-hidden flex flex-row flex-nowrap items-center">
        <UIcon :name="amenity.icon" :class="`w-6 h-6 inline-block mr-2 bg-gray-900 dark:bg-white self-start`"/>
        <span class="w-fit h-full inline-block break-words text-primary-900 dark:text-white font-normal">
          {{ $t(amenity.resName) }}
        </span>
      </li>
      <li class="w-full h-auto">
        <UButton color="orange" variant="link" class="mr-2" :ui="uiStyling" @click="toggleList">
          {{ listExpanded ? $t(getI18nResName3('stayDetailsPage', 'amenities', 'collapseItems')) : $t(getI18nResName3('stayDetailsPage', 'amenities', 'moreItems'), { count: (amenities.length - 1) }) }}
        </UButton>
      </li>
    </ul>
  </section>
</template>
