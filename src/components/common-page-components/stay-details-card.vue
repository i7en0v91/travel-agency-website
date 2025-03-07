<script setup lang="ts">
import type { ControlKey } from './../../helpers/components';
import { type Locale, getLocalizeableValue, getI18nResName2, getI18nResName3, type StayServiceLevel, type EntityDataAttrsOnly, type ICity, type ILocalizableValue } from '@golobe-demo/shared';
import { PerfectScrollbar } from 'vue3-perfect-scrollbar';

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

</script>

<template>
  <article class="stay-details-card brdr-3 px-xs-3 pt-xs-4 px-s-4 pt-s-5">
    <PerfectScrollbar
      :options="{
        suppressScrollY: true,
        wheelPropagation: true
      }"
      :watch-options="false"
      tag="div"
      class="stay-details-card-main-scroll"
    >
      <div class="stay-details-card-general mb-xs-3">
        <h1 class="stay-details-card-general-title">
          {{ $t(getI18nResName3('stayDetailsPage', 'availableRooms', serviceLevel === 'Base' ? 'base' : 'city')) }}
        </h1>
        <div class="stay-details-card-general-price">
          <span v-if="price">{{ $n(Math.floor(price), 'currency') }}<wbr>&#47;<span class="stays-price-night">{{ $t(getI18nResName2('searchStays', 'night')) }}</span></span>
          <div v-else class="data-loading-stub text-data-loading" />
        </div>
      </div>
      <div class="stay-details-card-info brdr-3 mt-xs-4 px-xs-5 py-xs-3">
        <div class="stay-details-card-logo">
          <div v-if="name" class="stay-details-card-logo-name pb-xs-1">
            {{ getLocalizeableValue(name, locale as Locale) }}
          </div>
          <div v-if="city" class="stay-details-card-logo-city">
            {{ getLocalizeableValue(city.name, locale as Locale) }}
          </div>
        </div>
        <div class="stay-details-card-texting">
          <div v-if="name" class="stay-details-card-stayname">
            {{ getLocalizeableValue(name, locale as Locale) }}
          </div>
          <div v-else class="data-loading-stub text-data-loading" />
          <div class="stay-details-card-location">
            <span class="stay-details-card-location-icon mr-xs-2" />
            <span v-if="city" class="stay-details-card-location-text">
              {{ getLocalizeableValue(city.country.name, locale as Locale) }}, {{ getLocalizeableValue(city.name, locale as Locale) }}
            </span>
            <div v-else class="data-loading-stub text-data-loading" />
          </div>
        </div>
      </div>
      <div class="stay-details-card-dates-div">
        <PerfectScrollbar
          :options="{
            suppressScrollY: true,
            wheelPropagation: true
          }"
          :watch-options="false"
          tag="div"
          class="stay-details-card-dates-scroll"
        >
          <div class="stay-details-card-dates pb-xs-4 pb-s-5">
            <div class="stay-details-card-dates-checkin">
              <div v-if="checkIn" class="stay-details-card-day">
                {{ $d(checkIn, 'day') }}
              </div>
              <div v-else class="data-loading-stub text-data-loading" />
              <div class="stay-details-card-date-type">
                {{ $t(getI18nResName2('stayDetailsCard', 'checkIn')) }}
              </div>
            </div>
            <div class="stay-details-card-dates-image" />
            <div class="stay-details-card-dates-checkout">
              <div v-if="checkOut" class="stay-details-card-day">
                {{ $d(checkOut, 'day') }}
              </div>
              <div v-else class="data-loading-stub text-data-loading" />
              <div class="stay-details-card-date-type">
                {{ $t(getI18nResName2('stayDetailsCard', 'checkOut')) }}
              </div>
            </div>
          </div>
        </PerfectScrollbar>
      </div>
    </PerfectScrollbar>
  </article>
</template>
