<script setup lang="ts">

import { ImageCategory, getI18nResName3, getI18nResName2 } from '@golobe-demo/shared';
import type { IBookingTicketGeneralProps } from './../../types';
import { formatImageEntityUrl } from './../../helpers/dom';

const { avatar } = defineProps<IBookingTicketGeneralProps>();

const { t } = useI18n();

const userAvatarUrl = computed(() => {
  return avatar ?   
    formatImageEntityUrl(avatar, ImageCategory.UserAvatar, 1) :
    undefined;
});

</script>

<template>
  <div class="p-6 w-full h-auto grid grid-rows-1 grid-cols-[auto_2fr_3fr] items-center gap-3 bg-primary-300 dark:bg-primary-700 rounded-tl-3xl rounded-tr-3xl sm:rounded-tl-none xl:rounded-tr-none">
    <div class="mt-1">
      <UAvatar 
        v-if="avatar !== null"
        size="lg"
        :src="userAvatarUrl"
        :alt="t(getI18nResName2('ticket', 'avatarImgAlt'))"
        :ui="{ rounded: 'rounded-full' }"
      />
      <Icon v-else name="i-heroicons-user-20-solid" class="w-12 h-12" :alt="t(getI18nResName3('nav', 'userBox', 'navAvatarAlt'))" />
    </div>
    <div class="w-fit h-auto row-start-1 row-end-2 col-start-2 col-end-3 justify-self-start text-primary-900 dark:text-white">
      <h2 v-if="texting?.name" class="text-xl font-bold whitespace-normal break-words">
        {{ texting!.name }}
      </h2>
      <USkeleton v-else class="w-16 h-6 mt-2" />
      <div v-if="texting?.sub" class="text-sm font-normal whitespace-normal break-words mt-2">
        {{ $t(texting.sub) }}
      </div>
      <USkeleton v-else-if="texting?.sub !== null" class="w-2/3 h-4 mt-2" />
    </div>
    <div v-if="classResName" class="ml-8 w-fit h-auto row-start-1 row-end-2 col-start-3 col-end-4 text-sm font-bold text-end justify-self-end">
      {{ $t(classResName) }}
    </div>
    <USkeleton v-else class="w-2/3 h-4 justify-self-end" />
  </div>
</template>
