<script setup lang="ts">
import { UserNotificationLevel, getI18nResName2, getI18nResName3, type ImageCategory } from '@golobe-demo/shared';
import { CroppingImageDataKey, CroppingImageFormat } from './../../helpers/constants';
import Cropper from 'cropperjs';
import './../../node_modules/cropperjs/dist/cropper.min.css';
import { useThemeSettings } from './../../composables/theme-settings';
import { getCommonServices } from '../../helpers/service-accessors';

globalThis.Buffer = globalThis.Buffer || Buffer;

const ImageCaptureMinSizeBase = 10;

interface IProps {
  ctrlKey: string,
  category: ImageCategory,
  fillAlpha: boolean
}

const { ctrlKey, category, fillAlpha } = defineProps<IProps>();

defineShortcuts({
  escape: {
    usingInput: true,
    handler: () => { $emit('close'); }
  },
});

const { t } = useI18n();
const userNotificationStore = useUserNotificationStore();
const systemConfigurationStore = useSystemConfigurationStore();
const themeSettings = useThemeSettings();
const logger = getCommonServices().getLogger();

const isError = ref(false);
const cropperImg = useTemplateRef<HTMLImageElement>('cropper-image');
let cropper : Cropper | undefined;

const imageSize = await systemConfigurationStore.getImageSrcSize(category);

const $emit = defineEmits(['close']);

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
        zoomable: true,
        background: false,
        dragMode: 'move',
        minCropBoxWidth: 40,
        checkCrossOrigin: false
      };
      cropper = new Cropper(cropperImg.value!, options);
    }
    if (reset) {
      cropper.reset();
    }
    return cropper;
  } catch (err: any) {
    logger.warn(`(cropping-box) failed to prepare Cropper instance, ctrlKey=${ctrlKey}`, err);
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
  $emit('close');
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
    logger.warn(`(cropping-box) failed to load image, ctrlKey=${ctrlKey}, category=${category}`);
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
      logger.warn(`(cropping-box) image is empty, ctrlKey=${ctrlKey}, category=${category}`);
    }
  }, 1);
}

function readCropperCanvasAsByteArray (): Promise<Uint8Array> {
  const canvasOptions: Cropper.GetCroppedCanvasOptions = {
    minWidth: Math.floor(imageSize.width / ImageCaptureMinSizeBase),
    minHeight: Math.floor(imageSize.height / ImageCaptureMinSizeBase),
    imageSmoothingEnabled: false,
    imageSmoothingQuality: 'high',
    fillColor: fillAlpha ? (themeSettings.currentTheme.value === 'light' ? 'white' : 'black') : 'transparent'
  };

  const promise = new Promise<Uint8Array>((resolve, reject) => {
    logger.verbose(`(cropping-box) starting to capture canvas, ctrlKey=${ctrlKey}, category=${category}`);
    cropper!.getCroppedCanvas(canvasOptions).toBlob((blob: Blob | null) => {
      if (!blob) {
        reject(new Error(`(cropping-box) failed to capture canvas, got empty data, ctrlKey=${ctrlKey}, category=${category}`));
        return;
      }

      blob.arrayBuffer().then((b) => {
        logger.verbose(`(cropping-box) canvas captured, ctrlKey=${ctrlKey}, category=${category}, size=${b.byteLength}`);
        resolve(new Uint8Array(b));
      }).catch((r) => {
        logger.warn(`(cropping-box) failed to capture canvas, category=${category}`, r);
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
      logger.warn(`(cropping-box) failed to crop image, ctrlKey=${ctrlKey}, category=${category}`, err);
      setCurrentImageData(null);
      userNotificationStore.show({
        level: UserNotificationLevel.ERROR,
        resName: getI18nResName3('editableImage', 'issues', 'imageProcessingFailed')
      });
    }
  }
  $emit('close');
}

function onOpened () {
  const imageData = readCurrentImageData();
  if (!imageData) {
    logger.warn(`(cropping-box) got empty current image data, ctrlKey=${ctrlKey}`);
    destroyCropperSafe();
    isError.value = true;
    return;
  }

  setCurrentImageData(null);
  try {
    getCropper(true)?.replace(imageData);
  } catch (err: any) {
    logger.warn(`(cropping-box) failed to set image, ctrlKey=${ctrlKey}`, err);
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
      console.warn(err);
      // surround with try-catch as img element may be hidden by ErrorHelm and
      // in this case cropper.destroy will fail to remove it
    }
    cropper = undefined;
  }
}
  
onMounted(() => {
  setTimeout(onOpened, 0);
});

onBeforeUnmount(() => {
  onClosed();
});

</script>

<template>
  <ClientOnly>
    <div class="w-full h-auto p-4 sm:p-6">
      <h3 class="font-semibold text-3xl mb-2 sm:mb-6">
        {{ $t(getI18nResName2('editableImage', 'croppingBoxTitle')) }}
      </h3>
      <UDivider color="gray" orientation="horizontal" class="w-full h-auto my-2 sm:my-4" size="sm"/>
      <ErrorHelm v-model:is-error="isError">
        <div class="block w-full h-[50vh] bg-primary-300 dark:bg-primary-600 max-w-full overflow-hidden">
          <img ref="cropper-image" class="block max-w-full w-full h-full" :alt="t(getI18nResName2('editableImage', 'editImgAlt'))" @error="onImgError" @load="onImgLoad">
        </div>
      </ErrorHelm>
      <UDivider color="gray" orientation="horizontal" class="w-full h-auto my-2 sm:my-4" size="sm"/>
      <div class="flex flex-row flex-wrap gap-4 justify-between sm:justify-end">
        <UButton icon="i-mdi-close" variant="outline" color="gray" @click="onCancelClick">
          {{ t(getI18nResName2('editableImage', 'btnCancel')) }}
        </UButton>
        <UButton icon="i-heroicons-check" variant="solid" color="primary" @click="onUploadClick">
          {{ t(getI18nResName2('editableImage', 'btnUpload')) }}
        </UButton>
      </div>
    </div>
  </ClientOnly>
</template>
