<script setup lang="ts">
import { type Locale, getLocalizeableValue, getValueForFlightDayFormatting, getValueForTimeOfDayFormatting, getValueForFlightDurationFormatting, extractAirportCode, getI18nResName2, getI18nResName3, type EntityDataAttrsOnly, type ICity, ImageCategory, type ILocalizableValue, type IAirlineCompany } from '@golobe-demo/shared';
import type { Decimal } from 'decimal.js';

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
  additionalInfo?: {
    price?: Decimal
  },
  tag: 'h1' | 'h2' | 'div'
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

const flightDateText = computed(() => props.departTimeUtc ? (t(getI18nResName3('flightDetailsCard', 'direction', props.kind), { date: d(getValueForFlightDayFormatting(props.departTimeUtc, props.utcOffsetMinutes!), 'day') })) : undefined);
const featureIcons: string[] = ['airplane', 'wifi', 'stopwatch', 'fastfood', 'seat-recline'];

</script>

<template>
  <article class="flight-details-card brdr-3 px-xs-3 pt-xs-4 px-s-4 pt-s-5">
    <PerfectScrollbar
      :options="{
        suppressScrollY: true,
        wheelPropagation: true
      }"
      :watch-options="false"
      tag="div"
      class="flight-details-card-main-scroll"
    >
      <div v-if="additionalInfo" class="flight-details-additional-info mb-xs-3">
        <component :is="tag" v-if="airplaneName" class="flight-details-additional-info-title">
          {{ getLocalizeableValue(airplaneName, locale as Locale) }}
        </component>
        <div v-else class="data-loading-stub text-data-loading" />
        <div class="flight-details-additional-info-price">
          <span v-if="additionalInfo.price">{{ $n(Math.floor(additionalInfo.price.toNumber()), 'currency') }}</span>
          <div v-else class="data-loading-stub text-data-loading" />
        </div>
      </div>
      <div class="flight-details-datetime">
        <div v-if="departTimeUtc" class="flight-details-datetime-date">
          {{ flightDateText }}
        </div>
        <div v-else class="data-loading-stub text-data-loading" />
        <div v-if="departTimeUtc" class="flight-details-datetime-duration">
          {{ $t(getI18nResName2('searchFlights', 'flightDuration'), getValueForFlightDurationFormatting(departTimeUtc!, arriveTimeUtc!)) }}
        </div>
        <div v-else class="data-loading-stub text-data-loading" />
      </div>
      <div class="flight-details-main-div">
        <div class="flight-details-main mt-xs-3">
          <div class="flight-details-company-div brdr-3 mt-xs-3 pr-xs-3 pr-s-4">
            <StaticImage
              :ctrl-key="`${ctrlKey}-CompanyLogo`"
              :ui="{ wrapper: 'flight-details-company-logo m-xs-3 m-s-4', img: 'flight-details-company-logo-img' }"
              :entity-src="airlineCompany?.logoImage"
              :category="ImageCategory.AirlineLogo"
              :show-stub="false"
              :request-extra-display-options="true"
              sizes="xs:30vw sm:30vw md:20vw lg:20vw xl:20vw"
              :alt-res-name="getI18nResName2('searchFlights', 'airlineCompanyLogoAlt')"
            />
            <div class="flight-details-company-info py-xs-2">
              <div v-if="airlineCompany" class="flight-details-company-name">
                {{ getLocalizeableValue(airlineCompany!.name, locale as Locale) }}
              </div>
              <div v-else class="data-loading-stub text-data-loading" />
              <div v-if="airplaneName" class="flight-details-airplane-name">
                {{ getLocalizeableValue(airplaneName!, locale as Locale) }}
              </div>
              <div v-else class="data-loading-stub text-data-loading" />
            </div>
          </div>
          <ul class="flight-details-features mt-xs-3">
            <li v-for="(icon) in featureIcons" :key="`${ctrlKey}-Feature-${icon}`">
              <div :class="`flight-details-feature-icon icon-${icon} p-xs-4`" />
            </li>
          </ul>
          <div class="flight-details-timing-div">
            <PerfectScrollbar
              :options="{
                suppressScrollY: true,
                wheelPropagation: true
              }"
              :watch-options="false"
              tag="div"
              class="flight-details-timing-main-scroll"
            >
              <div class="flight-details-timing pb-xs-4 pb-s-5">
                <div class="flight-details-timing-from">
                  <div v-if="departTimeUtc" class="flight-details-timeofday">
                    {{ $d(getValueForTimeOfDayFormatting(departTimeUtc!, utcOffsetMinutes!), 'daytime') }}
                  </div>
                  <div v-else class="data-loading-stub text-data-loading" />
                  <div v-if="departCity" class="flight-details-airport-label">
                    {{ `${getLocalizeableValue(departCity!.name, locale as Locale)}(${extractAirportCode(getLocalizeableValue(departCity!.name, locale as Locale))})` }}
                  </div>
                  <div v-else class="data-loading-stub text-data-loading" />
                </div>
                <div class="flight-details-transition-image" />
                <div class="flight-details-timing-to">
                  <div v-if="arriveTimeUtc" class="flight-details-timeofday">
                    {{ $d(getValueForTimeOfDayFormatting(arriveTimeUtc!, utcOffsetMinutes!), 'daytime') }}
                  </div>
                  <div v-else class="data-loading-stub text-data-loading" />
                  <div v-if="arriveCity" class="flight-details-airport-label">
                    {{ `${getLocalizeableValue(arriveCity!.name, locale as Locale)}(${extractAirportCode(getLocalizeableValue(arriveCity!.name, locale as Locale))})` }}
                  </div>
                  <div v-else class="data-loading-stub text-data-loading" />
                </div>
              </div>
            </PerfectScrollbar>
          </div>
        </div>
      </div>
    </PerfectScrollbar>
  </article>
</template>
