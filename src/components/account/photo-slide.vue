<script setup lang="ts">

import { type I18nResName } from './../../shared/i18n';
import { ImageCategory } from './../../shared/interfaces';

interface IProps {
  ctrlKey: string,
  altResName: I18nResName,
  imgSlug: string
}
defineProps<IProps>();

</script>

<template>
  <StaticImage
    :ctrl-key="`${ctrlKey}StaticImg`"
    :show-stub="true"
    :is-high-priority="true"
    class="account-forms-photo"
    img-class="account-forms-photo-img"
    :entity-src="{ slug: imgSlug }"
    :category="ImageCategory.AuthFormsImage"
    sizes="sm:0vw md:50vw lg:50vw xl:40vw xxl:30vw"
    :alt-res-name="altResName"
  />
</template>
