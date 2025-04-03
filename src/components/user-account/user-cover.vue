<script setup lang="ts">
import type { ControlKey } from './../../helpers/components';
import { LOADING_STATE } from './../../helpers/constants';
import { ImageCategory, DefaultUserCoverSlug, getI18nResName2 } from '@golobe-demo/shared';
import EditableImage from './../images/editable-image.vue';

interface IProps {
  ctrlKey: ControlKey
}
const { ctrlKey } = defineProps<IProps>();

const userAccountStore = useUserAccountStore();
const imageSrc = computed(() => {
  return (userAccountStore.cover && userAccountStore.cover !== LOADING_STATE) ? 
    userAccountStore.cover : { slug: DefaultUserCoverSlug, timestamp: undefined };
});

</script>

<template>
  <EditableImage
    ref="cover-image"
    :entity-src="imageSrc"
    :category="ImageCategory.UserCover"
    :ctrl-key="[...ctrlKey, 'EditableImg']"
    class="user-cover"
    sizes="xs:100vw sm:100vw md:100vw lg:100vw xl:100vw"
    :is-high-priority="true"
    :alt-res-name="getI18nResName2('accountPage', 'coverAlt')"
    :btn-res-name="getI18nResName2('accountPage', 'uploadCover')"
    :styling="{ containerClass: 'user-cover-image-container', htmlImgClass: 'user-cover-image-el', btnClass: 'user-cover-upload-btn', btnIcon: 'upload' }"
  />
</template>
