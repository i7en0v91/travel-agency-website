<script setup lang="ts">

interface IProps {
  ctrlKey: string
};
defineProps<IProps>();

</script>

<template>
  <div class="booking-ticket-codes-container">
    <div class="booking-ticket-codes p-xs-3">
      <div class="booking-ticket-codes-texting ml-xs-3">
        <div class="booking-ticket-codes-ek">
          EK
        </div>
        <div class="booking-ticket-codes-sub mt-xs-1">
          ABC12345
        </div>
      </div>
      <div class="booking-ticket-codes-image mt-xs-3" />
    </div>
  </div>
</template>
