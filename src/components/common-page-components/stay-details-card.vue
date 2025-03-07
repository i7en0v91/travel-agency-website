<script setup lang="ts">
import type { ControlKey } from './../../helpers/components';
import { type Locale, getLocalizeableValue, getI18nResName2, getI18nResName3, type StayServiceLevel, type EntityDataAttrsOnly, type ICity, type ILocalizableValue } from '@golobe-demo/shared';
import StayInterval from '~/public/img/stay-interval.svg';

interface IProps {
  ctrlKey: ControlKey,
  serviceLevel: StayServiceLevel,
  name?: ILocalizableValue,
  price?: number,
  city?: EntityDataAttrsOnly<ICity>,
  checkIn?: Date,
  checkOut?: Date
}
defineProps<IProps>();

const { locale } = useI18n();
const isError = ref(false);

const uiStyling = {
  base: 'w-full h-auto flex flex-col flex-nowrap gap-0 items-stretch',
  background: 'bg-transparent dark:bg-transparent',
  rounded: 'rounded-2xl',
  shadow: 'shadow-lg shadow-gray-200 dark:shadow-gray-700',
  divide: 'divide-none',
  body: {
    base: 'mx-2',
    padding: 'pt-0 sm:pt-0'
  },
  footer: {
    base: 'hidden'
  },
};


</script>

<template>
  <ErrorHelm v-model:is-error="isError">
    <UCard as="article" :ui="uiStyling">
      <template #header>
        <div class="w-full h-auto">
          <div class="w-full h-auto flex flex-row flex-wrap justify-between items-baseline gap-4 mb-4">
            <h1 class="flex-1 w-full whitespace-normal text-primary-900 dark:text-white font-semibold text-xl">
              {{ $t(getI18nResName3('stayDetailsPage', 'availableRooms', serviceLevel === 'Base' ? 'base' : 'city')) }}
            </h1>
            <div class="flex-initial basis-auto">
              <span v-if="price" class="font-semibold text-3xl text-red-400">{{ $n(Math.floor(price), 'currency') }}<wbr>&#47;<span>{{ $t(getI18nResName2('searchStays', 'night')) }}</span></span>
              <USkeleton v-else class="w-1/6 h-9" />
            </div>
          </div>
        </div>

        <div class="w-full max-w-[80vw] overflow-hidden h-auto p-2 flex flex-col flex-nowrap items-center">
          <div class="flex-1 w-full basis-auto max-w-fit block">
            <div class="w-full h-auto">
              <div class="w-fit h-min px-8 py-4 flex flex-row flex-wrap items-center justify-center gap-4 sm:gap-6 ring-1 ring-primary-400 dark:ring-primary-700 rounded-xl">
                <div class="flex-initial w-min h-auto min-w-20 min-h-20 aspect-square font-ticket flex flex-col flex-nowrap items-center justify-center text-center">
                  <div v-if="name" class="text-[0.625rem] text-center break-words mt-1">
                    {{ getLocalizeableValue(name, locale as Locale) }}
                  </div>
                  <UDivider orientation="horizontal" class="w-full my-1" :ui="{ border: { base: 'border-primary-700 dark:border-slate-200' } }" size="2xs"/>
                  <div v-if="city" class="text-[0.625rem] text-center break-words">
                    {{ getLocalizeableValue(city.name, locale as Locale) }}
                  </div>
                </div>
                <div class="flex-1 w-fit h-full flex flex-col flex-nowrap gap-3 justify-center items-start py-2">
                  <div v-if="name" class="block w-auto h-auto break-words text-2xl font-semibold text-primary-900 dark:text-white">
                    {{ getLocalizeableValue(name, locale as Locale) }}
                  </div>
                  <USkeleton v-else class="w-[20vw] h-8" />
                  <div v-if="city" class="w-full h-auto whitespace-normal text-sm sm:text-base font-normal">
                    <div class="flex flex-row flex-nowrap items-center">
                      <UIcon name="i-material-symbols-location-on-rounded" class="flex-initial w-5 h-5 inline-block float-left bg-primary-900 dark:bg-white mr-2"/>
                      <span v-if="city" class="flex-1 w-fit break-words inline-block text-sm sm:text-base text-gray-500 dark:text-gray-400">
                        {{ getLocalizeableValue(city.country.name, locale as Locale) }}, {{ getLocalizeableValue(city.name, locale as Locale) }}
                      </span>
                      <USkeleton v-else class="w-1/3 h-4" />
                    </div>
                  </div>
                  <USkeleton v-else class="w-1/3 h-4" />
                </div>
              </div>
            </div>
          </div>
          
          <div class="flex-1 w-full max-w-[80vw] h-auto overflow-x-auto">
            <div class="w-fit flex flex-row flex-nowrap items-center justify-start gap-5 md:gap-20 mt-10 pb-2 mx-auto">
              <div class="flex flex-row flex-wrap items-baseline gap-2 w-fit">
                <div v-if="checkIn" class="whitespace-nowrap text-primary-900 dark:text-white font-semibold text-xl">
                  {{ $d(checkIn, 'day') }}
                </div>
                <USkeleton v-else class="w-16 h-8" />
                <div class="whitespace-normal text-sm sm:text-base font-normal text-gray-600 dark:text-gray-300">
                  {{ $t(getI18nResName2('stayDetailsCard', 'checkIn')) }}
                </div>
              </div>
              <StayInterval class="flex-initial !min-w-40 !w-40 !h-auto"/>
              <div class="flex flex-row flex-wrap items-baseline gap-2 w-fit justify-end">
                <div v-if="checkOut" class="whitespace-nowrap text-primary-900 dark:text-white font-semibold text-xl text-end">
                  {{ $d(checkOut, 'day') }}
                </div>
                <USkeleton v-else class="w-16 h-8" />
                <div class="whitespace-normal text-sm sm:text-base font-normal text-gray-600 dark:text-gray-300 text-end">
                  {{ $t(getI18nResName2('stayDetailsCard', 'checkOut')) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </UCard>
  </ErrorHelm>
</template>
