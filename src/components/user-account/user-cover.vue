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
        wrapper: 'z-[2] max-w-[50vw] mb-2 mr-2 sm:mb-8 sm:mr-8',
        base: 'w-full'
      }
    }"
  />
</template>
