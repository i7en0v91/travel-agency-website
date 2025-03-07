<script setup lang="ts">
import { toShortForm, type ControlKey } from './../../helpers/components';
import { AppConfig, type I18nResName, type ImageCategory, ImageAuthRequiredCategories, type IImageEntitySrc, type CssPropertyList } from '@golobe-demo/shared';
import type { IStaticImageUiProps } from './../../types';
import { ApiEndpointImageDetails } from './../../server/api-definitions';
import fromPairs from 'lodash-es/fromPairs';
import has from 'lodash-es/has';
import ErrorHelm from '../forms/error-helm.vue';
import { stringifyParsedURL } from 'ufo';
import { usePreviewState } from './../../composables/preview-state';
import { getCommonServices } from '../../helpers/service-accessors';
import { formatImageEntityUrl } from './../../helpers/dom';

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
  ui?: IStaticImageUiProps,
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
  src,
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

const DataKeyImageDetails = (ctrlKey: ControlKey, slug: string) => `ImageDetails-${toShortForm(ctrlKey)}-${slug}`;

function isAssetSrc(src?: IPublicAssetSrc | IImageEntitySrc): src is IPublicAssetSrc {
  return has(src as any, 'filename');
}

const imageUrl = computed(() => {
  if(isAssetSrc(src)) {
    return stringifyParsedURL({
      pathname: `/img/${src.filename}`,
    });
  } else if(src) {
    return formatImageEntityUrl(src, category!, undefined, enabled);
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
  if(!src || isAssetSrc(src)) {
    return;
  }

  return stub === 'custom-if-configured' || requestExtraDisplayOptions;
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
    immediate: false,
    cache: (AppConfig.caching.intervalSeconds && !enabled) ? 'default' : 'no-cache',
    dedupe: 'defer',
    key: DataKeyImageDetails(ctrlKey, (src as IImageEntitySrc)?.slug ?? ''),
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
  return `${loaded.value ? 'invisible' : ''} ${!stub ? 'invisible' : ''}`;
});

const imgElementClasses = computed(() => {
  return `row-start-1 row-end-2 col-start-1 col-end-2 block w-full h-full object-cover text-[0] z-[2] bg-transparent ${ui?.img ?? ''} ${imageDetailsFetch.data?.value?.invertForDarkTheme ? 'dark:invert' : ''}`;
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
      logger.debug('image details fetch refresh triggered', { ctrlKey, url: imageUrl.value, category: category! });
      if(!imageDetailsFetchQuery.value) {
        // updating query ref will trigger refresh
        imageDetailsFetchQuery.value = { 
          slug: (src as IImageEntitySrc).slug!,
          category,
          drafts: enabled
        };
      } else {
        imageDetailsFetch.refresh();
      }
    }
  });
}

onMounted(() => {
  fireIfLoadedImmediately();
});

</script>

<template>
  <div role="img" :class="ui?.wrapper">
    <ErrorHelm v-model:is-error="isError" :ui="{ stub: ui?.errorStub }" appearance="error-stub" :user-notification="false">
      <div class="w-full h-full grid grid-rows-1 grid-cols-1 overflow-hidden">
        <USkeleton v-if="!loaded && stub && !hasCustomCssStyling" :class="`row-start-1 row-end-2 col-start-1 col-end-2 block w-full h-full ${ui?.stub ?? ''}`"/>
        <div v-else :class="`row-start-1 row-end-2 col-start-1 col-end-2 block w-full h-full ${stubClasses} ${ui?.stub ?? ''}`" :style="stubCustomCssStyling"/>
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
        <div v-if="ui?.overlay" :class="`row-start-1 row-end-2 col-start-1 col-end-2 block w-full h-full rounded-none z-[3] ${ui?.overlay ?? ''}`" />
      </div>
    </ErrorHelm>
  </div>
</template>
