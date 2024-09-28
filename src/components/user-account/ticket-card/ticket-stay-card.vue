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
  { ctrlKey: `${props.ctrlKey}-Details-CheckInTime`, caption: getI18nResName3('ticket', 'details', 'checkInTime'), icon: 'timer', text: d(new Date(2000, 1, 1, 12, 0, 0, 0), 'daytime') },
  { ctrlKey: `${props.ctrlKey}-Details-CheckOutTime`, caption: getI18nResName3('ticket', 'details', 'checkOutTime'), icon: 'timer', text: d(new Date(2000, 1, 1, 12, 0, 0, 0), 'daytime') },
  { ctrlKey: `${props.ctrlKey}-Details-Room`, caption: getI18nResName3('ticket', 'details', 'room'), icon: 'door', text: t(getI18nResName3('ticket', 'details', 'onArrival')) }
];

</script>

<template>
  <TicketCardContainer :ctrl-key="`${props.ctrlKey}-Container`" :booking-id="bookingId" :offer="offer"> 
    <template #ticket-card>
      <div class="ticket-card">
        <div class="ticket-card-div">
          <div class="ticket-card-general">
            <div class="ticket-card-image ticket-stay-card-hotel-logo brdr-3 p-xs-2">
              <TicketStayTitle :ctrl-key="`${props.ctrlKey}-StayTitle`" :city-name="offer.stay.city.name" :stay-name="offer.stay.name"/>
            </div>
            <div class="ticket-card-timings from ml-xs-5">
              <div class="ticket-card-caption">
                {{ $t(getI18nResName2('stayDetailsCard', 'checkIn')) }}
              </div>
              <div class="ticket-card-sub">
                {{ $d(offer.checkIn, 'day') }}
              </div>
            </div>
            <div class="ticket-card-timings-separator mx-xs-3"/>
            <div class="ticket-card-timings to pr-xs-0 pr-xl-4">
              <div class="ticket-card-caption">
                {{ $t(getI18nResName2('stayDetailsCard', 'checkOut')) }}
              </div>
              <div class="ticket-card-sub">
                {{ $d(offer.checkOut, 'day') }}
              </div>
            </div>
            <BookingTicketDetails
              :ctrl-key="`${ctrlKey}-Details`" 
              :items="details" 
              class="ticket-card-details"/>
          </div>
        </div>
      </div>
    </template>
  </TicketCardContainer>
</template>
