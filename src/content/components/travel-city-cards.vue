<script setup lang="ts">
import { AppPage, lookupPageByUrl } from '@golobe-demo/shared';
import TravelCities from './../../components/common-page-components/travel-details/travel-cities.vue';

const route = useRoute();
const page = lookupPageByUrl(route.path);
let bookKind: 'flight' | 'stay' = 'flight';
switch(page) {
  case AppPage.BookStay:
  case AppPage.FindStays:
  case AppPage.StayDetails:
  case AppPage.Stays:
    bookKind = 'stay';
    break;
}

</script>

<template>
  <TravelCities :ctrl-key="bookKind === 'flight' ? 'FlightsTravelCitiesSection' : 'StaysTravelCitiesSection'" :book-kind="bookKind"/>
</template>
