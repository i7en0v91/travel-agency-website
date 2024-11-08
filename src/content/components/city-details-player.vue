<script setup lang="ts">
import { AppPage, lookupPageByUrl } from '@golobe-demo/shared';
import TravelDetails from './../../components/common-page-components/travel-details/travel-details.vue';
import { TravelDetailsHtmlAnchor } from './../../helpers/constants';

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
  <TravelDetails :id="TravelDetailsHtmlAnchor" :ctrl-key="bookKind === 'flight' ? 'FlightsTravelDetailsSection' : 'StaysTravelDetailsSection'" :book-kind="bookKind" />
</template>
