<script setup lang="ts">

import { DefaultUserCoverSlug } from './../../shared/constants';
import { ImageCategory } from './../../shared/interfaces';
import { useUserAccountStore } from './../../stores/user-account-store';
import { getI18nResName2 } from './../../shared/i18n';
import EditableImage from './../images/editable-image.vue';

interface IProps {
  ctrlKey: string
}
defineProps<IProps>();

const userAccountStore = useUserAccountStore();
const userAccount = await userAccountStore.getUserAccount();

const imageSrc = ref(userAccount.cover
  ? { slug: userAccount.cover!.slug, timestamp: userAccount.cover!.timestamp }
  : { slug: DefaultUserCoverSlug, timestamp: undefined }
);

watch(imageSrc, () => {
  if (imageSrc.value) {
    userAccountStore.notifyUserAccountChanged({
      cover: {
        slug: imageSrc.value.slug,
        timestamp: imageSrc.value.timestamp
      }
    });
  }
});

</script>

<template>
  <EditableImage
    v-model:entity-src="imageSrc"
    :category="ImageCategory.UserCover"
    ctrl-key="userCover"
    class="user-cover"
    sizes="sm:100vw md:100vw lg:100vw xl:100vw xxl:100vw"
    :is-high-priority="true"
    :alt-res-name="getI18nResName2('accountPage', 'coverAlt')"
    :btn-res-name="getI18nResName2('accountPage', 'uploadCover')"
    :styling="{ containerClass: 'user-cover-image-container', htmlImgClass: 'user-cover-image-el', btnClass: 'user-cover-upload-btn', btnIcon: 'upload' }"
  />
</template>
