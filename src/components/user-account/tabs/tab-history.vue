<script setup lang="ts">

interface IProps {
  ctrlKey: string,
  ready: boolean
}
defineProps<IProps>();

const isError = ref(false);

const $emit = defineEmits(['update:ready']);

onMounted(() => {
  $emit('update:ready', true);
});

</script>

<template>
  <div class="account-tab-history">
    <ErrorHelm v-model:is-error="isError" :appearance="'error-stub'" :user-notification="true">
      <div>
        TBD
      </div>
    </ErrorHelm>
  </div>
</template>
