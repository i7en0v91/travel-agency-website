<script setup lang="ts">

import { DefaultUserAvatarSlug, ImageCategory, type IImageEntitySrc, getI18nResName2 } from '@golobe-demo/shared';
import EditableImage from './../images/editable-image.vue';
import { type ComponentInstance } from 'vue';
import { getCommonServices } from '../../helpers/service-accessors';

interface IProps {
  ctrlKey: string
}
const props = defineProps<IProps>();

const userAvatarImage = shallowRef<ComponentInstance<typeof EditableImage>>();

const userAccountStore = useUserAccountStore();
const userAccount = await userAccountStore.getUserAccount();

const logger = getCommonServices().getLogger();

const imageSrc = ref(userAccount.avatar
  ? { slug: userAccount.avatar!.slug, timestamp: userAccount.avatar!.timestamp }
  : { slug: DefaultUserAvatarSlug, timestamp: undefined }
);

function checkImageSrcDiffers(firstSrc: IImageEntitySrc | undefined, secondSrc: IImageEntitySrc | undefined): boolean {
  if(!firstSrc && !secondSrc) {
    logger.debug(`(UserAvatar) image src are the same, ctrlKey=${props.ctrlKey}, first=${JSON.stringify(firstSrc)}, second=${JSON.stringify(secondSrc)}`);
    return false;
  }

  if(firstSrc?.slug !== secondSrc?.slug) {
    logger.debug(`(UserAvatar) image src slugs differ, ctrlKey=${props.ctrlKey}, first=${JSON.stringify(firstSrc)}, second=${JSON.stringify(secondSrc)}`);
    return true;
  }

  if(firstSrc?.timestamp !== secondSrc?.timestamp) {
    logger.debug(`(UserAvatar) image src timestamps differ, ctrlKey=${props.ctrlKey}, first=${JSON.stringify(firstSrc)}, second=${JSON.stringify(secondSrc)}`);
    return true;
  }

  logger.debug(`(UserAvatar) image src are the same, ctrlKey=${props.ctrlKey}, first=${JSON.stringify(firstSrc)}, second=${JSON.stringify(secondSrc)}`);
  return false;
}

watch(userAccount, () => {
  logger.debug(`(UserAvatar) user account watch handler, ctrlKey=${props.ctrlKey}`);
  if (userAccount.avatar && checkImageSrcDiffers(imageSrc.value, userAccount.avatar)) {
    logger.verbose(`(UserAvatar) user image changed, ctrlKey=${props.ctrlKey}`);
    userAvatarImage.value?.setImage(userAccount.avatar!);
  }
});

watch(imageSrc, () => {
  logger.debug(`(UserAvatar) edit image watch handler, ctrlKey=${props.ctrlKey}, editSlug=${imageSrc.value?.slug}`);
  if (imageSrc.value && checkImageSrcDiffers(imageSrc.value, userAccount.avatar)) {
    logger.verbose(`(UserAvatar) user image changed, ctrlKey=${props.ctrlKey}`);
    userAccountStore.notifyUserAccountChanged({
      avatar: {
        slug: imageSrc.value.slug,
        timestamp: imageSrc.value.timestamp
      }
    });
  }
});

onMounted(() => {
  if (userAccount.avatar && checkImageSrcDiffers(imageSrc.value, userAccount.avatar)) {
    logger.verbose(`(UserAvatar) setting up initial image, ctrlKey=${props.ctrlKey}, editSlug=${imageSrc.value?.slug}, newSlug=${userAccount.avatar?.slug}`);
    userAvatarImage.value!.setImage(userAccount.avatar!);
  }
});

</script>

<template>
  <!-- show-stub="false" - as user may upload avatar with trasperancy.
      Then, in case such avatar image is loaded before hydration (e.g. from browser cache)
      background stub animation behind actual avatar may be interpreted by user as an "artifact" -->
  <EditableImage
    ref="userAvatarImage"
    v-model:entity-src="imageSrc"
    :category="ImageCategory.UserAvatar"
    ctrl-key="userAvatar"
    :class="`avatar-box ${!(userAccount.avatar) ? 'avatar-default' : ''}`"
    sizes="xs:50vw sm:30vw md:20vw lg:10vw xl:10vw"
    :fill-alpha="false"
    :show-stub="false"
    :alt-res-name="getI18nResName2('accountPage', 'avatarAlt')"
    :styling="{ containerClass: 'user-avatar-image-container', htmlImgClass: 'user-avatar-image-el', btnClass: 'user-avatar-upload-btn' }"
  />
</template>
