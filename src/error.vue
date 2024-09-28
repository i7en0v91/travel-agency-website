<script setup lang="ts">
import { getI18nResName2, getUsrMsgResName, mapAppExceptionToHttpStatus } from '@golobe-demo/shared';
import { destr } from 'destr';
import ErrorBox from './components/error-box.vue';

const errorInfo = useError().value;
const appExceptionCode = ((errorInfo as any)?.data?.code) ?? (destr<any>((errorInfo as any).data)?.code);
let httpStatusCode = 500;
if(appExceptionCode) {
  httpStatusCode = mapAppExceptionToHttpStatus(appExceptionCode);
} else if(errorInfo?.statusCode) {
  httpStatusCode = errorInfo?.statusCode;
}

const appExceptionParams = ((errorInfo as any)?.data?.params) ?? (destr<any>((errorInfo as any).data)?.params) as any;

let errorMsgResName = getI18nResName2('appErrors', 'unknown');
if (appExceptionCode) {
  errorMsgResName = getUsrMsgResName(appExceptionCode);
} else if (httpStatusCode === 404) {
  errorMsgResName = getI18nResName2('appErrors', 'pageNotFound');
}

</script>

<template>
  <NuxtLayout>
    <ErrorBox :http-code="httpStatusCode" :msg-res-name="errorMsgResName" :msg-res-params="appExceptionParams" />
  </NuxtLayout>
</template>
