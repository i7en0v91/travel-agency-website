<script setup lang="ts">
import { toShortForm, type ControlKey } from './../../../helpers/components';
import { getLocalizeableValue, getValueForFlightDayFormatting, getValueForTimeOfDayFormatting, getValueForFlightDurationFormatting, extractAirportCode, type Locale, getI18nResName2, getI18nResName3, ImageCategory, type EntityId, type EntityDataAttrsOnly, type IFlightOffer } from '@golobe-demo/shared';
import TicketCardContainer from './ticket-card-container.vue';

interface IProps {
  ctrlKey: ControlKey,
  bookingId: EntityId,
  offer: EntityDataAttrsOnly<IFlightOffer>
};
const { offer, ctrlKey } = defineProps<IProps>();

const { d, t, locale } = useI18n();

const displayItems = offer.arriveFlight ? [offer.departFlight, offer.arriveFlight] : [offer.departFlight];
const detailsCommon = [
  { ctrlKey: [...ctrlKey, 'Details', 'Gate'] as ControlKey, caption: getI18nResName3('ticket', 'details', 'gate'), icon: 'i-material-symbols-door-front', text: 'A12' },
  { ctrlKey: [...ctrlKey, 'Details', 'Seat'] as ControlKey, caption: getI18nResName3('ticket', 'details', 'seat'), icon: 'i-material-symbols-airline-seat-recline-extra', text: '128' }
];

</script>

<template>
  <div class="w-full h-auto">
    <TicketCardContainer :ctrl-key="[...ctrlKey, 'Wrapper']" :booking-id="bookingId" :offer="offer"> 
      <div class="w-full h-auto grid grid-flow-row auto-rows-auto grid-cols-userticketentriesxs 2xl:grid-cols-userticketentries2xl items-center gap-4">
        <div v-for="(item, i) in displayItems" :key="`${toShortForm(ctrlKey)}-${item.id}Flight`" class="contents w-max h-auto">
          <div class="contents w-max h-auto">
            <StaticImage
              :ctrl-key="[...ctrlKey, 'CompanyLogo', i]"
              :ui="{ wrapper: 'block col-start-1 col-end-2 ring-1 ring-primary-400 dark:ring-primary rounded-xl p-2 ml-2 mt-2 w-[80px] h-[80px]', stub: 'rounded-xl', img: 'w-[80px] h-[80px] rounded-xl object-cover' }"
              :src="item.airlineCompany.logoImage"
              :category="ImageCategory.AirlineLogo"
              :stub="false"
              :request-extra-display-options="true"
              sizes="xs:30vw sm:30vw md:20vw lg:20vw xl:20vw"
              :alt="{ resName: getI18nResName2('searchFlights', 'airlineCompanyLogoAlt') }"
            />
            <div class="block w-full h-auto col-start-2 col-end-3 ml-8">
              <div class="block whitespace-nowrap text-sm sm:text-base font-normal text-gray-600 dark:text-gray-300">
                {{ `${getLocalizeableValue(item.departAirport.city.name, locale as Locale)}(${extractAirportCode(getLocalizeableValue(item.departAirport.city.name, locale as Locale))})` }}
              </div>
              <div class="block whitespace-nowrap text-xl font-semibold text-primary-900 dark:text-white">
                {{ $d(getValueForTimeOfDayFormatting(item.departTimeUtc, item.departAirport.city.utcOffsetMin!), 'daytime') }}
              </div>
            </div>
            <UDivider orientation="horizontal" class="w-8 h-auto col-start-3 col-end-4 self-center justify-self-center mx-4 my-4" size="2xs" :ui="{ border: { base: 'border-gray-600 dark:border-gray-300' } }"/>
            <div class="block w-full h-auto col-start-4 col-end-5 pr-0 2xl:pr-6">
              <div class="block whitespace-nowrap text-sm sm:text-base font-normal text-gray-600 dark:text-gray-300">
                {{ `${getLocalizeableValue(item.arriveAirport.city.name, locale as Locale)}(${extractAirportCode(getLocalizeableValue(item.arriveAirport.city.name, locale as Locale))})` }}
              </div>
              <div class="block whitespace-nowrap text-xl font-semibold text-primary-900 dark:text-white">
                {{ $d(getValueForTimeOfDayFormatting(item.arriveTimeUtc, item.departAirport.city.utcOffsetMin!), 'daytime') }}
              </div>
            </div>
            <BookingTicketDetails 
              :ctrl-key="[...ctrlKey, 'Details']" 
              :items="[{ ctrlKey: [...ctrlKey, 'Details', 'Dates'], caption: getI18nResName3('ticket', 'details', 'date'), icon: 'i-heroicons-calendar-days-20-solid', text: d(getValueForFlightDayFormatting(item.departTimeUtc, item.departAirport.city.utcOffsetMin), 'day') },
                        { ctrlKey: [...ctrlKey, 'Details', 'Duration'], caption: getI18nResName3('ticket', 'details', 'duration'), icon: 'i-ion-stopwatch', text: t(getI18nResName2('searchFlights', 'flightDuration'), getValueForFlightDurationFormatting(item.departTimeUtc, item.arriveTimeUtc)) }, 
                        ...detailsCommon]" 
              class="w-full min-w-[25rem] h-auto col-start-1 col-end-5 2xl:col-start-5 2xl:col-end-6"/>
          </div>
        </div>
      </div>
    </TicketCardContainer>
  </div>
</template>
