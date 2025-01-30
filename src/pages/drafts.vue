<script setup lang="ts">
import { SystemPage, lookupPageByUrl, AppException, AppExceptionCodeEnum, QueryDraftRequestPathParam, getI18nResName2 } from '@golobe-demo/shared';
import { defaultErrorHandler } from './../helpers/exceptions';
import ComponentWaitingIndicator from './../components/component-waiting-indicator.vue';
import { getCommonServices } from '../helpers/service-accessors';

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

await usePageSetup();

const logger = getCommonServices().getLogger();
const query = useRoute().query;

async function navigateToRequestedPage(): Promise<void> {
  const reqPath = (query ?? {})[QueryDraftRequestPathParam]?.toString();
  logger.verbose(`(Drafts) navigating to request page, path=[${reqPath}]`);

  if(!reqPath) {
    logger.warn(`(Drafts) failed to navigate to requested page - cannot detect path, path=[${reqPath}]`);
    defaultErrorHandler(new AppException(AppExceptionCodeEnum.BAD_REQUEST, 'application page not specified', 'error-page'));
    return;
  }

  const reqPage = lookupPageByUrl(reqPath);
  if(!reqPage) {
    logger.warn(`(Drafts) failed to detect requested page type, path=[${reqPath}]`);
    defaultErrorHandler(new AppException(AppExceptionCodeEnum.BAD_REQUEST, 'invalid application page', 'error-page'));
    return;
  }

  if(reqPage === SystemPage.Drafts) {
    logger.warn(`(Drafts) target request page cannot be of [${SystemPage.Drafts}] type, path=[${reqPath}]`);
    defaultErrorHandler(new AppException(AppExceptionCodeEnum.BAD_REQUEST, 'invalid application page', 'error-page'));
    return;
  }

  try {
    await navigateTo(reqPath);
  } catch(err: any) {
    logger.warn(`(Drafts) failed to navigate to requested page, path=[${reqPath}]`, err);
    defaultErrorHandler(new AppException(AppExceptionCodeEnum.UNKNOWN, 'failed to navigate to application page', 'error-page'));
    return;
  }

  logger.verbose(`(Drafts) navigated to request page, path=[${reqPath}]`);
}

onMounted(() => {
  nextTick(navigateToRequestedPage);
});

</script>

<template>
  <div class="drafts-waiting-indicator-div">
    <ComponentWaitingIndicator ctrl-key="DraftPageWaiter" class="drafts-waiting-indicator" />
  </div>
</template>


<style lang="scss">
  @use "~/assets/scss/utils";
  @use "~/assets/scss/themes";
  @use "~/assets/scss/main";
  @use "~/assets/scss/system";
</style>