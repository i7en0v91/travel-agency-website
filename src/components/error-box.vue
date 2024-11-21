<script setup lang="ts">
import { AppPage, type Locale, type I18nResName, getI18nResName2 } from '@golobe-demo/shared';
import { useNavLinkBuilder } from './../composables/nav-link-builder';

interface IProps {
  httpCode: number,
  msgResName: I18nResName,
  msgResParams?: any
}
const props = withDefaults(defineProps<IProps>(), {
  msgResParams: undefined
});

const { locale, t } = useI18n();
const navLinkBuilder = useNavLinkBuilder();
const httpCodeResName = props.httpCode === 404 ? '404' : '500';

</script>

<template>
  <div class="flex flex-col md:flex-row flex-nowrap w-fit h-full py-[100px] mx-[30px] md:mx-auto">
    <p class="text-gray-400 mr-6 text-5xl font-normal">
      {{ httpCode }}
    </p>
    <div class="text-gray-600 dark:text-gray-300" role="alert">
      <div class="flex flex-row items-stretch mb-8">
        <UDivider color="gray" orientation="vertical" class="hidden h-auto md:inline-block" size="sm"/>
        <div class="block md:inline-block md:pl-4">
          <h1 class="text-5xl font-normal">{{ $t(getI18nResName2('httpCodes', httpCodeResName)) }}</h1>
          <p> {{ $t(msgResName, msgResParams) }} </p>
        </div>
      </div>
      <UButton :to="navLinkBuilder.buildPageLink(AppPage.Index, locale as Locale)" :label="t(getI18nResName2('errorBox', 'homeLink'))" class="block w-fit" variant="solid" color="primary" size="xl" :external="false"/>
    </div>
  </div>
</template>
