<script setup lang="ts">
import { getI18nResName2, getI18nResName3, type EntityId, type EntityDataAttrsOnly, type IStayOffer } from '@golobe-demo/shared';
import TicketCardContainer from './ticket-card-container.vue';
import TicketStayTitle from './../../booking-ticket/booking-ticket-stay-title.vue';

interface IProps {
  ctrlKey: string,
  bookingId: EntityId,
  offer: EntityDataAttrsOnly<IStayOffer>
};
const props = defineProps<IProps>();

const { d, t } = useI18n();

const details = [
  { ctrlKey: `${props.ctrlKey}-Details-CheckInTime`, caption: getI18nResName3('ticket', 'details', 'checkInTime'), icon: 'i-ion-stopwatch', text: d(new Date(2000, 1, 1, 12, 0, 0, 0), 'daytime') },
  { ctrlKey: `${props.ctrlKey}-Details-CheckOutTime`, caption: getI18nResName3('ticket', 'details', 'checkOutTime'), icon: 'i-ion-stopwatch', text: d(new Date(2000, 1, 1, 12, 0, 0, 0), 'daytime') },
  { ctrlKey: `${props.ctrlKey}-Details-Room`, caption: getI18nResName3('ticket', 'details', 'room'), icon: 'i-material-symbols-door-front', text: t(getI18nResName3('ticket', 'details', 'onArrival')) }
];

</script>

<template>
  <div class="w-full h-auto">
    <TicketCardContainer :ctrl-key="`${props.ctrlKey}-Container`" :booking-id="bookingId" :offer="offer"> 
      <div class="w-full h-auto grid grid-flow-row auto-rows-auto grid-cols-userticketentriesxs 2xl:grid-cols-userticketentries2xl items-center gap-4">
        <div class="contents w-max h-auto">
          <div class="block w-full aspect-[1_/_1] ring-1 ring-primary-400 dark:ring-primary rounded-xl m-2 col-start-1 col-end-2 [&_*]:text-xs [&_*]:leading-2">
            <TicketStayTitle :ctrl-key="`${props.ctrlKey}-StayTitle`" :city-name="offer.stay.city.name" :stay-name="offer.stay.name"/>
          </div>
          <div class="block w-full h-auto col-start-2 col-end-3 ml-8">
            <div class="block whitespace-nowrap text-sm sm:text-base font-normal text-gray-600 dark:text-gray-300">
              {{ $t(getI18nResName2('stayDetailsCard', 'checkIn')) }}
            </div>
            <div class="block whitespace-nowrap text-xl font-semibold text-primary-900 dark:text-white">
              {{ $d(offer.checkIn, 'day') }}
            </div>
          </div>
          <UDivider orientation="horizontal" class="w-8 h-auto col-start-3 col-end-4 self-center justify-self-center mx-4 my-4" size="2xs" :ui="{ border: { base: 'border-gray-600 dark:border-gray-300' } }"/>
          <div class="block w-full h-auto col-start-4 col-end-5 pr-0 2xl:pr-6">
            <div class="block whitespace-nowrap text-sm sm:text-base font-normal text-gray-600 dark:text-gray-300">
              {{ $t(getI18nResName2('stayDetailsCard', 'checkOut')) }}
            </div>
            <div class="block whitespace-nowrap text-xl font-semibold text-primary-900 dark:text-white">
              {{ $d(offer.checkOut, 'day') }}
            </div>
          </div>
          <BookingTicketDetails 
            :ctrl-key="`${ctrlKey}-Details`" 
            :items="details" 
            class="w-full min-w-[22rem] h-auto col-start-1 col-end-5 2xl:col-start-5 2xl:col-end-6"/>
        </div>
      </div>
    </TicketCardContainer>
  </div>
</template>
