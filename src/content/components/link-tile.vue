<script setup lang="ts">
import { AppPage, SystemPage, type Locale, lookupPageByUrl } from '@golobe-demo/shared';
import PageImageLink from '../../components/common-page-components/page-image-link.vue';

interface IProps {
  imageName: 'flights' | 'stays',
  linkUrl: string,
  btnLabel: string
}
const props = defineProps<IProps>();

const { locale } = useI18n();
const navLinkBuilder = useNavLinkBuilder();
const to = computed(() => {
  let page = lookupPageByUrl(props.linkUrl);
  if(page === SystemPage.Drafts)  {
    page = AppPage.Index;
  };
  return navLinkBuilder.buildPageLink(
    page as AppPage, 
    locale.value as Locale
  );
});

</script>

<template>
  <PageImageLink :ctrl-key="`ImageLink-${props.imageName}`" :btn-label="btnLabel" :link-url="to" :image-name="imageName" :external="false">
    <template #title>
      <slot name="title" />
    </template>

    <template #sub>
      <slot name="sub" />
    </template>
  </PageImageLink>
</template>
