<script setup lang="ts">
import { AppPage, type Locale, type I18nResName, getI18nResName2 } from '@golobe-demo/shared';
import { useNavLinkBuilder } from './../composables/nav-link-builder';

interface IProps {
  httpCode: number,
  msgResName: I18nResName,
  msgResParams?: any
}
const { httpCode } = defineProps<IProps>();

const { locale } = useI18n();
const navLinkBuilder = useNavLinkBuilder();
const httpCodeResName = httpCode === 404 ? '404' : '500';

const useHardLink = useNuxtApp().isHydrating;

</script>

<template>
  <div class="error-box">
    <p class="error-box-code mr-m-4 font-h2">
      {{ httpCode }}
    </p>
    <div class="error-box-details" role="alert">
      <div class="error-box-msg pl-m-4 mb-xs-5">
        <h1 class="font-h2">{{ $t(getI18nResName2('httpCodes', httpCodeResName)) }}</h1>
        <p> {{ $t(msgResName, msgResParams) }} </p>
      </div>
      <NuxtLink class="error-box-homelink btn" :to="navLinkBuilder.buildPageLink(AppPage.Index, locale as Locale)" :external="useHardLink">
        {{ $t(getI18nResName2('errorBox', 'homeLink')) }}
      </NuxtLink>
    </div>
  </div>
</template>
