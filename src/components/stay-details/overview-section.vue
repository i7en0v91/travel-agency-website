<script setup lang="ts">
import { getI18nResName3, getI18nResName2, type EntityDataAttrsOnly, type IStayDescription, type Locale, getLocalizeableValue, getScoreClassResName } from '@golobe-demo/shared';
import orderBy from 'lodash-es/orderBy';
import zip from 'lodash-es/zip';
import range from 'lodash-es/range';

const { t, locale } = useI18n();

interface IProps {
  ctrlKey: string,
  description?: EntityDataAttrsOnly<IStayDescription>[],
  numReviews?: number,
  reviewScore?: number
}

const { ctrlKey, description, reviewScore, numReviews } = defineProps<IProps>();

const titleStr = computed(() => description?.find(d => d.paragraphKind === 'Title')?.textStr);
const mainStr = computed(() => description?.find(d => d.paragraphKind === 'Main')?.textStr);
const featureStrs = computed(() => {
  const featureStrs = description?.filter(d => d.paragraphKind === 'FeatureCaption' || d.paragraphKind === 'FeatureText');
  if (!featureStrs) {
    return undefined;
  }
  const ordered = orderBy(featureStrs, ['order'], ['asc']);
  return zip(range(0, Math.floor(ordered.length / 2)).map(idx => ordered![2 * idx]), range(0, Math.floor(ordered.length / 2)).map(idx => ordered![2 * idx + 1])).map((f) => {
    return {
      caption: f[0]!.textStr,
      text: f[1]!.textStr
    };
  });
});

const highlightResNames = ['newPark', 'nightlife', 'theater', 'clean'];
const scoreClassResName = computed(() => reviewScore ? getScoreClassResName(reviewScore) : undefined);
const reviewsCountText = computed(() => numReviews ? `${numReviews} ${t(getI18nResName2('searchOffers', 'reviewsCount'), numReviews)}` : undefined);

</script>

<template>
  <section class="w-fit max-w-[90vw] text-gray-600 dark:text-gray-300">
    <h2 v-if="titleStr" class="text-3xl font-semibold break-words">
      {{ getLocalizeableValue(titleStr, locale as Locale) }}
    </h2>
    <USkeleton v-else class="w-full h-7" />
    <p v-if="mainStr" class="w-full text-sm sm:text-base font-normal break-words mt-4">
      {{ getLocalizeableValue(mainStr, locale as Locale) }}
    </p>
    <ul v-if="featureStrs?.length ?? 0" class="flex flex-col flex-nowrap gap-3 mt-4">
      <li v-for="(feature, idx) in featureStrs" :key="`${ctrlKey}-Feature-${idx}`" class="flex-auto flex flex-row flex-nowrap gap-2">
        <UCheckbox :model-value="true" disabled :ui="{ wrapper: 'flex-initial', base: 'disabled:opacity-100 disabled:cursor-default' }"/>
        <div class="flex-auto block w-fit h-auto whitespace-normal">
          <span class="text-primary-900 dark:text-white font-semibold">
            {{ getLocalizeableValue(feature.caption, locale as Locale) }}:&nbsp;
          </span>
          {{ getLocalizeableValue(feature.text, locale as Locale) }}
        </div>
      </li>
    </ul>
    <div class="block w-full h-min mt-8">
      <div class="w-full overflow-x-auto pr-2 h-auto text-primary-900 dark:text-white">
        <ul class="w-max h-auto flex flex-row flex-nowrap gap-4 py-4">
          <li class="w-full h-auto min-h-max min-w-[166px] aspect-[1_/_1] flex flex-col flex-nowrap items-start justify-between bg-primary-300 dark:bg-primary-600 p-4 rounded-xl">
            <ClientOnly>
              <div v-if="reviewScore" class="block text-3xl font-semibold">
                {{ reviewScore.toFixed(1) }}
              </div>
              <USkeleton v-else class="w-1/3 h-8" />
              <div class="w-full h-auto text-base font-semibold">
                <div v-if="scoreClassResName">
                  {{ $t(scoreClassResName) }}
                </div>
                <USkeleton v-else class="w-1/3 h-4" />
                <div v-if="numReviews !== undefined" class="font-normal mt-1">
                  {{ reviewsCountText }}
                </div>
                <USkeleton v-else class="w-1/2 h-4 mt-1" />
              </div>
              <template #fallback>
                <USkeleton class="w-1/3 h-8" />
                <div class="w-full h-auto">
                  <USkeleton class="w-1/3 h-4" />
                  <USkeleton class="w-1/2 h-4 mt-1" />
                </div>
              </template>
            </ClientOnly>
          </li>
          <li v-for="(resName, idx) in highlightResNames" :key="`${ctrlKey}-Highlight-${idx}`" class="w-full h-auto min-h-max min-w-[166px] bg-transparent ring-primary-300 dark:ring-primary-600 ring-1 aspect-[1_/_1] flex flex-col flex-nowrap items-start justify-between p-4 rounded-xl">
            <UIcon name="i-bi-stars" class="w-8 h-8 block bg-gray-900 dark:bg-white"/>
            <div v-if="reviewScore">
              {{ $t(getI18nResName3('stayDetailsPage', 'overviewHightlights', resName as any)) }}
            </div>
            <USkeleton v-else class="w-1/2 h-3" />
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>
