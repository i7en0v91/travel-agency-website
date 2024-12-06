<script setup lang="ts">
import { type Locale, getLocalizeableValue, getValueForFlightDayFormatting, getValueForTimeOfDayFormatting, getValueForFlightDurationFormatting, extractAirportCode, getI18nResName2, getI18nResName3, type EntityDataAttrsOnly, type ICity, ImageCategory, type ILocalizableValue, type IAirlineCompany } from '@golobe-demo/shared';
import type { Decimal } from 'decimal.js';
import FlightPlane from '~/public/img/flight-transition.svg';

interface IProps {
  ctrlKey: string,
  departCity?: EntityDataAttrsOnly<ICity>,
  arriveCity?: EntityDataAttrsOnly<ICity>,
  departTimeUtc?: Date,
  arriveTimeUtc?: Date,
  airlineCompany?: EntityDataAttrsOnly<IAirlineCompany>,
  airplaneName?: ILocalizableValue,
  utcOffsetMinutes?: number,
  kind: 'depart' | 'arrive',
  ui: {
    tag: 'h1' | 'h2' | 'div',
    layout: 'portrait' | 'landscape'
  },
  additionalInfo?: {
    price?: Decimal
  }
}
const props = withDefaults(defineProps<IProps>(), {
  departCity: undefined,
  arriveCity: undefined,
  departTimeUtc: undefined,
  arriveTimeUtc: undefined,
  airlineCompany: undefined,
  airplaneName: undefined,
  additionalInfo: undefined,
  utcOffsetMinutes: undefined
});

const { locale, t, d } = useI18n();
const isError = ref(false);

const flightDateText = computed(() => props.departTimeUtc ? (t(getI18nResName3('flightDetailsCard', 'direction', props.kind), { date: d(getValueForFlightDayFormatting(props.departTimeUtc, props.utcOffsetMinutes!), 'day') })) : undefined);
const featureIcons: string[] = ['i-material-symbols-flight', 'i-material-symbols-wifi', 'i-ion-stopwatch', 'i-material-symbols-fastfood', 'i-material-symbols-airline-seat-recline-extra'];

const uiStyling = {
  base: 'w-full max-w-[90vw] h-auto flex flex-col flex-nowrap gap-0 items-stretch',
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
          <div v-if="additionalInfo" class="w-full h-auto flex flex-row flex-wrap justify-between items-center gap-4 mb-4">
            <component :is="ui.tag" v-if="airplaneName" class="flex-1 truncate w-full  text-primary-900 dark:text-white font-semibold text-xl">
              {{ getLocalizeableValue(airplaneName, locale as Locale) }}
            </component>
            <USkeleton v-else class="w-3/4 h-5" />
            <div class="flex-initial basis-auto">
              <span v-if="additionalInfo.price" class="font-semibold text-3xl text-red-400">{{ $n(Math.floor(additionalInfo.price.toNumber()), 'currency') }}</span>
              <USkeleton v-else class="w-1/6 h-9" />
            </div>
          </div>
          <div class="w-full flex flex-row flex-nowrap justify-between items-center gap-4">
            <div v-if="departTimeUtc" class="flex-auto w-fit whitespace-normal font-semibold text-xl text-primary-900 dark:text-white">
              {{ flightDateText }}
            </div>
            <USkeleton v-else class="w-1/2 h-7" />
            <div v-if="departTimeUtc" class="flex-initial whitespace-nowrap font-normal text-sm sm:text-base truncate text-gray-600 dark:text-gray-300">
              {{ $t(getI18nResName2('searchFlights', 'flightDuration'), getValueForFlightDurationFormatting(departTimeUtc!, arriveTimeUtc!)) }}
            </div>
            <USkeleton v-else class="w-1/6 h-4" />
          </div>
        </div>
      </template>

      <div class="w-full overflow-x-hidden h-auto">
        <div :class="`w-full h-auto py-2 flex ${ ui.layout === 'portrait' ? 'flex-col flex-nowrap items-center' : 'flex-row flex-wrap items-center justify-between' }`">
          <div class="w-full flex-1 basis-auto max-w-fit block">
            <div class="w-full h-auto px-2">
              <div class="w-fit max-w-[80vw] flex flex-row flex-wrap items-center px-4 sm:px-6 py-4 pl-0 sm:pl-0 h-min ring-1 ring-gray-400 dark:ring-gray-500 rounded-xl">
                <StaticImage
                  :ctrl-key="`${ctrlKey}-CompanyLogo`"
                  :ui="{ wrapper: 'm-4 sm:m-6 w-16 h-16 min-w-16 min-h-16', img: 'object-cover' }"
                  :entity-src="airlineCompany?.logoImage"
                  :category="ImageCategory.AirlineLogo"
                  :show-stub="false"
                  :request-extra-display-options="true"
                  sizes="xs:30vw sm:30vw md:20vw lg:20vw xl:20vw"
                  :alt-res-name="getI18nResName2('searchFlights', 'airlineCompanyLogoAlt')"
                />
                <div class="flex-auto w-auto h-full flex flex-col flex-nowrap gap-3 justify-center items-start ml-4">
                  <div v-if="airlineCompany" class="block w-auto h-auto break-words text-2xl font-semibold text-primary-900 dark:text-white">
                    {{ getLocalizeableValue(airlineCompany!.name, locale as Locale) }}
                  </div>
                  <USkeleton v-else class="w-[20vw] h-8" />
                  <div v-if="airplaneName" class="w-full h-auto break-words text-sm sm:text-base font-normal text-gray-600 dark:text-gray-300">
                    {{ getLocalizeableValue(airplaneName!, locale as Locale) }}
                  </div>
                  <USkeleton v-else class="w-1/3 h-4" />
                </div>
              </div>
            </div>
          </div>
          
          <div class="flex-1 min-w-36 max-w-56 w-full h-auto mt-4 px-4 ">
            <ul class="w-full h-auto grid grid-flow-row auto-rows-auto grid-cols-flightofferfeatures gap-4">
              <li v-for="icon in featureIcons" :key="`${ctrlKey}-Feature-${icon}`">
                <UIcon :name="icon" class="w-6 h-6 inline-block bg-gray-900 dark:bg-white"/>
              </li>
            </ul>
          </div>
          
          <div class="block w-full h-min overflow-x-auto">
            <div class="w-fit flex flex-row flex-nowrap items-center justify-start gap-5 md:gap-20 mt-10 pb-2 mx-auto">
              <div class="flex flex-row flex-wrap items-baseline gap-2 w-fit">
                <div v-if="departTimeUtc" class="whitespace-nowrap text-primary-900 dark:text-white font-semibold text-xl">
                  {{ $d(getValueForTimeOfDayFormatting(departTimeUtc!, utcOffsetMinutes!), 'daytime') }}
                </div>
                <USkeleton v-else class="w-16 h-8" />
                <div v-if="departCity" class="whitespace-normal text-sm sm:text-base font-normal text-gray-600 dark:text-gray-300">
                  {{ `${getLocalizeableValue(departCity!.name, locale as Locale)}(${extractAirportCode(getLocalizeableValue(departCity!.name, locale as Locale))})` }}
                </div>
                <USkeleton v-else class="w-32 h-4 mt-2" />
              </div>
              <FlightPlane class="flex-initial !min-w-40 !w-40 !h-auto"/>
              <div class="flex flex-row flex-wrap items-baseline gap-2 w-fit justify-end">
                <div v-if="arriveTimeUtc" class="whitespace-nowrap text-primary-900 dark:text-white font-semibold text-xl text-end">
                  {{ $d(getValueForTimeOfDayFormatting(arriveTimeUtc!, utcOffsetMinutes!), 'daytime') }}
                </div>
                <USkeleton v-else class="w-16 h-8" />
                <div v-if="arriveCity" class="whitespace-normal text-sm sm:text-base font-normal text-gray-600 dark:text-gray-300 text-end">
                  {{ `${getLocalizeableValue(arriveCity!.name, locale as Locale)}(${extractAirportCode(getLocalizeableValue(arriveCity!.name, locale as Locale))})` }}
                </div>
                <USkeleton v-else class="w-32 h-4 mt-2" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </UCard>
  </ErrorHelm>
</template>
