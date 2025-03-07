<script setup lang="ts">
import { type AppPage, SystemPage, lookupPageByUrl, type Locale, localizePath, getPagePath } from '@golobe-demo/shared';
import ProseStyling from './../../content/prose/styling';
import { getClientServices, getCommonServices } from './../../helpers/service-accessors';
import type { QueryBuilderParams } from '@nuxt/content';
import { ContentPages } from './../../helpers/constants';


interface IProps {
  tag?: string,
  contentParams?: any
};
withDefaults(defineProps<IProps>(), {
  tag: 'div',
  contentParams: null
});

const logger = getCommonServices().getLogger().addContextProps({ component: 'AppPageMdc' });
const route = useRoute();

const contentPage = computed<AppPage | undefined>(() => {
  const page = lookupPageByUrl(route.path);
  if(page && page != SystemPage.Drafts && ContentPages.pagesWithMdc.includes(page)) {
    return page;
  }
  return undefined;
});
const queryParams = computed<QueryBuilderParams | undefined>(() => {
  if(contentPage.value) {
    return queryContent().params();
  }
  return undefined;
});

const { locale } = useI18n();

const nuxtApp = useNuxtApp();
const isHydrating = nuxtApp.isHydrating;

// show *.vue components as soon as possible, then render MDC
const waitingForMount = ref(false);
if(import.meta.client && !isHydrating) {
  const navFromPage = getClientServices().state.navigatedFromPage;
  if(navFromPage && navFromPage !== SystemPage.Drafts) {
    if(ContentPages.fromRoutesRequiringMount.includes(navFromPage)) {
      logger.verbose('mdc renderer will wait for mount', { path: route.fullPath, page: navFromPage }); 
      waitingForMount.value = true;
    } else {
      logger.debug('page being navigated from doesnt require waiting for mount', { path: route.fullPath, page: navFromPage });  
    }
  } else {
    logger.verbose('page being navigated from was not indetified, wont wait for mount', { path: route.fullPath });
  }
}

onMounted(() => {
  waitingForMount.value = false;
});

</script>

<template>
  <ContentDoc v-if="contentPage && !waitingForMount" :tag="tag" :path="localizePath(`/${getPagePath(contentPage!!)}`, locale as Locale)" :query="queryParams">
    <template #default="{ doc }">
      <ContentRenderer 
        :value="doc" 
        :data="contentParams"
        :components="ProseStyling"
      >
        <template #empty>
          <ComponentWaitingIndicator :ctrl-key="['PageContent', 'Waiter']" class="my-5"/>
        </template>
      </ContentRenderer>
    </template>
  </ContentDoc>
  <ComponentWaitingIndicator v-else-if="contentPage" :ctrl-key="['PageContent', 'Waiter']" class="my-5"/>
</template>
