<script setup lang="ts">
import type { IBookingTicketFlightGfxProps, IBookingTicketStayTitleProps, IBookingTicketProps } from './../../types';
import BookingTicketDates from './booking-ticket-dates.vue';
import BookingTicketGeneral from './booking-ticket-general.vue';
import BookingTicketDetails from './booking-ticket-details.vue';
import BookingTicketCodes from './booking-ticket-codes.vue';
import BookingTicketFlightGfx from './booking-ticket-flight-gfx.vue';
import BookingTicketStayTitle from './booking-ticket-stay-title.vue';
import ComponentWaitingIndicator from '../forms/component-waiting-indicator.vue';

defineProps<IBookingTicketProps>();

const isError = ref(false);

const uiStyling = {
  base: 'w-fit min-w-full h-auto mx-auto relative overflow-hidden grid gap-0 grid-rows-ticketxs grid-cols-ticketxs sm:grid-rows-ticketsm sm:grid-cols-ticketsm xl:grid-rows-ticketxl xl:grid-cols-ticketxl',
  background: 'bg-white dark:bg-gray-900',
  shadow: 'shadow-none',
  rounded: 'rounded-3xl',
  ring: 'ring-1 ring-gray-300 dark:ring-gray-600',
  header: {
    base: 'contents',
  },
  body: {
    base: 'contents',
  },
  footer: {
    base: 'contents'
  }
};

</script>

<template>
  <div class="w-auto overflow-hidden">
    <ErrorHelm v-model:is-error="isError">
      <div class="w-full h-auto overflow-x-auto rounded-3xl p-2">
        <UCard as="article" :ui="uiStyling">
          <template #header>
            <header class="block w-full h-full row-start-1 row-end-2 col-start-1 col-end-2 sm:col-start-2 sm:col-end-3 rounded-tl-3xl rounded-tr-3xl sm:rounded-tl-none xl:rounded-tr-none">
              <BookingTicketGeneral
                :ctrl-key="[...ctrlKey, 'General']"
                :avatar="generalInfo?.avatar"
                :texting="generalInfo?.texting"
                :class-res-name="generalInfo?.classResName"
              />
            </header>
          </template>

          <div class="block w-full h-auto row-start-2 row-end-3 col-start-1 col-end-2 sm:row-start-1 sm:row-end-4 sm:rounded-tl-3xl sm:rounded-bl-3xl">
            <BookingTicketDates :ctrl-key="[...ctrlKey, 'Dates']" :from="dates?.from" :to="dates?.to" :offer-kind="offerKind" />            
          </div>
          <div class="block w-full h-full row-start-3 row-end-4 col-start-1 col-end-2 sm:row-start-2 sm:row-end-3 sm:col-start-2 sm:col-end-3">
            <BookingTicketDetails :ctrl-key="[...ctrlKey, 'Details']" :items="details?.items" class="m-6 mt-0" />
          </div>
          <div class="w-full hidden h-0 max-h-0 xl:block xl:h-auto xl:max-h-[unset] row-start-4 row-end-5 col-start-1 col-end-2 sm:col-end-3 xl:row-start-1 xl:row-end-4 xl:col-start-3 xl:col-end-4 xl:rounded-tr-3xl xl:rounded-br-3xl">
            <ClientOnly>
              <BookingTicketFlightGfx v-if="offerKind === 'flights'" :ctrl-key="titleOrGfx!.ctrlKey" :user-name="(titleOrGfx as IBookingTicketFlightGfxProps).userName" />
              <BookingTicketStayTitle v-else-if="offerKind === 'stays'" :ctrl-key="titleOrGfx!.ctrlKey" :city-name="(titleOrGfx as IBookingTicketStayTitleProps).cityName" :stay-name="(titleOrGfx as IBookingTicketStayTitleProps).stayName" />
              <div v-else class="flex flex-nowrap flex-col items-center justify-center w-full h-full">
                <ComponentWaitingIndicator :ctrl-key="[...ctrlKey, 'Waiter']" />
              </div>
              <template #fallback>
                <div class="flex flex-nowrap flex-col items-center justify-center w-full h-full">
                  <ComponentWaitingIndicator :ctrl-key="[...ctrlKey, 'ClientFallback']" />
                </div>
              </template>
            </ClientOnly>
          </div>
          <template #footer>
            <div class="block w-full h-auto row-start-4 row-end-5 col-start-1 col-end-2 sm:row-start-3 sm:row-end-4 sm:col-start-2 sm:col-end-3 rounded-bl-3xl rounded-br-3xl sm:rounded-bl-none xl:rounded-br-none">
              <BookingTicketCodes :ctrl-key="[...ctrlKey, 'Codes']" />
            </div>
          </template>
        </UCard>
      </div>
    </ErrorHelm>
  </div>
</template>
