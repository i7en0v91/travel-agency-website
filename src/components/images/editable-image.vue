<script setup lang="ts">

import isString from 'lodash-es/isString';
import { useModal } from 'vue-final-modal';
import { basename, extname } from 'pathe';
import { type ImageCategory, type IImageEntitySrc } from './../../shared/interfaces';
import { type I18nResName, getI18nResName2, getI18nResName3 } from './../../shared/i18n';
import StaticImage from './static-image.vue';
import { UserNotificationLevel, CroppingImageDataKey, ApiEndpointUserImageUpload } from './../../shared/constants';
import AppConfig from './../../appconfig';
import CroppingBox from './cropping-box.vue';
import ModalWaitingIndicator from './../modal-waiting-indicator.vue';
import { post } from './../../shared/rest-utils';
import { type IImageUploadResultDto } from './../../server/dto';
import { type ComponentInstance } from 'vue';

globalThis.Buffer = globalThis.Buffer || Buffer;

interface IProps {
  ctrlKey: string,
  category: ImageCategory,
  entitySrc: IImageEntitySrc,
  sizes: string, // e.g. sm:100vw md:100vw lg:80vw xl:60vw xxl:40vw
  fillAlpha?: boolean, // substiture alpha-channel with solid color (from theme settings)
  btnResName?: I18nResName,
  altResName?: I18nResName | undefined,
  altResParams?: any | undefined,
  showStub?: boolean,
  isHighPriority?: boolean,
  styling?: {
    containerClass?: string,
    htmlImgClass?: string,
    btnClass?: string,
    btnIcon?: string
  }
}

const props = withDefaults(defineProps<IProps>(), {
  btnIcon: undefined,
  altResName: undefined,
  altResParams: undefined,
  btnResName: undefined,
  showStub: true,
  fillAlpha: true,
  styling: undefined,
  isHighPriority: false
});

const { status } = useAuth();

const { open } = useModal({
  component: CroppingBox,
  attrs: {
    ctrlKey: `${props.ctrlKey}-croppingBox`,
    category: props.category,
    fillAlpha: props.fillAlpha,
    clickToClose: false,
    escToClose: true,
    onClosed () {
      uploadCroppedImage();
    }
  }
});

const modalWaitingIndicator = useModal({
  component: ModalWaitingIndicator,
  attrs: {
    ctrlKey: `${props.ctrlKey}-modalWaitingIndicator`,
    labelResName: getI18nResName2('editableImage', 'uploading')
  }
});
const fileInputEl = shallowRef<HTMLInputElement>();
const staticImageComponent = shallowRef<ComponentInstance<typeof StaticImage>>();

const userNotificationStore = useUserNotificationStore();
const logger = CommonServicesLocator.getLogger();

let uploadingFileName: string = '';

const $emit = defineEmits(['update:entitySrc']);

async function uploadCroppedImage () : Promise<void> {
  if (status.value !== 'authenticated') {
    resetCurrentImageData();
    const { signIn } = useAuth();
    signIn('credentials');
    return;
  }

  const imageDataBase64 = readCurrentImageData();
  if (imageDataBase64 && imageDataBase64.length > 0) {
    try {
      const imageBytes = Buffer.from(imageDataBase64, 'base64');
      logger.info(`(editable-image) starting to upload image data, size=${imageBytes.length}, fileName=${uploadingFileName}`);
      await modalWaitingIndicator.open();

      const query = uploadingFileName.length > 0 ? { fileName: uploadingFileName, category: props.category } : undefined;
      const uploadedImageInfo = await post<any, IImageUploadResultDto>(`/${ApiEndpointUserImageUpload}`, query, imageBytes, undefined, true, undefined, 'default');
      if (uploadedImageInfo) {
        logger.info(`(editable-image) image uploaded, size=${imageBytes.length}, fileName=${uploadingFileName}`);
        $emit('update:entitySrc', uploadedImageInfo);
      }
    } catch (err: any) {
      logger.warn(`(editable-image) failed to upload image data, size=${imageDataBase64.length}, fileName=${uploadingFileName}`, err);
      throw err;
    } finally {
      resetCurrentImageData();
      await modalWaitingIndicator.close();
    }
  } else {
    resetCurrentImageData();
  }
}

function readCurrentImageData (): string | undefined {
  const result = localStorage.getItem(CroppingImageDataKey);
  return result && result.length > 0 ? result : undefined;
}

function resetCurrentImageData () {
  setCurrentImageData(null);
  if (fileInputEl.value) {
    fileInputEl.value.value = '';
  }
}

function setCurrentImageData (data: string | null) {
  localStorage.setItem(CroppingImageDataKey, data ?? '');
}

function setImageForEdit (file: File) {
  if (typeof FileReader === 'function') {
    const reader = new FileReader();

    reader.onload = (event) => {
      if (!event.target?.result) {
        logger.warn('(editable-image) failed to load image - empty file');
        userNotificationStore.show({
          level: UserNotificationLevel.ERROR,
          resName: getI18nResName3('editableImage', 'issues', 'imageLoadFailed')
        });
        return;
      }

      if (!isString(event.target.result)) {
        logger.warn('(editable-image) failed to load image - unexpected data format');
        userNotificationStore.show({
          level: UserNotificationLevel.ERROR,
          resName: getI18nResName3('editableImage', 'issues', 'imageLoadFailed')
        });
        return;
      }

      const fileBase64 = event.target!.result as string;
      setCurrentImageData(fileBase64);
      uploadingFileName = file.name ? basename(file.name, extname(file.name)) : '';
      open();
    };
    reader.onerror = () => {
      logger.warn('(editable-image) exception during image load');
      userNotificationStore.show({
        level: UserNotificationLevel.ERROR,
        resName: getI18nResName3('editableImage', 'issues', 'imageLoadFailed')
      });
    };

    reader.onabort = () => {
      logger.info('(editable-image) image load aborted');
      userNotificationStore.show({
        level: UserNotificationLevel.WARN,
        resName: getI18nResName3('editableImage', 'issues', 'imageLoadAborted')
      });
    };

    // start loading file data
    reader.readAsDataURL(file);
  } else {
    logger.warn('(editable-image) FileReader API is not supported');
    resetCurrentImageData();
    userNotificationStore.show({
      level: UserNotificationLevel.ERROR,
      resName: getI18nResName3('editableImage', 'issues', 'unsupported')
    });
  }
}

function onFileSelected (e: Event) {
  const htmlInputElement = (e.target as HTMLInputElement);
  const files = htmlInputElement.files;
  if ((files?.length ?? 0) === 0) {
    logger.info('(editable-image) no files were selected');
    resetCurrentImageData();
    userNotificationStore.show({
      level: UserNotificationLevel.WARN,
      resName: getI18nResName3('editableImage', 'issues', 'noFilesSelected')
    });
    return;
  }

  const file = files![0];
  if (file.size > AppConfig.maxUploadImageSizeMb * 1000000) {
    logger.info(`(editable-image) max file size exceeded, num bytes = ${file.size}`);
    resetCurrentImageData();
    userNotificationStore.show({
      level: UserNotificationLevel.WARN,
      resName: getI18nResName3('editableImage', 'issues', 'fileSizeExceeded'),
      resArgs: { maxSizeMb: 2 }
    });
    return;
  }

  if (!file.type.includes('image/')) {
    logger.info(`(editable-image) file is not an image, type = ${file.type}`);
    resetCurrentImageData();
    userNotificationStore.show({
      level: UserNotificationLevel.WARN,
      resName: getI18nResName3('editableImage', 'issues', 'fileIsNotAnImage')
    });
    return;
  }

  setImageForEdit(file);
}

function setImage (image: IImageEntitySrc) {
  $emit('update:entitySrc', image);
}

function openFileDialog () {
  fileInputEl.value?.click();
}

const fileInputHtmlId = useId();

defineExpose({
  setImage
});

</script>

<template>
  <div class="editable-image" role="img">
    <StaticImage
      ref="staticImageComponent"
      :ctrl-key="`editableImage-${ctrlKey}`"
      :class="`editable-image-static-view ${styling?.containerClass}`"
      :show-stub="showStub"
      :img-class="styling?.htmlImgClass"
      :entity-src="entitySrc"
      :category="category"
      :sizes="sizes"
      :is-high-priority="isHighPriority"
      :alt-res-name="altResName"
    />
    <label :for="fileInputHtmlId" :class="`tabbable btn ${styling?.btnClass} py-xs-3 px-xs-2 ${styling?.btnIcon ? `btn-icon icon-${styling?.btnIcon}` : ''}`" @keyup.enter="openFileDialog" @keyup.space="openFileDialog">{{ btnResName ? $t(btnResName) : '&nbsp;' }}</label>
    <input
      :id="fileInputHtmlId"
      ref="fileInputEl"
      :style=" { display: 'none' } "
      type="file"
      name="image"
      accept="image/*"
      @change="onFileSelected"
    >
  </div>
</template>
