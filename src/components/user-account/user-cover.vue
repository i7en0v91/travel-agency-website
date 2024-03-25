<script setup lang="ts">

import { DefaultUserCoverSlug } from './../../shared/constants';
import { ImageCategory } from './../../shared/interfaces';
import { getI18nResName2 } from './../../shared/i18n';
import EditableImage from './../images/editable-image.vue';

interface IProps {
  ctrlKey: string
}
const props = defineProps<IProps>();

const userCoverImage = ref<InstanceType<typeof EditableImage>>();

const userAccountStore = useUserAccountStore();
const userAccount = await userAccountStore.initializeUserAccount();

const logger = CommonServicesLocator.getLogger();

const imageSrc = ref(userAccount.cover
  ? { slug: userAccount.cover!.slug, timestamp: userAccount.cover!.timestamp }
  : { slug: DefaultUserCoverSlug, timestamp: undefined }
);

watch(userAccount, () => {
  logger.debug(`(UserCover) user account watch handler, ctrlKey=${props.ctrlKey}`);
  if (userAccount.cover && imageSrc.value?.slug !== userAccount.cover?.slug) {
    logger.verbose(`(UserCover) user image changed, ctrlKey=${props.ctrlKey}, editSlug=${imageSrc.value?.slug}, newSlug=${userAccount.cover?.slug}`);
    userCoverImage.value?.setImage(userAccount.cover!);
  }
});

watch(imageSrc, () => {
  logger.debug(`(UserCover) edit image watch handler, ctrlKey=${props.ctrlKey}, editSlug=${imageSrc.value?.slug}`);
  if (imageSrc.value) {
    userAccountStore.notifyUserAccountChanged({
      cover: {
        slug: imageSrc.value.slug,
        timestamp: imageSrc.value.timestamp
      }
    });
  }
});

onMounted(() => {
  if (userAccount.cover && imageSrc.value?.slug !== userAccount.cover?.slug) {
    logger.verbose(`(UserCover) setting up initial image, ctrlKey=${props.ctrlKey}, editSlug=${imageSrc.value?.slug}, newSlug=${userAccount.cover?.slug}`);
    userCoverImage.value!.setImage(userAccount.cover!);
  }
});

</script>

<template>
  <EditableImage
    ref="userCoverImage"
    v-model:entity-src="imageSrc"
    :category="ImageCategory.UserCover"
    ctrl-key="userCover"
    class="user-cover"
    sizes="xs:100vw sm:100vw md:100vw lg:100vw xl:100vw"
    :is-high-priority="true"
    :alt-res-name="getI18nResName2('accountPage', 'coverAlt')"
    :btn-res-name="getI18nResName2('accountPage', 'uploadCover')"
    :styling="{ containerClass: 'user-cover-image-container', htmlImgClass: 'user-cover-image-el', btnClass: 'user-cover-upload-btn', btnIcon: 'upload' }"
  />
</template>
