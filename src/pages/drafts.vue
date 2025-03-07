<script setup lang="ts">
import { SystemPage, lookupPageByUrl, AppException, AppExceptionCodeEnum, QueryDraftRequestPathParam, getI18nResName2 } from '@golobe-demo/shared';
import { defaultErrorHandler } from './../helpers/exceptions';
import ComponentWaitingIndicator from './../components/component-waiting-indicator.vue';
import { getCommonServices } from '../helpers/service-accessors';
import type { ControlKey } from './../helpers/components';

const nuxtApp = useNuxtApp();
const userNotificationStore = useUserNotificationStore();
const { t } = useI18n();

definePageMeta({
  title: { resName: getI18nResName2('draftsPage', 'title'), resArgs: undefined },
  layout: false
});

useHead({
  script: [
    { src: '/js/page-load.min.js', type: 'module' },
  ],
  link: [
    { rel: 'icon', href: '/img/waiter.gif' }
  ],
  title: t(getI18nResName2('draftsPage', 'title'))
});

const CtrlKey: ControlKey = ['Page', 'Drafts'];

await usePageSetup();

const logger = getCommonServices().getLogger().addContextProps({ component: 'Drafts' });
const query = useRoute().query;

async function navigateToRequestedPage(): Promise<void> {
  const reqPath = (query ?? {})[QueryDraftRequestPathParam]?.toString();
  logger.verbose('navigating to request page', { path: reqPath });

  if(!reqPath) {
    logger.warn('failed to navigate to requested page - cannot detect path', undefined, { path: reqPath });
    defaultErrorHandler(new AppException(AppExceptionCodeEnum.BAD_REQUEST, 'application page not specified', 'error-page'), { nuxtApp, userNotificationStore });
    return;
  }

  const reqPage = lookupPageByUrl(reqPath);
  if(!reqPage) {
    logger.warn('failed to detect requested page type', undefined, { path: reqPath });
    defaultErrorHandler(new AppException(AppExceptionCodeEnum.BAD_REQUEST, 'invalid application page', 'error-page'), { nuxtApp, userNotificationStore });
    return;
  }

  if(reqPage === SystemPage.Drafts) {
    logger.warn('target request page cannot be draft', undefined, { path: reqPath });
    defaultErrorHandler(new AppException(AppExceptionCodeEnum.BAD_REQUEST, 'invalid application page', 'error-page'), { nuxtApp, userNotificationStore });
    return;
  }

  try {
    await navigateTo(reqPath);
  } catch(err: any) {
    logger.warn('failed to navigate to requested page', err, { path: reqPath });
    defaultErrorHandler(new AppException(AppExceptionCodeEnum.UNKNOWN, 'failed to navigate to application page', 'error-page'), { nuxtApp, userNotificationStore });
    return;
  }

  logger.verbose('navigated to request page', { path: reqPath });
}

onMounted(() => {
  nextTick(navigateToRequestedPage);
});

</script>

<template>
  <div class="drafts-waiting-indicator-div">
    <ComponentWaitingIndicator :ctrl-key="[...CtrlKey, 'Waiter']" class="drafts-waiting-indicator" />
  </div>
</template>


<style lang="scss">
  @use "~/assets/scss/utils";
  @use "~/assets/scss/themes";
  @use "~/assets/scss/main";
  @use "~/assets/scss/system";
</style>