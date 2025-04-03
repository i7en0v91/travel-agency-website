<script setup lang="ts">
import type { ControlKey } from './../../helpers/components';
import { AppConfig, PreviewModeParamEnabledValue, QueryPagePreviewModeParam, type I18nResName, type ImageCategory, ImageAuthRequiredCategories, type IImageEntitySrc, type CssPropertyList } from '@golobe-demo/shared';
import { ApiEndpointImageDetails, ApiEndpointImage } from './../../server/api-definitions';
import fromPairs from 'lodash-es/fromPairs';
import ErrorHelm from './../error-helm.vue';
import { stringifyParsedURL, stringifyQuery } from 'ufo';
import set from 'lodash-es/set';
import has from 'lodash-es/has';
import { usePreviewState } from './../../composables/preview-state';
import { getCommonServices } from '../../helpers/service-accessors';

interface IPublicAssetSrc {
  filename: string,
  width: number,
  height: number
}

interface IProps {
  ctrlKey: ControlKey,
  src?: IPublicAssetSrc | IImageEntitySrc,
  category?: ImageCategory,
  /**
   * Approximate portion of viewport width occupied by the image broken down by device sizes,
   * e.g. sm:100vw md:100vw lg:80vw xl:60vw xxl:40vw. Used for html's srcset tag value
   */
  sizes: string,
  /**
   * Loading stub display variant:
   * "default" - show default stub
   * false - don't display, fallback to default browser behavior
   * CssPropertyList object - use explicit css styling
   * "custom-if-configured" - fetch styling from server ({@link ApiEndpointImageDetails}), if empty - fallback to default
   */
  stub?: CssPropertyList | 'default' | 'custom-if-configured' | false,
  /**
   * Inidicates that image may have specific display settings, e.g. inversion filter for dark theme and 
   * additional fetch request ({@link ApiEndpointImageDetails}) is required
   */
  requestExtraDisplayOptions?: boolean,
  /** Render image component only on client, fallback to stub server-side*/
  clientOnly?: boolean,
  /** Affects <img> fetchpriority tag */
  highPriority?: boolean
  ui?: {
    img?: string,
    overlay?: string
  },
  alt?: {
    resName: I18nResName,
    resParams?: any
  }
}

declare interface IFetchedImageDetails {
  stubCssStyle: CssPropertyList | undefined,
  invertForDarkTheme: boolean
};

const { 
  ctrlKey,
  src = undefined,
  category,
  ui,
  highPriority = false, 
  clientOnly = false,
  stub = 'default', 
  requestExtraDisplayOptions = false 
} = defineProps<IProps>();

const logger = getCommonServices().getLogger().addContextProps({ component: 'StaticImage' });
const systemConfigurationStore = useSystemConfigurationStore();

const nuxtApp = useNuxtApp();
const { status, signIn, getSession } = useAuth();
const { enabled } = usePreviewState();

const isError = ref(false);
const loaded = ref(false);
const nuxtImageComponent = useTemplateRef('image-component');

function isAssetSrc(src?: IPublicAssetSrc | IImageEntitySrc): src is IPublicAssetSrc {
  return has(src as any, 'filename');
}

const imageUrl = computed(() => {
  if(isAssetSrc(src)) {
    return stringifyParsedURL({
      pathname: `/img/${src.filename}`,
    });
  } else if(src) {
    return stringifyParsedURL({
      pathname: `/${ApiEndpointImage}`,
      search: stringifyQuery({
        ...(src.timestamp ? { t: src.timestamp } : {}),
        ...(enabled ? set({}, QueryPagePreviewModeParam, PreviewModeParamEnabledValue) : {}),
        slug: src.slug,
        category: category!.valueOf()
      })
    });
  }
  return undefined;
});

const imageMediaSize = computed(() => {
  return isAssetSrc(src) ? { 
      width: src.width, 
      height: src.height 
  } : systemConfigurationStore.imageCategories.find(x => x.kind === category!)!;
});

const imageDetailsFetchRequired = computed(() => {
  return (stub === 'custom-if-configured' || requestExtraDisplayOptions) && 
    ( src && !isAssetSrc(src) && !!src.slug );
});

const imageDetailsFetchQuery = ref(
  (src as IImageEntitySrc)?.slug ? { 
    slug: (src as IImageEntitySrc).slug!,
    category,
    drafts: enabled
  } : undefined);
const imageDetailsFetch = useFetch(`/${ApiEndpointImageDetails}`, {
    server: true,
    lazy: true,
    query: imageDetailsFetchQuery,
    immediate: !!imageDetailsFetchQuery.value?.slug && imageDetailsFetchRequired.value,
    watch: false,
    cache: (AppConfig.caching.intervalSeconds && !enabled) ? 'default' : 'no-cache',
    dedupe: 'defer',
    default: () => null,
    transform: (dto: IFetchedImageDetails) => {
      const slug = (src as IImageEntitySrc).slug;
      logger.verbose('image details fetched, transforming', { details: dto, ctrlKey, slug });
      if (dto) {
        let resultCssStyle: CssPropertyList | undefined;
        if (dto.stubCssStyle) {
          resultCssStyle = fromPairs(dto.stubCssStyle as any) as CssPropertyList;
          logger.verbose('image details transformed', { style: resultCssStyle, ctrlKey, slug });
        }
        return { stubCssStyle: resultCssStyle, invertForDarkTheme: dto.invertForDarkTheme } as IFetchedImageDetails;
      } else {
        logger.warn('fetch request for image details returned empty data', undefined, { ctrlKey, slug });
        return { stubCssStyle: undefined, invertForDarkTheme: false };
      }
    },
    $fetch: nuxtApp.$fetchEx({ defautAppExceptionAppearance: 'error-stub' })
  });

const stubCustomCssStyling = computed(() => {
  if(!stub) {
    return null;
  }

  if(typeof stub === 'object') {
    return stub as CssPropertyList;
  } else if(stub === 'custom-if-configured') {
    return imageDetailsFetch.data?.value?.stubCssStyle ?? null;
  }

  return null;
});

const hasCustomCssStyling = computed(() => {
  return stubCustomCssStyling.value && JSON.stringify(stubCustomCssStyling.value).length > 3;
});

const stubClasses = computed(() => {
  return `${loaded.value ? 'img-loaded' : ''} ${!hasCustomCssStyling.value ? 'static-image-stub-animated' : ''} ${!stub ? 'static-image-stub-hidden' : ''}`;
});

const imgElementClasses = computed(() => {
  return `static-image-img ${ui?.img ?? ''} ${(loaded.value && (!requestExtraDisplayOptions || hasCustomCssStyling.value)) ? 'img-loaded' : ''} ${imageDetailsFetch.data?.value?.invertForDarkTheme ? 'dark-theme-invert' : ''}`;
});

function onLoad () {
  logger.verbose('image loaded, current', { url: imageUrl.value });
  isError.value = false;
  loaded.value = true;
  $emit('imageReady');
}

async function onError (err: any) {
  logger.warn('image load failed, current', err, { url: imageUrl.value });

  // check if this is auth issue
  if (category && ImageAuthRequiredCategories.includes(category!)) {
    if (status.value !== 'authenticated' || !(await getSession({ required: true }))) {
      logger.info('image category requires authenticated access', { url: imageUrl.value, category: category! });
      signIn('credentials');
      return;
    }
  }

  isError.value = true; // show error stub
  $emit('imageFailed');
}

const $emit = defineEmits(['imageReady', 'imageFailed']);

function fireIfLoadedImmediately () {
  const elImg = nuxtImageComponent.value?.$el as HTMLImageElement;
  if(elImg?.dataset['error'] === '1') {
    logger.warn('detected image load failed', undefined, { ctrlKey, url: imageUrl.value, category: category! });
    onError(undefined);
  } else if (elImg?.complete) {
    logger.debug('detected immediate image load', { ctrlKey, url: imageUrl.value, category: category! });
    onLoad();
  }
}

if(import.meta.server && imageDetailsFetchRequired.value) {
  await imageDetailsFetch.refresh();
} else if(import.meta.client) {
  watchEffect(() => {
    if(imageDetailsFetchRequired.value === true) {
      if(!imageDetailsFetchQuery.value) {
        imageDetailsFetchQuery.value = { 
          slug: (src as IImageEntitySrc).slug!,
          category,
          drafts: enabled
        };
      }
      imageDetailsFetch.refresh();
    }
  });
}

onMounted(() => {
  fireIfLoadedImmediately();
});

</script>

<template>
  <div class="static-image" role="img">
    <ErrorHelm v-model:is-error="isError" :appearance="'error-stub'" :user-notification="false">
      <div class="static-image-div">
        <div :class="`static-image-stub ${stubClasses}`" :style="stubCustomCssStyling" />
        <ClientOnly v-if="clientOnly">
          <nuxt-img
            v-if="imageUrl"
            ref="image-component"
            :src="imageUrl"
            fit="cover"
            :width="imageMediaSize.width"
            :height="imageMediaSize.height"
            :sizes="sizes"
            :provider="!isAssetSrc(src) ? 'entity' : undefined"
            :modifiers="!isAssetSrc(src) ? { imgSrcSize: imageMediaSize } : {}"
            :alt="!!alt ? $t(alt.resName, alt.resParams) : ''"
            :class="imgElementClasses"
            :fetchpriority="highPriority ? 'high' : 'auto'"
            @load="onLoad"
            @error="onError"
          />
        </ClientOnly>
        <nuxt-img
          v-else-if="imageUrl"
          ref="image-component"
          :src="imageUrl"
          fit="cover"
          :width="imageMediaSize.width"
          :height="imageMediaSize.height"
          :sizes="sizes"
          :provider="!isAssetSrc(src) ? 'entity' : undefined"
            :modifiers="!isAssetSrc(src) ? { imgSrcSize: imageMediaSize } : {}"
            :alt="!!alt ? $t(alt.resName, alt.resParams) : ''"
          :class="imgElementClasses"
          :fetchpriority="highPriority ? 'high' : 'auto'"
          @load="onLoad"
          @error="onError"
        />
        <div v-if="ui?.overlay" :class="`static-image-overlay ${ui.overlay!}`" />
      </div>
    </ErrorHelm>
  </div>
</template>
