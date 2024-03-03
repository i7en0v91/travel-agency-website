<script setup lang="ts">

import { useVuelidate } from '@vuelidate/core';
import * as validators from '@vuelidate/validators';
import { email, required } from '@vuelidate/validators';
import SimpleButton from './../components/forms/simple-button.vue';
import { getI18nResName2 } from './../../shared/i18n';
import { UserNotificationLevel } from './../../shared/constants';

interface IProps {
  ctrlKey: string
}
defineProps<IProps>();

const elInput = ref<HTMLInputElement | undefined>();
const useremail = ref('');
const userNotificationStore = useUserNotificationStore();

const { t } = useI18n();
const { createI18nMessage } = validators;
const withI18nMessage = createI18nMessage({ t });
const rules = computed(() => ({
  useremail: {
    required: withI18nMessage(required, { messagePath: () => 'validations.required' }),
    email: withI18nMessage(email)
  }
}));
const v$ = useVuelidate(rules, { useremail, $lazy: true });

function cancelInput () {
  useremail.value = '';
  elInput!.value?.blur();
  v$.value.$reset();
}

function onSubscribeClick () {
  useremail.value = useremail.value.trim();
  v$.value.$touch();
  if (!v$.value.$error) {
    userNotificationStore.show({
      level: UserNotificationLevel.INFO,
      resName: getI18nResName2('subscribeBox', 'subscribeNotification')
    });
  }
}

const emailId = useId();

</script>

<template>
  <section class="subscribe-box brdr-4">
    <div class="subscribe-box-controls p-xs-4">
      <h2 class="subscribe-box-header">
        {{ t(getI18nResName2('subscribeBox', 'title')) }}
      </h2>
      <p class="subscribe-box-caption mt-xs-4">
        {{ t(getI18nResName2('subscribeBox', 'heading')) }}
      </p>
      <label class="subscribe-box-text mt-xs-2" :for="emailId">
        {{ t(getI18nResName2('subscribeBox', 'text')) }}
      </label>
      <div class="subscribe-box-input mt-xs-3">
        <input
          :id="emailId"
          ref="elInput"
          v-model="useremail"
          type="email"
          class="input-field email-field brdr-1"
          :placeholder="t(getI18nResName2('subscribeBox', 'emailPlaceholder'))"
          :maxLength="256"
          autocomplete="off"
          @keyup.enter="onSubscribeClick"
          @keyup.escape="cancelInput"
        >
        <SimpleButton
          class="subscribe-box-btn"
          kind="accent"
          ctrl-key="subscribeBtn"
          :label-res-name="getI18nResName2('subscribeBox', 'subscribeBtn')"
          @click="onSubscribeClick"
        />
      </div>
      <div v-if="v$.useremail.$errors.length" class="input-errors">
        <div class="form-error-msg">
          {{ v$.useremail.$errors[0].$message }}
        </div>
      </div>
    </div>
    <div class="subscribe-box-image mr-xs-4" />
  </section>
</template>
