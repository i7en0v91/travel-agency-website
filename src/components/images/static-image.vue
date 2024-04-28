<script setup lang="ts">

import { type CSSProperties } from 'vue';
import fromPairs from 'lodash-es/fromPairs';
import isString from 'lodash-es/isString';
import { type ImageCategory, ImageAuthRequiredCategories, type IImageEntitySrc } from './../../shared/interfaces';
import { type I18nResName } from './../../shared/i18n';
import { type IAppLogger } from './../../shared/applogger';
import { ApiEndpointImageDetails, ApiEndpointImage } from './../../shared/constants';
import { type IImageDetailsDto } from './../../server/dto';
import ErrorHelm from './../error-helm.vue';
import type { NuxtImg } from '#build/components';

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
  sizes: string, // e.g. sm:100vw md:100vw lg:80vw xl:60vw xxl:40vw
  imgClass?: string | undefined,
  stubStyle?: CSSProperties | 'default' | 'custom-if-configured', // false - do not show custom stub (use default)
  requestExtraDisplayOptions?: boolean,
  overlayClass?: string,
  altResName?: I18nResName | undefined,
  altResParams?: any | undefined,
  showStub?: boolean,
  imgIsClientOnly?: boolean,
  isHighPriority?: boolean
}

declare interface IFetchedImageDetails {
  stubCssStyle: CSSProperties | undefined,
  invertForDarkTheme: boolean
};

const props = withDefaults(defineProps<IProps>(), {
  assetSrc: undefined,
  entitySrc: undefined,
  category: undefined,
  imgClass: undefined,
  altResName: undefined,
  altResParams: undefined,
  requestExtraDisplayOptions: false,
  stubStyle: 'default',
  overlayClass: undefined,
  showStub: true,
  imgIsClientOnly: false,
  isHighPriority: false
});

const { status, signIn, getSession } = useAuth();
const systemConfigurationStore = useSystemConfigurationStore();

const isError = ref(false);
const loaded = ref(false);

// making it non-reactive assuming source image sizes won't change during properties update
const imageSize = props.assetSrc ? { width: props.assetSrc.width, height: props.assetSrc.height } : (await systemConfigurationStore.getImageSrcSize(props.category!));
const imgUrl = computed(() => {
  if (props.assetSrc) {
    return `/img/${props.assetSrc.filename}`;
  }
  if (props.entitySrc) {
    if (!props.requestExtraDisplayOptions || detailsFetch.data.value) {
      return `${ApiEndpointImage}?slug=${props.entitySrc!.slug}&category=${props.category}${props.entitySrc!.timestamp ? `&t=${props.entitySrc!.timestamp}` : ''}`;
    }
  }
  return undefined;
});

// custom stub css styling
const logger = CommonServicesLocator.getLogger();

const imgComponent = shallowRef<InstanceType<typeof NuxtImg>>();

const invertForDarkTheme = ref<boolean>(false);
const finalStubStyle = shallowRef<CSSProperties | undefined>(!isString(props.stubStyle) ? (props.stubStyle as CSSProperties) : undefined);

const detailsFetchUrl = ref<string>('');
const detailsFetch = await useFetch<IFetchedImageDetails>(detailsFetchUrl,
  {
    server: true,
    lazy: true,
    watch: [detailsFetchUrl],
    immediate: import.meta.server,
    key: `${props.ctrlKey}-Details`,
    method: 'GET',
    transform: (response: any): IFetchedImageDetails => {
      logger.verbose(`(StaticImage) received image details, ctrlKey=${props.ctrlKey}, url=${detailsFetchUrl.value}]`);
      const dto = response as IImageDetailsDto;
      if (!dto) {
        logger.warn(`(StaticImage) fetch request for image details returned empty data, ctrlKey=${props.ctrlKey}, url=${detailsFetchUrl.value}`);
        return { stubCssStyle: undefined, invertForDarkTheme: false };
      }

      let resultCssStyle: CSSProperties | undefined;
      if (dto.stubCssStyle) {
        resultCssStyle = fromPairs(dto.stubCssStyle) as CSSProperties;
        logger.verbose(`(StaticImage) stub custom css style fetched, style=[${JSON.stringify(resultCssStyle)}] ctrlKey=${props.ctrlKey}, url=${detailsFetchUrl.value}`);
      }

      return { stubCssStyle: resultCssStyle, invertForDarkTheme: dto.invertForDarkTheme } as IFetchedImageDetails;
    }
  });
const fetchedImageDetails = detailsFetch.data;
watch(detailsFetch.error, () => {
  if (detailsFetch.error.value) {
    logger.warn(`(StaticImage) fetch request for image details failed, ctrlKey=${props.ctrlKey}, url=${detailsFetchUrl.value}`, detailsFetch.error.value);
  }
});

function updateImageStylingDetails () {
  finalStubStyle.value = (!isString(props.stubStyle) ? (props.stubStyle as CSSProperties) : undefined) ?? fetchedImageDetails.value?.stubCssStyle ?? undefined;
  invertForDarkTheme.value = (props.requestExtraDisplayOptions ? (fetchedImageDetails.value?.invertForDarkTheme) : undefined) ?? false;
  logger.verbose(`(StaticImage) applying stub custom css style, ctrlKey=${props.ctrlKey}, url=${detailsFetchUrl.value}, style=[${finalStubStyle.value ? JSON.stringify(finalStubStyle.value) : 'empty'}], invertForDarkTheme=${invertForDarkTheme.value}`);
}
watch(fetchedImageDetails, updateImageStylingDetails);
if (fetchedImageDetails.value) {
  updateImageStylingDetails();
}
watch(() => props.entitySrc, fetchDisplayDetailsIfNeeded);

// no need to make it computed at the moment
const stubCssClass = computed(() => {
  const hasStaticStubData = finalStubStyle.value && JSON.stringify(finalStubStyle.value).length > 3;
  return `${loaded.value ? 'img-loaded' : ''} ${hasStaticStubData ? '' : 'static-image-stub-animated'} ${!props.showStub ? 'static-image-stub-hidden' : ''}`;
});

const imgCssClass = computed(() => {
  return `static-image-img ${props.imgClass} ${(loaded.value && (!props.requestExtraDisplayOptions || detailsFetch.data.value)) ? 'img-loaded' : ''} ${invertForDarkTheme.value ? 'dark-theme-invert' : ''}`;
});

async function fetchDisplayDetailsIfNeeded (): Promise<void> {
  if (props.entitySrc && (props.stubStyle === 'custom-if-configured' || props.requestExtraDisplayOptions)) {
    detailsFetchUrl.value = `${ApiEndpointImageDetails}?slug=${props.entitySrc!.slug}&category=${props.category}`;
    logger.verbose(`(StaticImage) fetching image details, ctrlKey=${props.ctrlKey}, url=${detailsFetchUrl.value}`);
    if (import.meta.server) {
      await detailsFetch.refresh();
    }
  }
}
await fetchDisplayDetailsIfNeeded();

function onLoad () {
  getLogger().verbose(`(StaticImage) image loaded, current url=${imgUrl.value}`);
  isError.value = false;
  loaded.value = true;
  $emit('imageReady');
}

async function onError (err: any) {
  getLogger().warn(`(StaticImage) image load failed, current url=${imgUrl.value}`, err);

  // check if this is auth issue
  if (props.category && ImageAuthRequiredCategories.includes(props.category!)) {
    if (status.value !== 'authenticated' || !(await getSession({ required: true }))) {
      getLogger().info(`(StaticImage) image category requires authenticated access: url=${imgUrl.value}, category=${props.category!}`);
      signIn('credentials');
      return;
    }
  }

  isError.value = true; // show error stub
  $emit('imageFailed');
}

const $emit = defineEmits(['imageReady', 'imageFailed']);

function getLogger () : IAppLogger {
  return CommonServicesLocator.getLogger();
}

function fireIfLoadedImmediately () {
  const elImg = imgComponent.value?.$el as HTMLImageElement;
  if (elImg?.complete) {
    getLogger().debug(`(StaticImage) detected immediate image load, ctrlKey=${props.ctrlKey}, url=${imgUrl.value}, category=${props.category!}`);
    onLoad();
  }
}

onMounted(() => {
  fireIfLoadedImmediately();
});

</script>

<template>
  <div class="static-image" role="img">
    <ErrorHelm v-model:is-error="isError" :appearance="'error-stub'" :user-notification="false">
      <div class="static-image-div">
        <div :class="`static-image-stub ${stubCssClass}`" :style="finalStubStyle" />
        <ClientOnly v-if="imgIsClientOnly">
          <nuxt-img
            v-if="imgUrl"
            ref="imgComponent"
            :src="imgUrl"
            fit="cover"
            :width="imageSize.width"
            :height="imageSize.height"
            :sizes="sizes"
            :provider="props.entitySrc ? 'entity' : undefined"
            :modifiers="props.entitySrc ? { imgSrcSize: imageSize } : {}"
            :alt="props.altResName ? $t(props.altResName!, props.altResParams) : ''"
            :class="imgCssClass"
            :fetchpriority="isHighPriority ? 'high' : 'auto'"
            @load="onLoad"
            @error="onError"
          />
        </ClientOnly>
        <nuxt-img
          v-else-if="imgUrl"
          ref="imgComponent"
          :src="imgUrl"
          fit="cover"
          :width="imageSize.width"
          :height="imageSize.height"
          :sizes="sizes"
          :provider="props.entitySrc ? 'entity' : undefined"
          :modifiers="props.entitySrc ? { imgSrcSize: imageSize } : {}"
          :alt="props.altResName ? $t(props.altResName!, props.altResParams) : ''"
          :class="imgCssClass"
          :fetchpriority="isHighPriority ? 'high' : 'auto'"
          @load="onLoad"
          @error="onError"
        />
        <div v-if="overlayClass" :class="`static-image-overlay ${props.overlayClass}`" />
      </div>
    </ErrorHelm>
  </div>
</template>
