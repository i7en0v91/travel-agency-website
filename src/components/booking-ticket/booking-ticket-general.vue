<script setup lang="ts">

import { ImageCategory, type IBookingTicketGeneralProps } from './../../shared/interfaces';
import { getI18nResName2 } from './../../shared/i18n';

withDefaults(defineProps<IBookingTicketGeneralProps>(), {
  avatar: undefined,
  texting: undefined,
  classResName: undefined
});

</script>

<template>
  <div class="booking-ticket-general p-xs-4">
    <div class="booking-ticket-general-avatar-div mr-xs-3 mt-xs-1">
      <StaticImage
        v-if="avatar !== null"
        :ctrl-key="`${ctrlKey}-Avatar`"
        :show-stub="false"
        class="booking-ticket-general-avatar"
        img-class="booking-ticket-general-avatar-img"
        :entity-src="avatar"
        :category="ImageCategory.UserAvatar"
        sizes="xs:30vw sm:20vw md:20vw lg:10vw xl:10vw"
        :alt-res-name="getI18nResName2('ticket', 'avatarImgAlt')"
      />
      <div v-else class="booking-ticket-general-avatar booking-ticket-general-avatar-default" />
    </div>
    <div class="booking-ticket-details-name-div">
      <h2 v-if="texting?.name" class="booking-ticket-details-name">
        {{ texting.name }}
      </h2>
      <div v-else class="booking-ticket-details-name data-loading-stub text-data-loading" />
      <div v-if="texting?.sub" class="booking-ticket-details-name-sub mt-xs-2">
        {{ $t(texting.sub) }}
      </div>
      <div v-else-if="texting?.sub !== null" class="booking-ticket-details-name-sub mt-xs-2 data-loading-stub text-data-loading" />
    </div>
    <div v-if="classResName" class="booking-ticket-details-class ml-xs-5">
      {{ $t(classResName) }}
    </div>
    <div v-else class="booking-ticket-details-class  ml-xs-5 data-loading-stub text-data-loading" />
  </div>
</template>
