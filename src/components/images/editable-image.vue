<script setup lang="ts">
import type { ControlKey } from './../../helpers/components';
import { AppException, AppExceptionCodeEnum, AppConfig, UserNotificationLevel, type I18nResName, getI18nResName2, getI18nResName3, ImageCategory, type IImageEntitySrc } from '@golobe-demo/shared';
import { CroppingImageDataKey } from './../../helpers/constants';
import isString from 'lodash-es/isString';
import { useModal } from 'vue-final-modal';
import { basename, extname } from 'pathe';
import StaticImage from './static-image.vue';
import CroppingBox from './cropping-box.vue';
import ModalWaitingIndicator from './../modal-waiting-indicator.vue';
import { getCommonServices } from '../../helpers/service-accessors';
import type { UserUpdateSkipped } from './../../stores/user-account-store';

globalThis.Buffer = globalThis.Buffer || Buffer;

interface IProps {
  ctrlKey: ControlKey,
  category: ImageCategory,
  sizes: string, // e.g. sm:100vw md:100vw lg:80vw xl:60vw xxl:40vw
  fillAlpha?: boolean, // substiture alpha-channel with solid color (from theme settings)
  btnResName?: I18nResName,
  altResName?: I18nResName,
  altResParams?: any,
  showStub?: boolean,
  isHighPriority?: boolean,
  styling?: {
    containerClass?: string,
    htmlImgClass?: string,
    btnClass?: string,
    btnIcon?: string
  }
}

const { ctrlKey, category, fillAlpha = true, showStub = true, isHighPriority = false } = defineProps<IProps>();

const { open } = useModal({
  component: CroppingBox,
  attrs: {
    ctrlKey: [...ctrlKey, 'CroppingBox'],
    category,
    fillAlpha,
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
    ctrlKey: [...ctrlKey, 'Waiter'],
    labelResName: getI18nResName2('editableImage', 'uploading')
  }
});

const logger = getCommonServices().getLogger().addContextProps({ component: 'EditableImage' });
const userNotificationStore = useUserNotificationStore();
const userAccountStore = useUserAccountStore();
const modelValue = defineModel<IImageEntitySrc>('entitySrc');
const fileInput = useTemplateRef<HTMLInputElement>('file-input');
let uploadingFileName: string = '';

async function uploadCroppedImage () : Promise<void> {
  const imageDataBase64 = readCurrentImageData();
  if (imageDataBase64 && imageDataBase64.length > 0) {
    try {
      const imageBytes = Buffer.from(imageDataBase64, 'base64');
      logger.info('starting to upload image data', { size: imageBytes.length, fileName: uploadingFileName });
      await modalWaitingIndicator.open();

      let uploadedImageInfo: IImageEntitySrc | UserUpdateSkipped;
      if(category === ImageCategory.UserAvatar) {
        uploadedImageInfo = await userAccountStore.uploadAvatar(imageBytes, uploadingFileName);
      } else if(category === ImageCategory.UserCover) {
        uploadedImageInfo = await userAccountStore.uploadCover(imageBytes, uploadingFileName);
      } else {
        logger.warn('unexpected image category', undefined, { category });
        throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'unexpected image category', 'error-stub');
      }
      if(!uploadedImageInfo) {
        logger.warn('ignoring user image upload result', undefined, { category });
        return;
      }

      modelValue.value = uploadedImageInfo;
      logger.verbose('upload image data completed', { size: imageBytes.length, fileName: uploadingFileName });
    } catch (err: any) {
      logger.warn('failed to upload image data', err, { size: imageDataBase64.length, fileName: uploadingFileName });
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
  if (fileInput.value) {
    fileInput.value.value = '';
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
        logger.warn('failed to load image - empty file');
        userNotificationStore.show({
          level: UserNotificationLevel.ERROR,
          resName: getI18nResName3('editableImage', 'issues', 'imageLoadFailed')
        });
        return;
      }

      if (!isString(event.target.result)) {
        logger.warn('failed to load image - unexpected data format');
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
      logger.warn('exception during image load');
      userNotificationStore.show({
        level: UserNotificationLevel.ERROR,
        resName: getI18nResName3('editableImage', 'issues', 'imageLoadFailed')
      });
    };

    reader.onabort = () => {
      logger.info('image load aborted');
      userNotificationStore.show({
        level: UserNotificationLevel.WARN,
        resName: getI18nResName3('editableImage', 'issues', 'imageLoadAborted')
      });
    };

    // start loading file data
    reader.readAsDataURL(file);
  } else {
    logger.warn('FileReader API is not supported');
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
    logger.info('no files were selected');
    resetCurrentImageData();
    userNotificationStore.show({
      level: UserNotificationLevel.WARN,
      resName: getI18nResName3('editableImage', 'issues', 'noFilesSelected')
    });
    return;
  }

  const file = files![0];
  if (file.size > AppConfig.maxUploadImageSizeMb * 1000000) {
    logger.info('max file size exceeded, num', { bytes:  file.size });
    resetCurrentImageData();
    userNotificationStore.show({
      level: UserNotificationLevel.WARN,
      resName: getI18nResName3('editableImage', 'issues', 'fileSizeExceeded'),
      resArgs: { maxSizeMb: 2 }
    });
    return;
  }

  if (!file.type.includes('image/')) {
    logger.info('file is not an image', { type:  file.type });
    resetCurrentImageData();
    userNotificationStore.show({
      level: UserNotificationLevel.WARN,
      resName: getI18nResName3('editableImage', 'issues', 'fileIsNotAnImage')
    });
    return;
  }

  setImageForEdit(file);
}

function openFileDialog () {
  fileInput.value?.click();
}

const fileInputHtmlId = useId();

</script>

<template>
  <div class="editable-image" role="img">
    <StaticImage
      ref="static-image"
      :ctrl-key="[...ctrlKey, 'StaticImg']"
      :class="`editable-image-static-view ${styling?.containerClass}`"
      :stub="showStub ? 'default' : false"
      :ui="{ img: styling?.htmlImgClass }"
      :src="entitySrc"
      :category="category"
      :sizes="sizes"
      :high-priority="isHighPriority"
      :alt="altResName ? { resName: altResName } : undefined"
    />
    <label :for="fileInputHtmlId" :class="`tabbable btn ${styling?.btnClass} py-xs-3 px-xs-2 ${styling?.btnIcon ? `btn-icon icon-${styling?.btnIcon}` : ''}`" @keyup.enter="openFileDialog" @keyup.space="openFileDialog">{{ btnResName ? $t(btnResName) : '&nbsp;' }}</label>
    <input
      :id="fileInputHtmlId"
      ref="file-input"
      :style=" { display: 'none' } "
      type="file"
      name="image"
      accept="image/*"
      @change="onFileSelected"
    >
  </div>
</template>
