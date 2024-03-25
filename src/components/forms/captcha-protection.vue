<script setup lang="ts">

import AppConfig from './../../appconfig';
import { useThemeSettings } from './../../composables/theme-settings';
import { UserNotificationLevel } from './../../shared/constants';
import { getI18nResName2 } from './../../shared/i18n';
import { maskLog, buildParamsLogData } from './../../shared/applogger';
import type { VueRecaptcha } from '#build/components';

const recaptcha = ref<InstanceType<typeof VueRecaptcha>>();
const themeSettings = useThemeSettings();
const { locale } = useI18n();
const userNotificationStore = useUserNotificationStore();

interface IProps {
  ctrlKey: string
}
const props = defineProps<IProps>();

const logger = CommonServicesLocator.getLogger();
let verificationRequested = false;

function doStartVerification () {
  logger.verbose(`(captcha-protection) starting reCaptcha verification, ctrl-key=${props.ctrlKey}`);
  if (!recaptcha.value) {
    logger.warn(`(captcha-protection) cannot start reCaptcha verification, not initialized, ctrl-key=${props.ctrlKey}`);
    verificationRequested = false;
    userNotificationStore.show({
      level: UserNotificationLevel.ERROR,
      resName: getI18nResName2('appErrors', 'captchaError')
    });
    $emit('failed');
    return;
  }

  if (!(window as any).grecaptcha?.execute) {
    logger.debug(`(captcha-protection) grecaptcha has not been initialized yet, rescheduling, ctrl-key=${props.ctrlKey}`);
    setTimeout(doStartVerification, 100);
    return;
  }

  recaptcha.value!.execute();
}

function startVerification () {
  if (verificationRequested) {
    logger.warn(`(captcha-protection) ignoring verification request, already requested, ctrl-key=${props.ctrlKey}`);
    return;
  }
  verificationRequested = true;

  if (AppConfig.reCaptcha.enabled) {
    logger.verbose(`(captcha-protection) requesting verification, ctrl-key=${props.ctrlKey}`);
    if (recaptcha.value) {
      doStartVerification();
      return;
    }
    logger.verbose(`(captcha-protection) reCaptcha is not initialized, waiting, ctrl-key=${props.ctrlKey}`);
    watch(recaptcha, () => {
      if (recaptcha.value) {
        doStartVerification();
      }
    });
  } else {
    logger.verbose(`(captcha-protection) reCaptcha disabled, returning immediately, ctrl-key=${props.ctrlKey}`);
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
    logger.info(`(captcha-protection) acquired reCaptcha client verification token, ctrl-key=${props.ctrlKey}, token=${maskLog(recaptchaToken)}`);
    $emit('verified', recaptchaToken);
  } else {
    logger.warn(`(captcha-protection) reCaptcha returned empty token, ctrl-key=${props.ctrlKey}`);
    recaptcha.value!.reset();
    $emit('failed');
  }
}

function onError (reason: any) {
  logger.warn(`(captcha-protection) got reCaptcha client exception, ctrl-key=${props.ctrlKey}`, reason);
  verificationRequested = false;
  userNotificationStore.show({
    level: UserNotificationLevel.ERROR,
    resName: getI18nResName2('appErrors', 'captchaError')
  });
  $emit('failed');
}

function onExpire (...args: any[]): any {
  logger.info(`(captcha-protection) reCaptcha expired, ctrl-key=${props.ctrlKey}`, buildParamsLogData(args));
  verificationRequested = false;
  recaptcha.value!.reset();
  $emit('failed');
}

function onFail (...args: any[]): any {
  logger.info(`(captcha-protection) reCaptcha client verification failed, ctrl-key=${props.ctrlKey}`, buildParamsLogData(args));
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
