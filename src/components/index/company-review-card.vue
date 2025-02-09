<script setup lang="ts">
import { getI18nResName3, type ILocalizableValue, ImageCategory, type IImageEntitySrc } from '@golobe-demo/shared';
import range from 'lodash-es/range';

interface IProps {
  ctrlKey: string,
  header?: ILocalizableValue,
  body?: ILocalizableValue,
  userName?: ILocalizableValue,
  imgSrc?: IImageEntitySrc
};
const { header, body, userName, imgSrc } = defineProps<IProps>();

const { locale } = useI18n();
const expanded = ref(false);
const cardBody = useTemplateRef<HTMLElement>('card-body');

function toggleReviewText () {
  expanded.value = !expanded.value;

  const bodyEl = cardBody.value;
  if(bodyEl) {
    bodyEl.scrollTop = 0;
  }
}

const uiStyling = {
  base: 'col-start-1 col-end-2 row-start-1 row-end-2 z-[2] w-full h-full mr-[16px] sm:mr-[26px]',
  background: 'bg-white dark:bg-gray-900',
  shadow: 'shadow-lg',
  rounded: 'rounded-3xl',
  divide: 'divide-none',
  header: {
    padding: 'pt-6 sm:pt-6'
  },
  body: {
    padding: 'pt-0 sm:pt-0'
  }
};

</script>

<template>
  <div class="pb-[32px] sm:pb-[32px] mr-[40px] grid grid-cols-1 grid-rows-1 rounded-3xl max-w-[500px]">
    <div class="col-start-1 col-end-2 row-start-1 row-end-2 z-[1] w-full h-full rounded-3xl bg-primary-200 dark:bg-primary-800 mt-[16px] ml-[16px] sm:mt-[26px] sm:ml-[26px]" />
    <UCard as="article" :ui="uiStyling">
      <template #header>
        <div class="w-full h-auto overflow-x-hidden">
          <h3 v-if="header" class="h-16 max-h-16 text-2xl font-bold w-fit overflow-hidden line-clamp-2 whitespace-pre-wrap">
            {{ (header as any)[locale] }}
          </h3>
          <USkeleton v-else as="h3" class="w-full h-8 max-h-8"/>
        </div>
      </template>

      <div ref="card-body" :class="`w-full min-h-[calc(306px+4rem)] sm:min-h-[calc(378px+4rem)] flex flex-col flex-nowrap items-stretch ${expanded ? 'overflow-auto max-h-[calc(306px+4rem)] sm:max-h-[calc(378px+4rem)]' : 'overflow-hidden'}`">
        <p v-if="body" :class="`flex-grow flex-shrink-0 basis-auto text-gray-400 dark:text-gray-500 leading-5 font-medium ${expanded ? 'h-auto' : 'h-[60px] overflow-hidden'}`">
          {{ (body as any)[locale] }}
        </p>
        <USkeleton v-else as="p" class="w-full h-[60px] mt-4"/>

        <UButton class="border-none ring-0 w-fit self-end text-black dark:text-white font-semibold" variant="outline" color="gray" @click="toggleReviewText">
          {{ $t(getI18nResName3('indexPage', 'companyReviewSection', expanded ? 'collapseBtn' : 'expandBtn')) }}
        </UButton>

        <div class="flex flex-row flex-wrap gap-[12px] mt-[8px]">
          <UIcon v-for="i in range(0, 5)" :key="`${ctrlKey}-ReviewStar-${i}`" name="i-material-symbols-star" class="w-6 h-6 max-w-[32px] bg-yellow-400" />
        </div>
        <div class="mt-[8px] sm:mt-[20px]">
          <div v-if="userName" class="font-bold text-black dark:text-white">
            {{ (userName as any)[locale] }}
          </div>
          <USkeleton v-else class="w-1/2 h-4"/>
          <div class="text-gray-400 dark:text-gray-500 mt-1">
            {{ $t(getI18nResName3('indexPage', 'companyReviewSection', 'userCompany')) }}
          </div>
        </div>

        <StaticImage
          :ctrl-key="ctrlKey"
          :entity-src="imgSrc ? { slug: imgSrc.slug, timestamp: imgSrc.timestamp } : undefined"
          :category="ImageCategory.CompanyReview"
          sizes="xs:80vw sm:50vw md:50vw lg:50vw xl:40vw"
          :class="expanded ? 'mt-[40px]' : 'mt-2'"
          :ui="{ 
            wrapper: 'rounded-xl w-full h-full justify-self-end',
            stub: 'w-full h-full rounded-xl',
            img: 'rounded-xl',
            errorStub: '!h-[200px]'
          }"
          :alt-res-name="getI18nResName3('indexPage', 'companyReviewSection', 'imgAlt')"
          :show-stub="true"
        />
      </div>
    </UCard>
  </div>
</template>
