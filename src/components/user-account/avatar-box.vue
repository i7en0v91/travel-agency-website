<script setup lang="ts">
import type { ControlKey } from './../../helpers/components';
import { LOADING_STATE } from './../../helpers/constants';
import { DefaultUserAvatarSlug, ImageCategory, getI18nResName2 } from '@golobe-demo/shared';
import EditableImage from './../images/editable-image.vue';

interface IProps {
  ctrlKey: ControlKey
}
const { ctrlKey } = defineProps<IProps>();

const userAccountStore = useUserAccountStore();
const hasAvatar = computed(() => userAccountStore.avatar && userAccountStore.avatar !== LOADING_STATE);
const imageSrc = computed(() => {
  return hasAvatar.value ? userAccountStore.avatar : { slug: DefaultUserAvatarSlug, timestamp: undefined };
});

</script>

<template>
  <!-- show-stub="false" - as user may upload avatar with trasperancy.
      Then, in case such avatar image is loaded before hydration (e.g. from browser cache)
      background stub animation behind actual avatar may be interpreted by user as an "artifact" -->
  <EditableImage
    :entity-src="imageSrc"
    :category="ImageCategory.UserAvatar"
    :ctrl-key="[...ctrlKey, 'EditableImg']"
    :class="`avatar-box ${!hasAvatar ? 'avatar-default' : ''}`"
    sizes="xs:50vw sm:30vw md:20vw lg:10vw xl:10vw"
    :fill-alpha="false"
    :show-stub="false"
    :alt-res-name="getI18nResName2('accountPage', 'avatarAlt')"
    :styling="{ containerClass: 'user-avatar-image-container', htmlImgClass: 'user-avatar-image-el', btnClass: 'user-avatar-upload-btn' }"
  />
</template>
