<script setup lang="ts">
import { getI18nResName2, AppException, type AppExceptionAppearance, AppExceptionCodeEnum } from '@golobe-demo/shared';
import { defaultErrorHandler } from '../../helpers/exceptions';

interface IProps {
  isError: boolean,
  appearance?: AppExceptionAppearance,
  userNotification?: boolean,
  ui?: {
    stub?: string
  }
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
  <div class="contents">
    <NuxtErrorBoundary v-if="!isError" @error="onError">
      <slot />
    </NuxtErrorBoundary>
    <div v-else :class="`w-full h-full rounded-2xl p-2 flex flex-col flex-nowrap gap-[8px] justify-center items-center border-inherit bg-red-200 ${ui?.stub}`">
      <UIcon name="i-gridicons-cross-circle" class="w-8 h-8 bg-red-500"/>
      <div class="text-sm sm:text-base text-red-500 font-medium">
        {{ $t(getI18nResName2('appErrors','helm')) }}
      </div>
    </div>
  </div>
</template>
