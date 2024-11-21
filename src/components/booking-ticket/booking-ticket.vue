<script setup lang="ts">
import { type IBookingTicketFlightGfxProps, type IBookingTicketStayTitleProps, type IBookingTicketProps } from './../../types';
import BookingTicketDates from './booking-ticket-dates.vue';
import BookingTicketGeneral from './booking-ticket-general.vue';
import BookingTicketDetails from './booking-ticket-details.vue';
import BookingTicketCodes from './booking-ticket-codes.vue';
import BookingTicketFlightGfx from './booking-ticket-flight-gfx.vue';
import BookingTicketStayTitle from './booking-ticket-stay-title.vue';
import ComponentWaitingIndicator from './../../components/component-waiting-indicator.vue';

withDefaults(defineProps<IBookingTicketProps>(), {
  generalInfo: undefined,
  dates: undefined,
  details: undefined,
  offerKind: undefined,
  titleOrGfx: undefined
});

</script>

<template>
  <div class="booking-ticket-container">
    <!--
    <PerfectScrollbar
      :options="{
        suppressScrollY: true,
        wheelPropagation: true
      }"
      :watch-options="false"
      tag="div"
      class="booking-ticket-main-scroll"
    >
      <article class="booking-ticket mb-xs-2 mb-m-0 brdr-4">
        <div class="booking-ticket-dates-div">
          <BookingTicketDates :ctrl-key="`${ctrlKey}-Dates`" :from="dates?.from" :to="dates?.to" :offer-kind="offerKind" />
        </div>
        <header class="booking-ticket-general-div">
          <BookingTicketGeneral
            :ctrl-key="`${ctrlKey}-General`"
            :avatar="generalInfo?.avatar"
            :texting="generalInfo?.texting"
            :class-res-name="generalInfo?.classResName"
          />
        </header>
        <div class="booking-ticket-details-div">
          <BookingTicketDetails :ctrl-key="`${ctrlKey}-Details`" :items="details?.items" />
        </div>
        <div class="booking-ticket-codes-div">
          <BookingTicketCodes :ctrl-key="`${ctrlKey}-Codes`" />
        </div>
        <div class="booking-ticket-image-div">
          <ClientOnly>
            <BookingTicketFlightGfx v-if="offerKind === 'flights'" :ctrl-key="titleOrGfx!.ctrlKey" :user-name="(titleOrGfx as IBookingTicketFlightGfxProps).userName" />
            <BookingTicketStayTitle v-else-if="offerKind === 'stays'" :ctrl-key="titleOrGfx!.ctrlKey" :city-name="(titleOrGfx as IBookingTicketStayTitleProps).cityName" :stay-name="(titleOrGfx as IBookingTicketStayTitleProps).stayName" />
            <ComponentWaitingIndicator v-else :ctrl-key="`${ctrlKey}-ImageWaiter`" class="booking-title-image-waiting-indicator" />
            <template #fallback>
              <ComponentWaitingIndicator :ctrl-key="`${ctrlKey}-ImageWaiterClientFallback`" class="booking-title-image-waiting-indicator" />
            </template>
          </ClientOnly>
        </div>
      </article>
    </PerfectScrollbar>
    -->
  </div>
</template>
