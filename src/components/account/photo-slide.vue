<script setup lang="ts">

import { type I18nResName, ImageCategory } from '@golobe-demo/shared';

interface IProps {
  ctrlKey: string,
  altResName: I18nResName,
  imgSlug: string,
  increasedHeight?: boolean
}
defineProps<IProps>();

</script>

<template>
  <StaticImage
    :ctrl-key="`${ctrlKey}StaticImg`"
    :show-stub="true"
    :is-high-priority="true"
    class="w-full h-full"
    :img-class="increasedHeight ? '!h-[1054px]' : '!h-[812px]'"
    :entity-src="{ slug: imgSlug }"
    :category="ImageCategory.AuthFormsImage"
    sizes="xs:0vw sm:50vw md:50vw lg:40vw xl:30vw"
    :alt-res-name="altResName"
  />
</template>
