<script setup lang="ts">

import range from 'lodash-es/range';
import { PerfectScrollbar } from 'vue3-perfect-scrollbar';
import { type ILocalizableValue, ImageCategory, type IImageEntitySrc } from './../../shared/interfaces';
import { getI18nResName3 } from './../../shared/i18n';

interface IProps {
  ctrlKey: string,
  header?: ILocalizableValue,
  body?: ILocalizableValue,
  userName?: ILocalizableValue,
  imgSrc?: IImageEntitySrc
};
const props = defineProps<IProps>();

const { locale } = useI18n();
const expanded = ref(false);

function toggleReviewText () {
  expanded.value = !expanded.value;
}

</script>

<template>
  <div class="company-review-card mx-xs-3">
    <div class="company-review-card-backface my-xs-3 my-s-4" />
    <div class="company-review-card-frontface py-xs-3 py-s-4">
      <h4 :class="props.header ? 'review-card-header px-xs-3 px-s-4' : 'data-loading-stub text-data-loading mx-xs-3 mx-s-4 mb-xs-1'">
        {{ props.header ? (props.header as any)[locale] : '&nbsp;' }}
      </h4>
      <PerfectScrollbar
        class="review-card-scroll-container"
        :options="{
          suppressScrollY: !expanded,
          suppressScrollX: true,
          wheelPropagation: true
        }"
        :watch-options="true"
        tag="div"
      >
        <div :class="`review-card-content px-xs-3 px-s-4 ${expanded ? 'expanded' : ''}`">
          <p :class="props.body ? 'review-card-body' : 'data-loading-stub text-data-loading mt-xs-3'">
            {{ props.body ? (props.body as any)[locale] : '&nbsp;' }}
          </p>
          <button class="review-expand-btn mt-xs-3 mr-xs-1 brdr-1 no-hidden-parent-tabulation-check" type="button" @click="toggleReviewText">
            {{ $t(getI18nResName3('indexPage', 'companyReviewSection', expanded ? 'collapseBtn' : 'expandBtn')) }}
          </button>
          <div class="review-card-stars mt-xs-3">
            <div v-for="i in range(0, 5)" :key="`${props.ctrlKey}-ReviewStar-${i}`" class="review-card-star" />
          </div>
          <div class="review-card-userinfo mt-xs-2 mt-s-4">
            <div :class="props.userName ? 'review-card-user-name' : 'data-loading-stub text-data-loading'">
              {{ props.userName ? (props.userName as any)[locale] : '&nbsp;' }}
            </div>
            <div class="review-card-user-company mt-xs-1">
              {{ $t(getI18nResName3('indexPage', 'companyReviewSection', 'userCompany')) }}
            </div>
          </div>
          <StaticImage
            :ctrl-key="ctrlKey"
            :entity-src="imgSrc ? { slug: imgSrc.slug, timestamp: imgSrc.timestamp } : undefined"
            :category="ImageCategory.CompanyReview"
            sizes="xs:80vw sm:50vw md:50vw lg:50vw xl:40vw"
            class="review-card-img brdr-3"
            :alt-res-name="getI18nResName3('indexPage', 'companyReviewSection', 'imgAlt')"
            :show-stub="true"
          />
        </div>
      </PerfectScrollbar>
    </div>
  </div>
</template>
