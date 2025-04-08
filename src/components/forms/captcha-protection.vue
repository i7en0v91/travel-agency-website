<script setup lang="ts">
import type { ControlKey } from './../../helpers/components';
import { maskLog, getI18nResName2, AppConfig, UserNotificationLevel } from '@golobe-demo/shared';
import { useThemeSettings } from './../../composables/theme-settings';
import { getCommonServices } from '../../helpers/service-accessors';

const recaptcha = useTemplateRef('recaptcha');
const themeSettings = useThemeSettings();
const { locale } = useI18n();
const userNotificationStore = useUserNotificationStore();

interface IProps {
  ctrlKey: ControlKey
}
const { ctrlKey } = defineProps<IProps>();

const logger = getCommonServices().getLogger().addContextProps({ component: 'CaptchaProtection' });
let verificationRequested = false;

function doStartVerification () {
  logger.verbose('starting reCaptcha verification', ctrlKey);
  if (!recaptcha.value) {
    logger.warn('cannot start reCaptcha verification, not initialized', undefined, ctrlKey);
    verificationRequested = false;
    userNotificationStore.show({
      level: UserNotificationLevel.ERROR,
      resName: getI18nResName2('appErrors', 'captchaError')
    });
    $emit('failed');
    return;
  }

  if (!(window as any).grecaptcha?.execute) {
    logger.debug('grecaptcha has not been initialized yet, rescheduling', ctrlKey);
    setTimeout(doStartVerification, 100);
    return;
  }

  recaptcha.value!.execute();
}

function startVerification () {
  if (verificationRequested) {
    logger.warn('ignoring verification request, already requested', undefined, ctrlKey);
    return;
  }
  verificationRequested = true;

  if (AppConfig.reCaptcha.enabled) {
    logger.verbose('requesting verification', ctrlKey);
    if (recaptcha.value) {
      doStartVerification();
      return;
    }
    logger.verbose('reCaptcha is not initialized, waiting', ctrlKey);
    watch(recaptcha, () => {
      if (recaptcha.value) {
        doStartVerification();
      }
    });
  } else {
    logger.verbose('reCaptcha disabled, returning immediately', ctrlKey);
    verificationRequested = false;
    $emit('verified', '');
  }
}

const $emit = defineEmits(['verified', 'failed']);
defineExpose({
  startVerification
});

function onVerify (recaptchaToken?: string): void {
  verificationRequested = false;
  if (recaptchaToken) {
    logger.info('acquired reCaptcha client verification token', { ctrlKey, token: maskLog(recaptchaToken) });
    $emit('verified', recaptchaToken);
  } else {
    logger.warn('reCaptcha returned empty token', undefined, ctrlKey);
    recaptcha.value!.reset();
    $emit('failed');
  }
}

function onError (reason: any) {
  logger.warn('got reCaptcha client exception', undefined, { ctrlKey, reason });
  verificationRequested = false;
  userNotificationStore.show({
    level: UserNotificationLevel.ERROR,
    resName: getI18nResName2('appErrors', 'captchaError')
  });
  $emit('failed');
}

function onExpire (..._: any[]): any {
  logger.info('reCaptcha expired', ctrlKey);
  verificationRequested = false;
  recaptcha.value!.reset();
  $emit('failed');
}

function onFail (..._: any[]): any {
  logger.info('reCaptcha client verification failed', ctrlKey);
  verificationRequested = false;
  userNotificationStore.show({
    level: UserNotificationLevel.ERROR,
    resName: getI18nResName2('appErrors', 'captchaError')
  });
  $emit('failed');
}

const siteKey = import.meta.env.VITE_GOOGLE_RECAPTCHA_PUBLICKEY;

</script>

<template>
  <ClientOnly>
    <VueRecaptcha
      v-if="AppConfig.reCaptcha.enabled"
      ref="recaptcha"
      :theme="themeSettings.currentTheme.value"
      :size="AppConfig.reCaptcha.size"
      :sitekey="siteKey"
      :hl="locale"
      @expire="onExpire"
      @fail="onFail"
      @verify="onVerify"
      @error="onError"
    />
  </ClientOnly>
</template>
