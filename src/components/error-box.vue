<script setup lang="ts">

import { type I18nResName, getI18nResName2 } from './../shared/i18n';

interface IProps {
  httpCode: number,
  msgResName: I18nResName,
  msgResParams?: any
}
const props = withDefaults(defineProps<IProps>(), {
  msgResParams: undefined
});

const localePath = useLocalePath();
const httpCodeResName = props.httpCode === 404 ? '404' : '500';

</script>

<template>
  <div class="error-box">
    <h2 class="error-box-code mr-m-4">
      {{ httpCode }}
    </h2>
    <div class="error-box-details" role="alert">
      <div class="error-box-msg pl-m-4 mb-xs-5">
        <h2>{{ $t(getI18nResName2('httpCodes', httpCodeResName)) }}</h2>
        <p> {{ $t(msgResName, msgResParams) }} </p>
      </div>
      <NuxtLink class="error-box-homelink btn" :to="localePath('/')">
        {{ $t(getI18nResName2('errorBox', 'homeLink')) }}
      </NuxtLink>
    </div>
  </div>
</template>
