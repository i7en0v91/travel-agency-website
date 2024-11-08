<script setup lang="ts">
import { UserNotificationLevel, getI18nResName2, getI18nResName3, type ImageCategory } from '@golobe-demo/shared';
import { CroppingImageDataKey, CroppingImageFormat } from './../../helpers/constants';
import Cropper from 'cropperjs';
import { VueFinalModal } from 'vue-final-modal';
import { useThemeSettings } from './../../composables/theme-settings';
import SimpleButton from './../forms/simple-button.vue';
import { getCommonServices } from '../../helpers/service-accessors';

globalThis.Buffer = globalThis.Buffer || Buffer;

const ImageCaptureMinSizeBase = 10;

interface IProps {
  ctrlKey: string,
  category: ImageCategory,
  fillAlpha: boolean,
  clickToClose: boolean,
  escToClose: boolean
}

const props = defineProps<IProps>();

const { t } = useI18n();
const userNotificationStore = useUserNotificationStore();
const systemConfigurationStore = useSystemConfigurationStore();
const themeSettings = useThemeSettings();
const logger = getCommonServices().getLogger();

const isError = ref(false);
const cropperImg = shallowRef<InstanceType<typeof HTMLImageElement>>();
let cropper : Cropper | undefined;

const imageSize = await systemConfigurationStore.getImageSrcSize(props.category);

const $emit = defineEmits(['update:modelValue']);

function getCropper (reset: boolean): Cropper | undefined {
  if (isError.value) {
    return undefined;
  }

  try {
    if (!cropper) {
      const options: Cropper.Options = {
        viewMode: 1,
        aspectRatio: imageSize.width / imageSize.height,
        rotatable: false,
        scalable: false,
        minCropBoxWidth: 40,
        zoomable: true,
        dragMode: 'move',
        checkCrossOrigin: false
      };
      cropper = new Cropper(cropperImg.value!, options);
    }
    if (reset) {
      cropper.reset();
    }
    return cropper;
  } catch (err: any) {
    logger.warn('(cropping-box) failed to prepare Cropper instance', err);
    destroyCropperSafe();
    isError.value = true;
    return undefined;
  }
}

function readCurrentImageData (): string | undefined {
  const imageData = localStorage.getItem(CroppingImageDataKey);
  return (imageData && imageData.length) ? imageData : undefined;
}

function setCurrentImageData (data: string | null) {
  localStorage.setItem(CroppingImageDataKey, data ?? '');
}

function onCancelClick () {
  setCurrentImageData(null);
  $emit('update:modelValue', false);
}

function onImgError () {
  if (!isError.value && cropper) { // check that page is not closing, but initializing
    setCurrentImageData(null);
    destroyCropperSafe();
    isError.value = true;
    userNotificationStore.show({
      level: UserNotificationLevel.ERROR,
      resName: getI18nResName3('editableImage', 'issues', 'imageLoadFailed')
    });
    logger.warn(`(cropping-box) failed to load image, category=${props.category}`);
  }
}

function onImgLoad () {
  // additional check for load correctness (initially added to support Midori case)
  setTimeout(() => {
    const wasCorrectlyLoaded = (cropperImg.value?.width ?? 0) > 0 && (cropperImg.value?.height ?? 0) > 0;
    if (!isError.value && !wasCorrectlyLoaded) {
      setCurrentImageData(null);
      destroyCropperSafe();
      isError.value = true;
      userNotificationStore.show({
        level: UserNotificationLevel.ERROR,
        resName: getI18nResName3('editableImage', 'issues', 'imageLoadFailed')
      });
      logger.warn(`(cropping-box) image is empty, category=${props.category}`);
    }
  }, 1);
}

function readCropperCanvasAsByteArray (): Promise<Uint8Array> {
  const canvasOptions: Cropper.GetCroppedCanvasOptions = {
    minWidth: Math.floor(imageSize.width / ImageCaptureMinSizeBase),
    minHeight: Math.floor(imageSize.height / ImageCaptureMinSizeBase),
    imageSmoothingEnabled: false,
    imageSmoothingQuality: 'high',
    fillColor: props.fillAlpha ? (themeSettings.currentTheme.value === 'light' ? 'white' : 'black') : 'transparent'
  };

  const promise = new Promise<Uint8Array>((resolve, reject) => {
    logger.verbose(`(cropping-box) starting to capture canvas, category=${props.category}`);
    cropper!.getCroppedCanvas(canvasOptions).toBlob((blob: Blob | null) => {
      if (!blob) {
        reject(new Error(`(cropping-box) failed to capture canvas, got empty data, category=${props.category}`));
        return;
      }

      blob.arrayBuffer().then((b) => {
        logger.verbose(`(cropping-box) canvas captured, category=${props.category}, size=${b.byteLength}`);
        resolve(new Uint8Array(b));
      }).catch((r) => {
        logger.warn(`(cropping-box) failed to capture canvas, category=${props.category}`, r);
        reject(new Error('failed to crop image'));
      });
    }, CroppingImageFormat, 1);
  });

  return promise;
}

async function onUploadClick (): Promise<void> {
  if (isError.value) {
    setCurrentImageData(null);
  } else {
    try {
      const imageData = await readCropperCanvasAsByteArray();
      const imageDataBase64 = Buffer.from(imageData).toString('base64');
      setCurrentImageData(imageDataBase64);
    } catch (err: any) {
      logger.warn(`(cropping-box) failed to crop image, category=${props.category}`, err);
      setCurrentImageData(null);
      userNotificationStore.show({
        level: UserNotificationLevel.ERROR,
        resName: getI18nResName3('editableImage', 'issues', 'imageProcessingFailed')
      });
    }
  }
  $emit('update:modelValue', false);
}

function onOpened () {
  const imageData = readCurrentImageData();
  if (!imageData) {
    logger.warn('(cropping-box) got empty current image data');
    destroyCropperSafe();
    isError.value = true;
    return;
  }

  setCurrentImageData(null);
  try {
    getCropper(true)?.replace(imageData);
  } catch (err: any) {
    logger.warn('(cropping-box) failed to set image', err);
    userNotificationStore.show({
      level: UserNotificationLevel.ERROR,
      resName: getI18nResName3('editableImage', 'issues', 'imageLoadFailed')
    });
    destroyCropperSafe();
    isError.value = true;
  }
}

function onClosed () {
  destroyCropperSafe();
}

function destroyCropperSafe () {
  if (cropper) {
    try {
      cropper.destroy();
    } catch (err: any) {
      // surround with try-catch as img element may be hidden by ErrorHelm and
      // in this case cropper.destroy will fail to remove it
    }
    cropper = undefined;
  }
}

</script>

<template>
  <VueFinalModal
    class="modal-window"
    content-class="cropping-box p-xs-3 p-s-4"
    :lock-scroll="false"
    :click-to-close="$props.clickToClose"
    :esc-to-close="$props.escToClose"
    @opened="onOpened"
    @closed="onClosed"
    @update:model-value="(val: boolean) => $emit('update:modelValue', val)"
  >
    <ClientOnly>
      <h3 class="cropping-box-title mb-xs-2 mb-s-4">
        {{ $t(getI18nResName2('editableImage', 'croppingBoxTitle')) }}
      </h3>
      <div class="cropping-box-container">
        <ErrorHelm :is-error="isError">
          <img ref="cropperImg" class="cropping-box-img" :alt="t(getI18nResName2('editableImage', 'editImgAlt'))" @error="onImgError" @load="onImgLoad">
        </ErrorHelm>
      </div>
      <div class="cropping-box-divisor my-xs-2 my-s-3" />
      <div class="cropping-box-buttons">
        <SimpleButton kind="support" :ctrl-key="`cropping-${ctrlKey}-btnCancel`" icon="cross" :label-res-name="getI18nResName2('editableImage', 'btnCancel')" @click="onCancelClick" />
        <SimpleButton kind="default" :ctrl-key="`cropping-${ctrlKey}-btnUpload`" icon="check" :label-res-name="getI18nResName2('editableImage', 'btnUpload')" @click="onUploadClick" />
      </div>
    </ClientOnly>
  </VueFinalModal>
</template>
