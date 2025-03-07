<script setup lang="ts">
import { toShortForm, type ControlKey } from './../../helpers/components';
import { getI18nResName3, type ILocalizableValue, ImageCategory, type IImageEntitySrc } from '@golobe-demo/shared';
import range from 'lodash-es/range';
import { PerfectScrollbar } from 'vue3-perfect-scrollbar';

interface IProps {
  ctrlKey: ControlKey,
  header?: ILocalizableValue,
  body?: ILocalizableValue,
  userName?: ILocalizableValue,
  imgSrc?: IImageEntitySrc
};
const { header, body, userName, imgSrc } = defineProps<IProps>();

const { locale } = useI18n();
const expanded = ref(false);

function toggleReviewText () {
  expanded.value = !expanded.value;
}

</script>

<template>
  <article class="company-review-card mx-xs-3">
    <div class="company-review-card-backface my-xs-3 my-s-4" />
    <div class="company-review-card-frontface py-xs-3 py-s-4">
      <h3 :class="`${header ? 'review-card-header px-xs-3 px-s-4' : 'data-loading-stub text-data-loading mx-xs-3 mx-s-4 mb-xs-1'} font-h4`">
        {{ header ? (header as any)[locale] : '&nbsp;' }}
      </h3>
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
          <p :class="body ? 'review-card-body' : 'data-loading-stub text-data-loading mt-xs-3'">
            {{ body ? (body as any)[locale] : '&nbsp;' }}
          </p>
          <button class="review-expand-btn mt-xs-3 mr-xs-1 brdr-1 no-hidden-parent-tabulation-check" type="button" @click="toggleReviewText">
            {{ $t(getI18nResName3('indexPage', 'companyReviewSection', expanded ? 'collapseBtn' : 'expandBtn')) }}
          </button>
          <div class="review-card-stars mt-xs-3">
            <div v-for="i in range(0, 5)" :key="`${toShortForm(ctrlKey)}-ReviewStar-${i}`" class="review-card-star" />
          </div>
          <div class="review-card-userinfo mt-xs-2 mt-s-4">
            <div :class="userName ? 'review-card-user-name' : 'data-loading-stub text-data-loading'">
              {{ userName ? (userName as any)[locale] : '&nbsp;' }}
            </div>
            <div class="review-card-user-company mt-xs-1">
              {{ $t(getI18nResName3('indexPage', 'companyReviewSection', 'userCompany')) }}
            </div>
          </div>
          <StaticImage
            :ctrl-key="ctrlKey"
            :src="imgSrc ? { slug: imgSrc.slug, timestamp: imgSrc.timestamp } : undefined"
            :category="ImageCategory.CompanyReview"
            sizes="xs:80vw sm:50vw md:50vw lg:50vw xl:40vw"
            class="review-card-img brdr-3"
            :alt="{ resName: getI18nResName3('indexPage', 'companyReviewSection', 'imgAlt') }"
            stub="default"
          />
        </div>
      </PerfectScrollbar>
    </div>
  </article>
</template>
