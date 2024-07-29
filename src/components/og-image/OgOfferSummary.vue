<script setup lang="ts">

import { withQuery, joinURL } from 'ufo';
import type { ImageCategory, ILocalizableValue, ICity, EntityDataAttrsOnly, IImageEntitySrc, IImageCategoryInfo, OfferKind } from './../../shared/interfaces';
import { getLocalizeableValue, getOgImageFileName, getValueForFlightDayFormatting } from './../../shared/common';
import { QueryPagePreviewModeParam, PreviewModeParamEnabledValue, ApiEndpointImage, type Locale, DefaultLocale } from './../../shared/constants';
import { AppPage } from './../../shared/page-query-params';
import { getI18nResName2 } from './../../shared/i18n';
import AppConfig from './../../appconfig';
import { usePreviewState } from './../../composables/preview-state';
import set from 'lodash-es/set';

interface IProps {
  kind: OfferKind,
  title: ILocalizableValue,
  city: EntityDataAttrsOnly<ICity>,
  price: number,
  dateUnixUtc: number,
  utcOffsetMin?: number | undefined,
  image: IImageEntitySrc & { category: ImageCategory }
}

const isError = ref(false);
const props = defineProps<IProps>();

const { d, locale } = useI18n();
const requestLocale = useRequestEvent()?.context.ogImageContext?.locale ?? DefaultLocale;
locale.value = requestLocale;

const logger = CommonServicesLocator.getLogger();
logger.verbose('(OgOfferSummary) component setup', props.image);

const dateStr = props.kind === 'flights' ? d(getValueForFlightDayFormatting(new Date(props.dateUnixUtc), props.utcOffsetMin!), 'day') : d(new Date(props.dateUnixUtc), 'day');

const defaultImgUrl = joinURL('/img', 'og', getOgImageFileName(AppPage.Index, locale.value as Locale));

let imageSize: IImageCategoryInfo;
try {
  const systemConfigurationStore = useSystemConfigurationStore();
  imageSize = await systemConfigurationStore.getImageSrcSize(props.image.category);
} catch (err: any) {
  logger.warn('(OgOfferSummary) failed to detect image category size', err, props.image);
  isError.value = true;
}

const { enabled } = usePreviewState();
const imgUrl = withQuery(`/${ApiEndpointImage}`, { 
  slug: props.image.slug, 
  category: props.image.category ,
  ...(enabled ? set({}, QueryPagePreviewModeParam, PreviewModeParamEnabledValue) : {})
});

function onError (err: any) {
  logger.warn('(OgOfferSummary) render exception', err);
  isError.value = true;
}

</script>

<template>
  <div class="error-helm">
    <NuxtErrorBoundary v-if="!isError" @error="onError">
      <div class="og-app-page">
        <svg
          class="og-golobe-logo"
          width="111"
          height="36"
          viewBox="0 0 111 36"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        ><g clip-path="url(#clip0_603_3680)"><path d="M14.7282 5.57669L17.9466 8.00813L15.9805 10.5097C17.3379 12.0457 17.8382 13.7983 17.8382 15.7295C17.8382 17.9092 17.0161 20.9843 14.1195 22.3068C17.0512 23.7727 17.7649 25.8823 17.7649 28.1352C17.7649 32.9981 14.0463 36 8.93505 36C3.82384 36 0 32.8898 0 28.1352H4.32413C4.32413 30.4233 6.43362 31.9242 8.93505 31.9242C11.4365 31.9242 13.4026 30.5667 13.4026 28.1352C13.4026 25.7038 11.1146 24.5948 8.93505 24.5948C3.4319 24.5948 0 21.2361 0 15.7295C0 10.2229 4.00229 6.79082 8.93823 6.79082C10.3339 6.79082 11.7615 6.96927 12.9788 7.79144L14.7282 5.57669ZM4.32413 15.7295C4.32413 18.8046 6.39857 20.6274 8.93505 20.6274C11.4365 20.6274 13.5109 18.7696 13.5109 15.7295C13.5109 12.6894 11.4397 10.7614 8.93823 10.7614C6.39856 10.7614 4.32413 12.6543 4.32413 15.7295Z" fill="#112211" /><path d="M50.5673 0V24.99H46.2432V0H50.5673Z" fill="#112211" /><path d="M69.9987 16.1948C69.9987 21.2711 66.5317 25.382 60.8119 25.382C55.0921 25.382 51.6602 21.2711 51.6602 16.1948C51.6602 11.1534 55.1622 7.00754 60.7768 7.00754C66.3915 7.00754 69.9987 11.1534 69.9987 16.1948ZM56.0193 16.1948C56.0193 18.8748 57.6285 21.3795 60.8087 21.3795C63.9889 21.3795 65.5981 18.8779 65.5981 16.1948C65.5981 13.5498 63.7403 10.975 60.8087 10.975C57.6636 10.975 56.0193 13.5498 56.0193 16.1948Z" fill="#112211" /><path d="M75.4507 0V9.76082C76.4864 7.93804 79.3829 6.93742 81.2407 6.93742C86.3869 6.93742 90.214 10.0827 90.214 16.1597C90.214 21.9499 86.3168 25.382 81.1355 25.382C78.991 25.382 76.8114 24.6681 75.4507 22.5586L75.164 24.99H71.0884V0H75.4507ZM75.7343 16.1597C75.7343 19.34 78.0924 21.3444 80.8456 21.3444C83.6338 21.3444 85.8516 19.2348 85.8516 16.1597C85.8516 12.9794 83.6338 11.0132 80.8456 11.0132C78.0956 11.01 75.7343 13.0845 75.7343 16.1597Z" fill="#112211" /><path d="M96.6987 19.2317C97.712 21.1819 100.032 22.0136 102.922 20.962C104.432 20.4107 106.207 19.1201 106.794 17.804L110.356 19.4356C109.27 21.8862 106.733 23.7982 104.213 24.7159C98.5023 26.7937 93.8244 24.5024 91.8934 19.1934C90.058 14.1553 92.1643 9.27963 97.5399 7.32301C103.081 5.30584 107.791 7.47278 109.633 14.5249L96.6987 19.2317ZM104.467 12.5619C103.416 10.5097 101.345 10.0476 98.993 10.9017C96.7752 11.7079 95.354 13.4446 95.5324 15.8123L104.467 12.5619Z" fill="#112211" /><path fill-rule="evenodd" clip-rule="evenodd" d="M39.7626 11.9898C38.3489 9.04026 35.4017 7.00754 31.4702 7.00754C25.8555 7.00754 22.3535 11.1534 22.3535 16.1948C22.3535 19.4132 23.733 22.2436 26.2006 23.8843C26.3412 23.7791 26.4258 23.7108 26.4258 23.7108C27.6566 22.9077 28.8573 22.0624 30.0258 21.1765C27.8244 20.5287 26.7127 18.4223 26.7127 16.1948C26.7127 13.5498 28.3601 10.975 31.5021 10.975C34.269 10.975 36.0793 13.2686 36.274 15.7501C37.4868 14.5464 38.6507 13.292 39.7626 11.9898ZM31.0601 25.3736C34.5418 22.9057 37.7611 20.0866 40.6652 16.963C40.3328 21.6795 36.9335 25.382 31.5052 25.382C31.3553 25.382 31.2069 25.3791 31.0601 25.3736Z" fill="#8DD3BB" /><path d="M43.3179 4.53785C38.8631 2.89989 35.6607 6.42437 35.6607 6.42437L38.6974 8.18979C39.835 7.53652 40.3417 8.17067 40.4723 8.51802C40.5648 8.76339 40.4405 9.03108 40.3417 9.17766L39.6024 10.1114C35.6129 14.9233 30.9223 19.1042 25.6868 22.5203C25.6868 22.5203 24.1063 23.795 23.265 23.8141C22.5576 23.8301 22.2422 23.2341 22.838 22.3801L21.3722 19.0723C21.3722 19.0723 17.558 21.5707 18.2972 25.9619C18.6095 27.8166 20.3525 29.1359 22.2039 28.8013C23.1503 28.6324 24.3198 28.1703 25.7505 27.2239L28.3826 25.5031C33.6181 22.0806 38.3119 17.8869 42.2982 13.0686L43.2032 11.9756C44.567 10.4237 45.1789 9.1458 45.386 8.13562C45.7046 6.59007 44.7901 5.07959 43.3179 4.53785Z" fill="#8DD3BB" /></g><defs><clipPath id="clip0_603_3680"><rect width="110.353" height="36" fill="white" /></clipPath></defs>
        </svg>
        <div class="og-offer-summary">
          <h4 class="offer-title font-header color-primary">
            {{ getLocalizeableValue(title, locale as Locale) }}
          </h4>
          <div class="offer-location font-body color-secondary">
            <svg
              class="location-icon"
              width="10"
              height="14"
              viewBox="0 0 10 14"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M5 0C2.24312 0 0 2.14531 0 4.78125C0 6.03656 0.572187 7.70594 1.70062 9.74312C2.60687 11.3787 3.65531 12.8578 4.20062 13.5938C4.29277 13.7195 4.41325 13.8218 4.5523 13.8923C4.69134 13.9627 4.84504 13.9995 5.00094 13.9995C5.15683 13.9995 5.31053 13.9627 5.44958 13.8923C5.58862 13.8218 5.7091 13.7195 5.80125 13.5938C6.34563 12.8578 7.395 11.3787 8.30125 9.74312C9.42781 7.70656 10 6.03719 10 4.78125C10 2.14531 7.75688 0 5 0ZM5 7C4.60444 7 4.21776 6.8827 3.88886 6.66294C3.55996 6.44318 3.30362 6.13082 3.15224 5.76537C3.00087 5.39991 2.96126 4.99778 3.03843 4.60982C3.1156 4.22186 3.30608 3.86549 3.58579 3.58579C3.86549 3.30608 4.22186 3.1156 4.60982 3.03843C4.99778 2.96126 5.39991 3.00087 5.76537 3.15224C6.13082 3.30362 6.44318 3.55996 6.66294 3.88886C6.8827 4.21776 7 4.60444 7 5C6.99942 5.53026 6.78852 6.03863 6.41357 6.41357C6.03863 6.78852 5.53026 6.99942 5 7Z" fill="#112211" />
            </svg>
            <div class="offer-location-text">
              {{ getLocalizeableValue(city.country.name, locale as Locale) }}, {{ getLocalizeableValue(city.name, locale as Locale) }}
            </div>
          </div>
        </div>
        <div v-if="kind === 'flights'" class="offer-price font-body font-bold color-highlight">
          {{ Math.floor(price) }}$
        </div>
        <div v-else class="offer-price font-body font-bold color-highlight">
          {{ Math.floor(price) }}$&#47;{{ $t(getI18nResName2('searchStays', 'night')) }}
        </div>
        <div class="offer-date font-body font-bold">
          {{ dateStr }}
        </div>
        <nuxt-img
          :src="imgUrl"
          fit="cover"
          :width="imageSize.width"
          :height="imageSize.height"
          sizes="xs:100vw sm:100vw md:100vw lg:100vw xl:100vw"
          provider="entity"
          class="offer-image"
          :modifiers="{ imgSrcSize: imageSize, satori: true }"
        />
      </div>
    </NuxtErrorBoundary>
    <div v-else class="og-app-page-error-stub">
      <img
        :src="`${defaultImgUrl}&satori=1`"
        fit="cover"
        :width="AppConfig.ogImage.screenSize.width"
        :height="AppConfig.ogImage.screenSize.height"
        class="og-app-page-default-image"
      >
    </div>
  </div>
</template>

<style scoped>
  .error-helm {
    width: 100%;
  }

  .og-app-page {
    display: flex;
    flex-direction: column;
    flex-wrap: nowrap;

    background-color: white;

    padding: 16px 30px 16px 30px;
    width: 100%;
    height: 100%;
  }

  .og-app-page-default-image {
    width: 100%;
    height: 100%;

    object-fit: cover;
  }

  .og-golobe-logo {
    flex: 0 0 auto;

    width: 165px;
    height: 54px;

    align-self: center;
  }

  .og-offer-summary {
    flex: 0 0 auto;

    display: flex;
    flex-direction: column;
    flex-wrap: nowrap;

    font-size: 24px;
    width: 100%;
    height: auto;
  }

  .offer-title {
    flex: 0 0 auto;

    font-size: 36px;
    white-space: normal;
  }

  .offer-location {
    flex: 0 0 auto;

    display: flex;
    flex-direction: row;
    align-items: center;

    font-size: 24px;
    white-space: normal;
    transform: translateY(-8px);
  }

  .location-icon {
    flex: 0 0 auto;

    width: 15px;
    height: 21px;

    float: left;
    display: inline;
    margin-right: 8px;
  }

  .offer-location-text {
    flex: 1 1 auto;

    font-size: 24px;
    white-space: normal;
  }

  .offer-review-summary {
    flex: 0 0 auto;
    margin-top: 16px;

    display: flex;
    flex-direction: row;
    gap: 8px;
    align-items: center;

    width: auto;
  }

  .offer-score {
    flex: 0 0 auto;

    border-radius: 4px;
    border: 1px solid #8DD3BB;
    padding: 8px;
  }

  .offer-price, .offer-date {
    flex: 0 0 auto;
    white-space: nowrap;
    text-align: right;

    font-size: 48px;

    position: absolute;
    right: 30px;
  }

  .offer-price {
    top: 100px;
  }
  .offer-date {
    top: 160px;
  }

  .offer-image {
    flex: 1 1 auto;

    border-radius: 12px;
    width: 100%;

    margin-top: 24px;
    margin-bottom: 12px;

    object-fit: cover;
  }

  .color-primary {
    color: #112211;
  }

  .color-secondary {
    color: #112211BB;
  }

  .color-highlight {
    color: #FF8682;
  }

  .font-header {
    font-family: 'Montserrat';
  }

  .font-body {
    font-family: 'Montserrat';
  }

  .font-bold {
    font-weight: 700;
  }
</style>
