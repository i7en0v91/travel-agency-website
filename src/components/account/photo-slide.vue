<script setup lang="ts">
import type { ControlKey } from './../../helpers/components';
import { type I18nResName, ImageCategory } from '@golobe-demo/shared';

interface IProps {
  ctrlKey: ControlKey,
  altResName: I18nResName,
  imgSlug: string
}
defineProps<IProps>();

</script>

<template>
  <StaticImage
    :ctrl-key="[...ctrlKey, 'StaticImg']"
    stub="default"
    class="account-forms-photo"
    :ui="{ img: 'account-forms-photo-img' }"
    :src="{ slug: imgSlug }"
    :category="ImageCategory.AuthFormsImage"
    sizes="xs:0vw sm:50vw md:50vw lg:40vw xl:30vw"
    :alt="{ resName: altResName }"
    high-priority
  />
</template>
