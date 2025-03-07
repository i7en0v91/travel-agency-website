<script setup lang="ts">
import type { ControlKey } from './../../helpers/components';
import { type I18nResName, ImageCategory } from '@golobe-demo/shared';
import type { IStaticImageUiProps } from './../../types';

interface IProps {
  ctrlKey: ControlKey,
  altResName: I18nResName,
  imgSlug: string,
  ui?: {
    wrapper?: string
    image?: IStaticImageUiProps
  } 
}
defineProps<IProps>();

</script>

<template>
  <StaticImage
    :ctrl-key="[...ctrlKey, 'StaticImg']"
    stub="default"
    :class="ui?.wrapper"
    :ui="{ ...(ui?.image ?? {  }), wrapper: `w-full h-full ${ui?.image?.wrapper ?? ''}` }"
    :src="{ slug: imgSlug }"
    :category="ImageCategory.AuthFormsImage"
    sizes="xs:0vw sm:50vw md:50vw lg:40vw xl:30vw"
    :alt="{ resName: altResName }"
    high-priority
  />
</template>
