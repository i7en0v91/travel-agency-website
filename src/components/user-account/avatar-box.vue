<script setup lang="ts">

import { getI18nResName2 } from './../../shared/i18n';
import { ImageCategory } from './../../shared/interfaces';
import { DefaultUserAvatarSlug } from './../../shared/constants';

interface IProps {
  ctrlKey: string
}
defineProps<IProps>();

const userAccountStore = useUserAccountStore();
const userAccount = await userAccountStore.getUserAccount();

const imageSrc = ref(userAccount.avatar
  ? { slug: userAccount.avatar!.slug, timestamp: userAccount.avatar!.timestamp }
  : { slug: DefaultUserAvatarSlug, timestamp: undefined }
);

watch(imageSrc, () => {
  if (imageSrc.value) {
    userAccountStore.notifyUserAccountChanged({
      avatar: {
        slug: imageSrc.value.slug,
        timestamp: imageSrc.value.timestamp
      }
    });
  }
});

</script>

<template>
  <!-- show-stub="false" - as user may upload avatar with trasperancy.
      Then, in case such avatar image is loaded before hydration (e.g. from browser cache)
      background stub animation behind actual avatar may be interpreted by user as an "artifact" -->
  <EditableImage
    v-model:entity-src="imageSrc"
    :category="ImageCategory.UserAvatar"
    ctrl-key="userAvatar"
    class="avatar-box"
    sizes="xs:50vw sm:30vw md:20vw lg:10vw xl:10vw"
    :fill-alpha="false"
    :show-stub="false"
    :alt-res-name="getI18nResName2('accountPage', 'avatarAlt')"
    :styling="{ containerClass: 'user-avatar-image-container', htmlImgClass: 'user-avatar-image-el', btnClass: 'user-avatar-upload-btn' }"
  />
</template>
