<script setup lang="ts">
import { getLocalizeableValue, getValueForFlightDayFormatting, getValueForTimeOfDayFormatting, getValueForFlightDurationFormatting, extractAirportCode, type Locale, getI18nResName2, getI18nResName3, ImageCategory, type EntityId, type EntityDataAttrsOnly, type IFlightOffer } from '@golobe-demo/shared';
import TicketCardContainer from './ticket-card-container.vue';

interface IProps {
  ctrlKey: string,
  bookingId: EntityId,
  offer: EntityDataAttrsOnly<IFlightOffer>
};
const props = defineProps<IProps>();

const { d, t, locale } = useI18n();

const displayItems = props.offer.arriveFlight ? [props.offer.departFlight, props.offer.arriveFlight] : [props.offer.departFlight];
const detailsCommon = [
  { ctrlKey: `${props.ctrlKey}-Details-Gate`, caption: getI18nResName3('ticket', 'details', 'gate'), icon: 'door', text: 'A12' },
  { ctrlKey: `${props.ctrlKey}-Details-Seat`, caption: getI18nResName3('ticket', 'details', 'seat'), icon: 'seat', text: '128' }
];

</script>

<template>
  <TicketCardContainer :ctrl-key="`${props.ctrlKey}-Container`" :booking-id="bookingId" :offer="offer"> 
    <template #ticket-card>
      <div class="ticket-card">
        <div v-for="(item, i) in displayItems" :key="`${props.ctrlKey}-${item.id}Flight`" class="ticket-card-div">
          <div class="ticket-card-general">
            <StaticImage
              :ctrl-key="`${ctrlKey}-CompanyLogo-${i}`"
              :ui="{ wrapper: 'ticket-card-image ticket-flight-card-company-logo brdr-3 p-xs-2', img: 'ticket-flight-card-company-logo-img' }"
              :entity-src="item.airlineCompany.logoImage"
              :category="ImageCategory.AirlineLogo"
              :show-stub="false"
              :request-extra-display-options="true"
              sizes="xs:30vw sm:30vw md:20vw lg:20vw xl:20vw"
              :alt-res-name="getI18nResName2('searchFlights', 'airlineCompanyLogoAlt')"
            />
            <div class="ticket-card-timings from ml-xs-5">
              <div class="ticket-card-caption">
                {{ `${getLocalizeableValue(item.departAirport.city.name, locale as Locale)}(${extractAirportCode(getLocalizeableValue(item.departAirport.city.name, locale as Locale))})` }}
              </div>
              <div class="ticket-card-sub">
                {{ $d(getValueForTimeOfDayFormatting(item.departTimeUtc, item.departAirport.city.utcOffsetMin!), 'daytime') }}
              </div>
            </div>
            <div class="ticket-card-timings-separator mx-xs-3"/>
            <div class="ticket-card-timings to pr-xs-0 pr-xl-4">
              <div class="ticket-card-caption">
                {{ `${getLocalizeableValue(item.arriveAirport.city.name, locale as Locale)}(${extractAirportCode(getLocalizeableValue(item.arriveAirport.city.name, locale as Locale))})` }}
              </div>
              <div class="ticket-card-sub">
                {{ $d(getValueForTimeOfDayFormatting(item.arriveTimeUtc, item.departAirport.city.utcOffsetMin!), 'daytime') }}
              </div>
            </div>
            <BookingTicketDetails
              :ctrl-key="`${ctrlKey}-Details`" 
              :items="[{ ctrlKey: `${props.ctrlKey}-Details-Date`, caption: getI18nResName3('ticket', 'details', 'date'), icon: 'calendar', text: d(getValueForFlightDayFormatting(item.departTimeUtc, item.departAirport.city.utcOffsetMin), 'day') },
                        { ctrlKey: `${props.ctrlKey}-Details-Duration`, caption: getI18nResName3('ticket', 'details', 'duration'), icon: 'timer', text: t(getI18nResName2('searchFlights', 'flightDuration'), getValueForFlightDurationFormatting(item.departTimeUtc, item.arriveTimeUtc)) }, 
                        ...detailsCommon]" 
              class="ticket-card-details"/>
          </div>
        </div>
      </div>
    </template>
  </TicketCardContainer>
</template>
