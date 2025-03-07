<script setup lang="ts">
import type { ControlKey } from './../../helpers/components';
import { ImageCategory, DefaultUserCoverSlug, getI18nResName2 } from '@golobe-demo/shared';
import EditableImage from './../images/editable-image.vue';
import { getCommonServices } from '../../helpers/service-accessors';

interface IProps {
  ctrlKey: ControlKey
}
const { ctrlKey } = defineProps<IProps>();

const userCoverImage = useTemplateRef('cover-image');

const userAccountStore = useUserAccountStore();
const userAccount = await userAccountStore.getUserAccount();

const logger = getCommonServices().getLogger().addContextProps({ component: 'UserCover' });

const imageSrc = ref(userAccount.cover
  ? { slug: userAccount.cover!.slug, timestamp: userAccount.cover!.timestamp }
  : { slug: DefaultUserCoverSlug, timestamp: undefined }
);

watch(userAccount, () => {
  logger.debug('user account watch handler', ctrlKey);
  if (userAccount.cover && imageSrc.value?.slug !== userAccount.cover?.slug) {
    logger.verbose('user image changed', { ctrlKey, editSlug: imageSrc.value?.slug, newSlug: userAccount.cover?.slug });
    userCoverImage.value?.setImage(userAccount.cover!);
  }
});

watch(imageSrc, () => {
  logger.debug('edit image watch handler', { ctrlKey, editSlug: imageSrc.value?.slug });
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
    logger.verbose('setting up initial image', { ctrlKey, editSlug: imageSrc.value?.slug, newSlug: userAccount.cover?.slug });
    userCoverImage.value!.setImage(userAccount.cover!);
  }
});

</script>

<template>
  <EditableImage
    ref="cover-image"
    v-model:entity-src="imageSrc"
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
