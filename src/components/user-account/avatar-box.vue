<script setup lang="ts">

import { DefaultUserAvatarSlug, ImageCategory, type IImageEntitySrc, getI18nResName2 } from '@golobe-demo/shared';
import EditableImage from './../images/editable-image.vue';
import { getCommonServices } from '../../helpers/service-accessors';

interface IProps {
  ctrlKey: string
}
const { ctrlKey } = defineProps<IProps>();

const userAvatarImage = useTemplateRef('avatar-image');

const userAccountStore = useUserAccountStore();
const userAccount = await userAccountStore.getUserAccount();

const logger = getCommonServices().getLogger();

const imageSrc = ref(userAccount.avatar
  ? { slug: userAccount.avatar!.slug, timestamp: userAccount.avatar!.timestamp }
  : { slug: DefaultUserAvatarSlug, timestamp: undefined }
);

function checkImageSrcDiffers(firstSrc: IImageEntitySrc | undefined, secondSrc: IImageEntitySrc | undefined): boolean {
  if(!firstSrc && !secondSrc) {
    logger.debug(`(UserAvatar) image src are the same, ctrlKey=${ctrlKey}, first=${JSON.stringify(firstSrc)}, second=${JSON.stringify(secondSrc)}`);
    return false;
  }

  if(firstSrc?.slug !== secondSrc?.slug) {
    logger.debug(`(UserAvatar) image src slugs differ, ctrlKey=${ctrlKey}, first=${JSON.stringify(firstSrc)}, second=${JSON.stringify(secondSrc)}`);
    return true;
  }

  if(firstSrc?.timestamp !== secondSrc?.timestamp) {
    logger.debug(`(UserAvatar) image src timestamps differ, ctrlKey=${ctrlKey}, first=${JSON.stringify(firstSrc)}, second=${JSON.stringify(secondSrc)}`);
    return true;
  }

  logger.debug(`(UserAvatar) image src are the same, ctrlKey=${ctrlKey}, first=${JSON.stringify(firstSrc)}, second=${JSON.stringify(secondSrc)}`);
  return false;
}

watch(userAccount, () => {
  logger.debug(`(UserAvatar) user account watch handler, ctrlKey=${ctrlKey}`);
  if (userAccount.avatar && checkImageSrcDiffers(imageSrc.value, userAccount.avatar)) {
    logger.verbose(`(UserAvatar) user image changed, ctrlKey=${ctrlKey}`);
    userAvatarImage.value?.setImage(userAccount.avatar!);
  }
});

watch(imageSrc, () => {
  logger.debug(`(UserAvatar) edit image watch handler, ctrlKey=${ctrlKey}, editSlug=${imageSrc.value?.slug}`);
  if (imageSrc.value && checkImageSrcDiffers(imageSrc.value, userAccount.avatar)) {
    logger.verbose(`(UserAvatar) user image changed, ctrlKey=${ctrlKey}`);
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
    logger.verbose(`(UserAvatar) setting up initial image, ctrlKey=${ctrlKey}, editSlug=${imageSrc.value?.slug}, newSlug=${userAccount.avatar?.slug}`);
    userAvatarImage.value!.setImage(userAccount.avatar!);
  }
});

</script>

<template>
  <!-- show-stub="false" - as user may upload avatar with transperancy.
      Then, in case such avatar image is loaded before hydration (e.g. from browser cache)
      background stub animation behind actual avatar may be interpreted by user as an "artifact" -->
  <EditableImage
    ref="avatar-image"
    v-model:entity-src="imageSrc"
    :category="ImageCategory.UserAvatar"
    ctrl-key="userAvatar"
    sizes="xs:50vw sm:30vw md:20vw lg:10vw xl:10vw"
    :fill-alpha="false"
    :show-stub="false"
    :alt-res-name="getI18nResName2('accountPage', 'avatarAlt')"
    :ui="{ 
      wrapper: 'grid z-[2] ring-4 ring-primary-500 dark:ring-primary-400 grid-rows-1 grid-cols-1 w-[100px] h-[100px] sm:w-[120px] sm:h-[120px] md:w-[160px] md:h-[160px] row-start-1 row-end-2 col-start-1 col-end-2 rounded-full',
      image: { 
        wrapper: 'row-start-1 row-end-2 col-start-1 col-end-2 w-full h-full rounded-full bg-white dark:bg-gray-900', 
        stub: 'rounded-full',
        img: `rounded-full h-full ${userAccount.avatar ? '' : 'dark:invert'}`,
        errorStub: 'rounded-full'
      }, 
      btn: {
        wrapper: 'z-[3] row-start-1 row-end-2 col-start-1 col-end-2 justify-self-end self-end',
        base: '!p-3',
        rounded: 'rounded-full',
        icon: {
          name: 'i-heroicons-pencil',
          base: 'w-5 h-5'
        } 
      }
    }"
  />
</template>
