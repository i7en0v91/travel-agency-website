<script setup lang="ts">
/**
 * Div-only analog to
 *  
 * <UFormGroup 
    :label="textResName ? t(textResName) : ''" 
    :ui="{
      label: {
        wrapper: `relative z-[2] pointer-events-none translate-x-[16px] -translate-y-5 ${props.textResName?.length ? '' : 'hidden'}`,
        base: `${props.groupSpacing} h-4 max-h-4 leading-none px-[4px] bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 whitespace-nowrap w-min`
      }
    }" 
    class="*:h-0 overflow-visible *:mt-0"
  >
    <slot />
  </UFormGroup> 
 * 
 */
import { type I18nResName } from '@golobe-demo/shared';

const { t } = useI18n();

interface IProps {
  textResName?: I18nResName
}

withDefaults(defineProps<IProps>(), {
  textResName: undefined
});

</script>

<template>
  <div class="*:h-0 overflow-visible *:mt-0 w-full">
    <div>
      <div class="flex content-center items-center justify-between relative z-[2] pointer-events-none translate-x-[16px] -translate-y-5 text-sm sm:text-base">
        <div class="block font-normal mt-3.5 h-4 max-h-4 leading-none px-[4px] bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 whitespace-nowrap w-min">
          {{ textResName ? t(textResName) : '' }}
        </div>
      </div>
    </div>
    <slot />
  </div> 
</template>
