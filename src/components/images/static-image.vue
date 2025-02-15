<script setup lang="ts">
import { DataKeyImageDetails, type IAppLogger, type I18nResName, type ImageCategory, ImageAuthRequiredCategories, type IImageEntitySrc, type CssPropertyList } from '@golobe-demo/shared';
import { getObject } from './../../helpers/rest-utils';
import type { IStaticImageUiProps } from './../../types';
import { addPayload, getPayload } from './../../helpers/payload';
import { ApiEndpointImageDetails } from './../../server/api-definitions';
import fromPairs from 'lodash-es/fromPairs';
import isString from 'lodash-es/isString';
import ErrorHelm from '../forms/error-helm.vue';
import { stringifyParsedURL } from 'ufo';
import { usePreviewState } from './../../composables/preview-state';
import { getCommonServices } from '../../helpers/service-accessors';
import { formatImageEntityUrl } from '../../helpers/dom';

interface IPublicAssetSrc {
  filename: string,
  width: number,
  height: number
}

interface IProps {
  ctrlKey: string,
  assetSrc?: IPublicAssetSrc,
  category?: ImageCategory,
  entitySrc?: IImageEntitySrc,
  sizes: string, // e.g. sm:100vw md:100vw lg:80vw xl:60vw 2xl:40vw
  stubStyle?: CssPropertyList | 'default' | 'custom-if-configured', // false - do not show custom stub (use default)
  requestExtraDisplayOptions?: boolean,
  altResName?: I18nResName,
  altResParams?: any,
  showStub?: boolean,
  imgIsClientOnly?: boolean,
  isHighPriority?: boolean,
  ui?: IStaticImageUiProps
}

declare interface IFetchedImageDetails {
  stubCssStyle: CssPropertyList | undefined,
  invertForDarkTheme: boolean
};

const { 
  ctrlKey,
  assetSrc,
  entitySrc,
  category,
  ui,
  isHighPriority = false, 
  imgIsClientOnly = false,
  showStub = true, 
  stubStyle = 'default', 
  requestExtraDisplayOptions = false 
} = defineProps<IProps>();

const { status, signIn, getSession } = useAuth();
const { enabled } = usePreviewState();
const nuxtApp = useNuxtApp();
const systemConfigurationStore = useSystemConfigurationStore();

const isError = ref(false);
const loaded = ref(false);

// making it non-reactive assuming source image sizes won't change during properties update
const imageSize = assetSrc ? { width: assetSrc.width, height: assetSrc.height } : (await systemConfigurationStore.getImageSrcSize(category!));
const imgUrl = computed(() => {
  if(assetSrc) {
    return stringifyParsedURL({
      pathname: `/img/${assetSrc.filename}`,
    });
  }
  if(entitySrc) {
    if (!requestExtraDisplayOptions || imageDetails.value) {
     return formatImageEntityUrl(entitySrc, category!, undefined, enabled);
    }
  }
  return undefined;
});

const logger = getCommonServices().getLogger();

const imgComponent = useTemplateRef('image-component');

const invertForDarkTheme = ref<boolean>(false);
const finalStubStyle = shallowRef<CssPropertyList | undefined>(!isString(stubStyle) ? (stubStyle as CssPropertyList) : undefined);

const imageDetails = ref<IFetchedImageDetails | undefined>();
function updateImageStylingDetails () {
  let style = (!isString(stubStyle) ? (stubStyle as CssPropertyList) : undefined) ?? imageDetails.value?.stubCssStyle ?? undefined;
  if(!!style && JSON.stringify(style).length <= 3) {
    style = undefined;
  }
  finalStubStyle.value = style;
  invertForDarkTheme.value = (requestExtraDisplayOptions ? (imageDetails.value?.invertForDarkTheme) : undefined) ?? false;
  logger.verbose(`(StaticImage) applying stub custom css style, ctrlKey=${ctrlKey}, style=[${finalStubStyle.value ? JSON.stringify(finalStubStyle.value) : 'empty'}], invertForDarkTheme=${invertForDarkTheme.value}`);
}
watch(imageDetails, updateImageStylingDetails);
if (imageDetails.value) {
  updateImageStylingDetails();
}
if(entitySrc) {
  if(import.meta.server) {
    await fetchDisplayDetailsIfNeeded();
  } else {
    fetchDisplayDetailsIfNeeded();
  }
} else {
  watch(() => entitySrc, fetchDisplayDetailsIfNeeded);
}

// no need to make it computed at the moment
const stubStyleClass = computed(() => {
  return `${loaded.value ? 'invisible' : ''} ${!showStub ? 'invisible' : ''}`;
  
});

const imgStyleClass = computed(() => {
  return `row-start-1 row-end-2 col-start-1 col-end-2 block w-full h-full object-cover text-[0] z-[2] bg-transparent ${ui?.img ?? ''} ${invertForDarkTheme.value ? 'dark:invert' : ''}`;
});

async function fetchDisplayDetailsIfNeeded (): Promise<void> {
  if (!!entitySrc && (stubStyle === 'custom-if-configured' || requestExtraDisplayOptions)) {
    const payloadKey = DataKeyImageDetails(ctrlKey, entitySrc.slug);
    let dto = (import.meta.client && nuxtApp.isHydrating) ? getPayload<IFetchedImageDetails>(nuxtApp, payloadKey) : undefined;
    if(!dto) {
      const query = { 
        slug: entitySrc?.slug,
        category,
        drafts: enabled 
      };
      const cache = enabled ? 'no-cache' : 'default';
      const reqEvent = import.meta.server ? nuxtApp.ssrContext?.event : undefined;
      dto = await getObject<IFetchedImageDetails>(`/${ApiEndpointImageDetails}`, query, cache, true, reqEvent, 'default');
      if(!!dto && !!nuxtApp.ssrContext) {
        logger.debug(`(StaticImage) adding image details to payload, ctrlKey=${ctrlKey}, slug=${entitySrc.slug}`);
        addPayload(nuxtApp, payloadKey, dto);
      }
    } else {
      logger.debug(`(StaticImage) adding image details to payload, ctrlKey=${ctrlKey}, slug=${entitySrc.slug}`);
    }
    
    logger.verbose(`(StaticImage) image details obtained, ctrlKey=${ctrlKey}, slug=${entitySrc.slug}`);
    if (dto) {
      let resultCssStyle: CssPropertyList | undefined;
      if (dto.stubCssStyle) {
        resultCssStyle = fromPairs(dto.stubCssStyle as any) as CssPropertyList;
        logger.verbose(`(StaticImage) stub custom css style fetched, style=[${JSON.stringify(resultCssStyle)}], ctrlKey=${ctrlKey}, slug=${entitySrc.slug}`);
      }
      imageDetails.value = { stubCssStyle: resultCssStyle, invertForDarkTheme: dto.invertForDarkTheme } as IFetchedImageDetails;
    } else {
      logger.warn(`(StaticImage) fetch request for image details returned empty data, ctrlKey=${ctrlKey}, slug=${entitySrc.slug}`);
      imageDetails.value = { stubCssStyle: undefined, invertForDarkTheme: false };
    }
  }
}

function onLoad () {
  getLogger().verbose(`(StaticImage) image loaded, current url=${imgUrl.value}`);
  isError.value = false;
  loaded.value = true;
  $emit('imageReady');
}

async function onError (err: any) {
  getLogger().warn(`(StaticImage) image load failed, current url=${imgUrl.value}`, err);

  // check if this is auth issue
  if (category && ImageAuthRequiredCategories.includes(category!)) {
    if (status.value !== 'authenticated' || !(await getSession({ required: true }))) {
      getLogger().info(`(StaticImage) image category requires authenticated access: url=${imgUrl.value}, category=${category!}`);
      signIn('credentials');
      return;
    }
  }

  isError.value = true; // show error stub
  $emit('imageFailed');
}

const $emit = defineEmits(['imageReady', 'imageFailed']);

function getLogger () : IAppLogger {
  return getCommonServices().getLogger();
}

function fireIfLoadedImmediately () {
  const elImg = imgComponent.value?.$el as HTMLImageElement;
  if(elImg?.dataset['error'] === '1') {
    getLogger().warn(`(StaticImage) detected image load failed, ctrlKey=${ctrlKey}, url=${imgUrl.value}, category=${category!}`);
    onError(undefined);
  } else if (elImg?.complete) {
    getLogger().debug(`(StaticImage) detected immediate image load, ctrlKey=${ctrlKey}, url=${imgUrl.value}, category=${category!}`);
    onLoad();
  }
}

onMounted(() => {
  fireIfLoadedImmediately();
});

</script>

<template>
  <div role="img" :class="ui?.wrapper">
    <ErrorHelm v-model:is-error="isError" :ui="{ stub: ui?.errorStub }" appearance="error-stub" :user-notification="false">
      <div class="w-full h-full grid grid-rows-1 grid-cols-1 overflow-hidden">
        <USkeleton v-if="!loaded && showStub && !finalStubStyle" :class="`row-start-1 row-end-2 col-start-1 col-end-2 block w-full h-full ${ui?.stub ?? ''}`"/>
        <div v-else :class="`row-start-1 row-end-2 col-start-1 col-end-2 block w-full h-full ${stubStyleClass} ${ui?.stub ?? ''}`" :style="finalStubStyle"/>
        <ClientOnly v-if="imgIsClientOnly">
          <nuxt-img
            v-if="imgUrl"
            ref="image-component"
            :src="imgUrl"
            fit="cover"
            :width="imageSize.width"
            :height="imageSize.height"
            :sizes="sizes"
            :provider="entitySrc ? 'entity' : undefined"
            :modifiers="entitySrc ? { imgSrcSize: imageSize } : {}"
            :alt="altResName ? $t(altResName!, altResParams) : ''"
            :class="imgStyleClass"
            :fetchpriority="isHighPriority ? 'high' : 'auto'"
            @load="onLoad"
            @error="onError"
          />
        </ClientOnly>
        <nuxt-img
          v-else-if="imgUrl"
          ref="image-component"
          :src="imgUrl"
          fit="cover"
          :width="imageSize.width"
          :height="imageSize.height"
          :sizes="sizes"
          :provider="entitySrc ? 'entity' : undefined"
          :modifiers="entitySrc ? { imgSrcSize: imageSize } : {}"
          :alt="altResName ? $t(altResName!, altResParams) : ''"
          :class="imgStyleClass"
          :fetchpriority="isHighPriority ? 'high' : 'auto'"
          @load="onLoad"
          @error="onError"
        />
        <div v-if="ui?.overlay" :class="`row-start-1 row-end-2 col-start-1 col-end-2 block w-full h-full rounded-none z-[3] ${ui?.overlay ?? ''}`" />
      </div>
    </ErrorHelm>
  </div>
</template>
