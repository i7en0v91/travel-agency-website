<script setup lang="ts">

import { destr } from 'destr';
import type { AppExceptionCodeEnum } from './shared/exceptions';
import { getUsrMsgResName } from './shared/exceptions';
import ErrorBox from './components/error-box.vue';
import { getI18nResName2 } from './shared/i18n';

const errorInfo = useError().value;
let httpStatusCode = 500;
if (!(errorInfo instanceof Error)) {
  httpStatusCode = errorInfo!.statusCode;
}

const appExceptionCode = ((errorInfo as any)?.data?.code) ?? (destr<any>((errorInfo as any).data)?.code) as AppExceptionCodeEnum;
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
