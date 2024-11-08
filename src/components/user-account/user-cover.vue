<script setup lang="ts">
import { ImageCategory, DefaultUserCoverSlug, getI18nResName2 } from '@golobe-demo/shared';
import EditableImage from './../images/editable-image.vue';
import { type ComponentInstance } from 'vue';
import { getCommonServices } from '../../helpers/service-accessors';

interface IProps {
  ctrlKey: string
}
const props = defineProps<IProps>();

const userCoverImage = shallowRef<ComponentInstance<typeof EditableImage>>();

const userAccountStore = useUserAccountStore();
const userAccount = await userAccountStore.getUserAccount();

const logger = getCommonServices().getLogger();

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
    sizes="xs:100vw sm:100vw md:100vw lg:100vw xl:100vw"
    :is-high-priority="true"
    :alt-res-name="getI18nResName2('accountPage', 'coverAlt')"
    :btn-res-name="getI18nResName2('accountPage', 'uploadCover')"
    :ui="{ 
      wrapper: 'grid w-full z-[1] grid-rows-1 grid-cols-1 min-h-[300px] row-start-1 row-end-2 col-start-1 col-end-2 *:row-start-1 *:row-end-2 *:col-start-1 *:col-end-2 *:last:self-end *:last:justify-self-end', 
      image: { 
        wrapper: 'row-start-1 row-end-2 col-start-1 col-end-2 w-full h-full rounded-xl', 
        stub: 'rounded-xl',
        img: 'rounded-xl h-full'
      }, 
      btn: {
        wrapper: 'z-[2] max-w-[50vw] mb-2 mr-2 sm:mb-8 sm:mr-8'
      }
    }"
  />
</template>
