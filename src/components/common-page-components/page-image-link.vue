<script setup lang="ts">
import type { ControlKey } from './../../helpers/components';

interface IProps {
  ctrlKey: ControlKey,
  imageName: 'flights' | 'stays',
  linkUrl: string,
  btnLabel: string,
  external?: boolean
}
const { ctrlKey, imageName, external = true } = defineProps<IProps>();

</script>

<template>
  <div class="w-full min-w-[300px] sm:min-w-[450px] lg:max-w-[650px] grid grid-rows-1 grid-cols-1">
    <StaticImage
      :ctrl-key="ctrlKey"
      :src="{ filename: `image-link-${imageName}.webp`, width: 590, height: 550 }"
      sizes="xs:40vw sm:40vw md:40vw lg:40vw xl:40vw"
      :ui="{ wrapper: 'col-start-1 col-end-2 row-start-1 row-end-2 min-h-fit rounded-3xl', img: 'aspect-square rounded-3xl brightness-[0.8]', stub: 'rounded-3xl' }"
      stub="default"
    />
    <section class="z-[2] col-start-1 col-end-2 row-start-1 row-end-2 mb-8 self-end justify-self-center flex flex-col flex-nowrap items-center max-w-[80%]">
      <div class="*:!text-white *:text-5xl break-words text-center font-semibold">
        <slot name="title" />
      </div>
      <div class="*:!text-white *:font-semibold text-center mt-2">
        <slot name="sub" />
      </div>
      <UButton
        class="mt-4"
        size="lg"
        :to="linkUrl"
        :aria-label="btnLabel"
        icon="i-ion-paper-plane"
        variant="solid"
        color="primary"
        :external="external"
      >
        {{ btnLabel }}
      </UButton>
    </section>
  </div>
</template>
