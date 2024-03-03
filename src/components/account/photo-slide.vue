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
    sizes="xs:0vw sm:50vw md:50vw lg:40vw xl:30vw"
    :alt-res-name="altResName"
  />
</template>
