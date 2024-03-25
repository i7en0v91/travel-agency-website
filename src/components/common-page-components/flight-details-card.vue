<script setup lang="ts">

import dayjs from 'dayjs';
import { PerfectScrollbar } from 'vue3-perfect-scrollbar';
import { Decimal } from 'decimal.js';
import { type MakeSearchResultEntity, type ICity, ImageCategory, type ILocalizableValue, type IAirlineCompany } from './../../shared/interfaces';
import { getI18nResName2, getI18nResName3 } from './../../shared/i18n';
import { getLocalizeableValue, convertTimeOfDay, getTimeOfDay } from './../../shared/common';
import { type Locale } from './../../shared/constants';

interface IProps {
  ctrlKey: string,
  departCity?: MakeSearchResultEntity<ICity>,
  arriveCity?: MakeSearchResultEntity<ICity>,
  departTimeUtc?: Date,
  arriveTimeUtc?: Date,
  airlineCompany?: MakeSearchResultEntity<IAirlineCompany>,
  airplaneName?: ILocalizableValue,
  utcOffsetMinutes?: number,
  kind: 'depart' | 'arrive',
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

function extractAirportCode (displayName: string) {
  if (displayName.length < 3) {
    return displayName.toUpperCase();
  }
  return displayName.substring(0, 3).toUpperCase();
}

function getValueForTimeOfDayFormatting (dateTimeUtc: Date, utcOffsetMinutes: number): Date {
  const timeOfDay = convertTimeOfDay(getTimeOfDay(dateTimeUtc, utcOffsetMinutes));
  return dayjs().local().set('hour', timeOfDay.hour24).set('minute', timeOfDay.minutes).toDate();
}

function getValueForFlightDurationFormatting (departTimeUtc: Date, arriveTimeUtc: Date): { hours: string, minutes: string } {
  const departFlightDuration = Math.round((arriveTimeUtc.getTime() - departTimeUtc.getTime()) / 60000);
  const duration = convertTimeOfDay(departFlightDuration);
  return {
    hours: duration.hour24.toFixed(0),
    minutes: duration.minutes.toFixed(0)
  };
}

function getValueForFlightDayFormatting (dateTimeUtc: Date, utcOffsetMinutes: number): Date {
  return dayjs(dateTimeUtc).local().add(utcOffsetMinutes, 'minute').toDate();
}

const flightDateText = computed(() => props.departTimeUtc ? (t(getI18nResName3('flightDetailsCard', 'direction', props.kind), { date: d(getValueForFlightDayFormatting(props.departTimeUtc, props.utcOffsetMinutes!), 'day') })) : undefined);
const featureIcons: string[] = ['airplane', 'wifi', 'stopwatch', 'fastfood', 'seat-recline'];

</script>

<template>
  <div class="flight-details-card brdr-3 px-xs-3 pt-xs-4 px-s-4 pt-s-5">
    <div v-if="additionalInfo" class="flight-details-additional-info">
      <div v-if="airplaneName" class="flight-details-additional-info-title" role="heading" aria-level="4">
        {{ getLocalizeableValue(airplaneName, locale as Locale) }}
      </div>
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
        <div class="flight-details-company-div brdr-3 mt-xs-2 pr-xs-3 pr-s-4">
          <StaticImage
            :ctrl-key="`${ctrlKey}-CompanyLogo`"
            class="flight-details-company-logo m-xs-3 m-s-4"
            :entity-src="airlineCompany?.logoImage"
            :category="ImageCategory.AirlineLogo"
            :show-stub="false"
            :request-extra-display-options="true"
            img-class="flight-details-company-logo-img"
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
        <ul class="flight-details-features mt-xs-2">
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
            class="flight-details-main-scroll"
          >
            <div class="flight-details-timing pb-xs-4 pb-s-5">
              <div class="flight-details-timing-from">
                <div v-if="departTimeUtc" class="flight-details-timeofday mr-xs-2">
                  {{ $d(getValueForTimeOfDayFormatting(departTimeUtc!, utcOffsetMinutes!), 'daytime') }}
                </div>
                <div v-else class="data-loading-stub text-data-loading mr-xs-2" />
                <div v-if="departCity" class="flight-details-airport-label">
                  {{ `${getLocalizeableValue(departCity!.name, locale as Locale)}(${extractAirportCode(getLocalizeableValue(departCity!.name, locale as Locale))})` }}
                </div>
                <div v-else class="data-loading-stub text-data-loading" />
              </div>
              <div class="flight-details-transition-image" />
              <div class="flight-details-timing-to">
                <div v-if="arriveTimeUtc" class="flight-details-timeofday mr-xs-2">
                  {{ $d(getValueForTimeOfDayFormatting(arriveTimeUtc!, utcOffsetMinutes!), 'daytime') }}
                </div>
                <div v-else class="data-loading-stub text-data-loading mr-xs-2" />
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
  </div>
</template>
