<script setup lang="ts">

import { type CSSProperties } from 'vue';
import fromPairs from 'lodash/fromPairs';
import isString from 'lodash/isString';
import { type ImageCategory, ImageAuthRequiredCategories, type IImageEntitySrc } from './../../shared/interfaces';
import { type I18nResName } from './../../shared/i18n';
import { type IAppLogger } from './../../shared/applogger';
import { WebApiRoutes } from './../../shared/constants';
import { type IImageDetailsDto } from './../../server/dto';
import { useSystemConfigurationStore } from './../../stores/system-configuration-store';
import ErrorHelm from './../error-helm.vue';

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
  altResName?: I18nResName | undefined,
  altResParams?: any | undefined,
  showStub?: boolean,
  imgIsClientOnly?: boolean,
  isHighPriority?: boolean
}

const props = withDefaults(defineProps<IProps>(), {
  assetSrc: undefined,
  entitySrc: undefined,
  category: undefined,
  imgClass: undefined,
  altResName: undefined,
  altResParams: undefined,
  stubStyle: 'default',
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
    return `${WebApiRoutes.Image}?slug=${props.entitySrc!.slug}&category=${props.category}${props.entitySrc!.timestamp ? `&t=${props.entitySrc!.timestamp}` : ''}`;
  }
  return undefined;
});

// custom stub css styling
const logger = CommonServicesLocator.getLogger();
let finalStubData: Ref<CSSProperties | null | undefined>;
const finalStubStyle = ref<CSSProperties | undefined>(!isString(props.stubStyle) ? (props.stubStyle as CSSProperties) : undefined);
if (props.entitySrc && props.stubStyle === 'custom-if-configured') {
  const stylingUrl = `${WebApiRoutes.ImageDetails}?slug=${props.entitySrc!.slug}&category=${props.category}`;
  const { data, error } = await useFetch(stylingUrl,
    {
      server: true,
      lazy: true,
      transform: (response: any) => {
        logger.verbose(`(StaticImage) received image details, ctrlKey=${props.ctrlKey}, url=${stylingUrl}]`);
        const dto = response as IImageDetailsDto;
        if (!dto) {
          logger.warn(`(StaticImage) fetch request for image details returned empty data, ctrlKey=${props.ctrlKey}, url=${stylingUrl}`);
          return;
        }
        if (!dto.stubCssStyle) {
          logger.info(`(StaticImage) image details does not contain custom css styling, ctrlKey=${props.ctrlKey}, url=${stylingUrl}`);
          return;
        }
        const result = fromPairs(dto.stubCssStyle) as CSSProperties;
        logger.verbose(`(StaticImage) stub custom css style fetched, style=[${JSON.stringify(result)}] ctrlKey=${props.ctrlKey}, url=${stylingUrl}`);
        return result;
      }
    });
  finalStubData = data;
  watch(error, () => {
    if (error.value) {
      logger.warn(`(StaticImage) fetch request for image details failed, ctrlKey=${props.ctrlKey}, url=${stylingUrl}`, error.value);
    }
  });

  function updateFinalStubStyle () {
    finalStubStyle.value = (!isString(props.stubStyle) ? (props.stubStyle as CSSProperties) : undefined) ?? finalStubData.value ?? undefined;
    logger.verbose(`(StaticImage) applying stub custom css style, ctrlKey=${props.ctrlKey}, url=${stylingUrl}, style=[${finalStubStyle.value ? JSON.stringify(finalStubStyle.value) : 'empty'}]`);
  }
  watch(finalStubData, updateFinalStubStyle);
  if (finalStubData.value) {
    updateFinalStubStyle();
  }
}

// no need to make it computed at the moment
const stubCssClass = computed(() => {
  const hasStaticStubData = finalStubStyle.value && JSON.stringify(finalStubStyle.value).length > 3;
  return `${loaded.value ? 'img-loaded' : ''} ${hasStaticStubData ? '' : 'static-image-stub-animated'} ${!props.showStub ? 'static-image-stub-hidden' : ''}`;
});

const imgCssClass = computed(() => {
  return `static-image-img ${props.imgClass} ${loaded ? 'img-loaded' : ''}`;
});

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

</script>

<template>
  <div class="static-image" role="img">
    <ErrorHelm v-model:is-error="isError" :appearance="'error-stub'" :user-notification="false">
      <div class="static-image-div">
        <div :class="`static-image-stub ${stubCssClass}`" :style="finalStubStyle" />
        <ClientOnly v-if="imgIsClientOnly">
          <nuxt-img
            v-if="imgUrl"
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
      </div>
    </ErrorHelm>
  </div>
</template>
