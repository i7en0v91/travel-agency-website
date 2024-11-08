<script setup lang="ts">
import PageImageLink from '../../components/common-page-components/page-image-link.vue';

interface IProps {
  imageName: 'flights' | 'stays',
  linkUrl: string,
  btnLabel: string
}
const props = defineProps<IProps>();

</script>

<template>
  <PageImageLink :ctrl-key="`ImageLink-${props.imageName}`" :btn-label="btnLabel" :link-url="linkUrl" :image-name="imageName">
    <template #title>
      <slot name="title" />
    </template>

    <template #sub>
      <slot name="sub" />
    </template>
  </PageImageLink>
</template>
