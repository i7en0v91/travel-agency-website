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
  <!-- show-stub="false" - as user may upload avatar with transperancy.
      Then, in case such avatar image is loaded before hydration (e.g. from browser cache)
      background stub animation behind actual avatar may be interpreted by user as an "artifact" -->
  <EditableImage
    :entity-src="imageSrc"
    :category="ImageCategory.UserAvatar"
    :ctrl-key="[...ctrlKey, 'EditableImg']"
    sizes="xs:50vw sm:30vw md:20vw lg:10vw xl:10vw"
    :fill-alpha="false"
    :show-stub="false"
    :alt-res-name="getI18nResName2('accountPage', 'avatarAlt')"
    :ui="{ 
      wrapper: 'grid z-[2] ring-4 ring-primary-500 dark:ring-primary-400 grid-rows-1 grid-cols-1 w-[100px] h-[100px] sm:w-[120px] sm:h-[120px] md:w-[160px] md:h-[160px] row-start-1 row-end-2 col-start-1 col-end-2 rounded-full',
      image: { 
        wrapper: 'row-start-1 row-end-2 col-start-1 col-end-2 w-full h-full rounded-full bg-white dark:bg-gray-900', 
        stub: 'rounded-full',
        img: `rounded-full h-full ${hasAvatar ? '' : 'dark:invert'}`,
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
