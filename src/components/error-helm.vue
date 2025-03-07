<script setup lang="ts">
import { getI18nResName2, AppException, type AppExceptionAppearance, AppExceptionCodeEnum } from '@golobe-demo/shared';
import { defaultErrorHandler } from './../helpers/exceptions';

interface IProps {
  isError: boolean,
  appearance?: AppExceptionAppearance,
  userNotification?: boolean
}
const { 
  isError = false, 
  appearance = 'error-stub', 
  userNotification = false 
} = defineProps<IProps>();

const nuxtApp = useNuxtApp();
const userNotificationStore = useUserNotificationStore();

function onError (err: any) {
  if (err) {
    err.errorHelmed = true;
  }

  $emit('update:isError', true);
  if (appearance === 'error-stub' && !userNotification) {
    // error should have been logged in global error hooks
    return;
  }

  let appException: AppException;
  if (AppException.isAppException(err)) {
    appException = err as AppException;
  } else {
    appException = new AppException(
      AppExceptionCodeEnum.UNKNOWN,
      'unhandled exception occured',
      appearance);
  }

  defaultErrorHandler(appException, { nuxtApp, userNotificationStore });
}

const $emit = defineEmits(['update:isError']);

</script>

<template>
  <div class="error-helm">
    <NuxtErrorBoundary v-if="!isError" @error="onError">
      <slot />
    </NuxtErrorBoundary>
    <div v-else class="error-helm-stub">
      <div class="error-helm-stub-icon" />
      <div class="error-helm-stub-text">
        {{ $t(getI18nResName2('appErrors','helm')) }}
      </div>
    </div>
  </div>
</template>
