<script setup lang="ts">
import { AppConfig, UserNotificationLevel, type I18nResName, getI18nResName2, getI18nResName3, type ImageCategory, type IImageEntitySrc } from '@golobe-demo/shared';
import { type IImageUploadResultDto, ApiEndpointUserImageUpload } from '../../server/api-definitions';
import { CroppingImageDataKey } from './../../helpers/constants';
import { post } from './../../helpers/rest-utils';
import isString from 'lodash-es/isString';
import { basename, extname } from 'pathe';
import StaticImage from './static-image.vue';
import CroppingBox from './cropping-box.vue';
import ModalWaitingIndicator from '../forms/modal-waiting-indicator.vue';
import { getCommonServices } from '../../helpers/service-accessors';
import type { IStaticImageUiProps } from '../../types';
import { useModalWaiter, type IModalWaiter } from '../../composables/modal-waiter';

globalThis.Buffer = globalThis.Buffer || Buffer;

interface IProps {
  ctrlKey: string,
  category: ImageCategory,
  entitySrc: IImageEntitySrc,
  sizes: string, // e.g. sm:100vw md:100vw lg:80vw xl:60vw 2xl:40vw
  fillAlpha?: boolean, // substiture alpha-channel with solid color (from theme settings)
  btnResName?: I18nResName,
  altResName?: I18nResName,
  altResParams?: any,
  showStub?: boolean,
  isHighPriority?: boolean,
  ui?: {
    wrapper?: string,
    image?: IStaticImageUiProps,
    btn?: { 
      wrapper?: string,
      base?: string,
      rounded?: string,
      icon?: {
        name?: string,
        base?: string
      } 
    }
  }
}

const { 
  ctrlKey, 
  category, 
  ui,
  fillAlpha = true, 
  showStub = true, 
  isHighPriority = false 
} = defineProps<IProps>();

const { status } = useAuth();

const open = ref(false);

const fileInput = useTemplateRef<HTMLInputElement>('file-input');
const selectedFile = ref<FileList | null>(null);
const modalWaiterRef = useTemplateRef('modal-waiter');
const modalWaiterOpen = ref<boolean>(false);

const userNotificationStore = useUserNotificationStore();
const logger = getCommonServices().getLogger();

let uploadingFileName: string = '';

const $emit = defineEmits(['update:entitySrc']);

function onClosed () {
  logger.debug(`(editable-image) cropper window closed, ctrlKey=${ctrlKey}`);
  open.value = false;
  uploadCroppedImageIfSpecified();
}

async function uploadCroppedImageIfSpecified () : Promise<void> {
  if (status.value !== 'authenticated') {
    resetCurrentImageData();
    const { signIn } = useAuth();
    signIn('credentials');
    return;
  }

  const imageDataBase64 = readCurrentImageData();
  if (imageDataBase64 && imageDataBase64.length > 0) {
    resetCurrentImageData();
    
    let modalWaiter: IModalWaiter | undefined;
    try {
      const imageBytes = Buffer.from(imageDataBase64, 'base64');
      logger.info(`(editable-image) starting to upload image data, ctrlKey=${ctrlKey}, size=${imageBytes.length}, fileName=${uploadingFileName}`);

      modalWaiter = useModalWaiter(modalWaiterRef as any, modalWaiterOpen);
      modalWaiter.show(true);

      const query = uploadingFileName.length > 0 ? { fileName: uploadingFileName, category } : undefined;
      const uploadedImageInfo = await post<any, IImageUploadResultDto>(`/${ApiEndpointUserImageUpload}`, query, imageBytes, undefined, true, undefined, 'default');
      if (uploadedImageInfo) {
        logger.info(`(editable-image) image uploaded, ctrlKey=${ctrlKey}, size=${imageBytes.length}, fileName=${uploadingFileName}`);
        $emit('update:entitySrc', uploadedImageInfo);
      }
    } catch (err: any) {
      logger.warn(`(editable-image) failed to upload image data, ctrlKey=${ctrlKey}, size=${imageDataBase64.length}, fileName=${uploadingFileName}`, err);
      throw err;
    } finally {
      resetCurrentImageData();
      modalWaiter?.show(false);
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
  selectedFile.value = null;
}

function setCurrentImageData (data: string | null) {
  localStorage.setItem(CroppingImageDataKey, data ?? '');
}

function setImageForEdit (file: File) {
  if (typeof FileReader === 'function') {
    const reader = new FileReader();

    reader.onload = (event) => {
      if (!event.target?.result) {
        logger.warn(`(editable-image) failed to load image - empty file, ctrlKey=${ctrlKey}`);
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
      open.value = true;
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
  logger.verbose(`(editable-image) selected files changed handler, ctrlKey=${ctrlKey}, count=${files?.length}`);
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
    logger.info(`(editable-image) file is not an image, ctrlKey=${ctrlKey}, type = ${file.type}`);
    resetCurrentImageData();
    userNotificationStore.show({
      level: UserNotificationLevel.WARN,
      resName: getI18nResName3('editableImage', 'issues', 'fileIsNotAnImage')
    });
    return;
  }

  setImageForEdit(file);
  logger.debug(`(editable-image) selected files changed handler completed, ctrlKey=${ctrlKey}, count=${files?.length}`);
}

function setImage (image: IImageEntitySrc) {
  $emit('update:entitySrc', image);
}

function openFileDialog () {
  const inputEl = fileInput.value;
  if(!inputEl) {
    logger.warn(`(editable-image) file dialog not button not found, ctrlKey=${ctrlKey}`);
    return;
  }
  inputEl.value = inputEl.innerText = '';
  inputEl.click();
}

const fileInputHtmlId = useId();

defineExpose({
  setImage
});

const uiStyling = ui?.btn ? { 
  base: ui.btn.base,
  rounded: ui.btn.rounded,
  icon: { 
    base: ui.btn.icon?.base
  }
} : undefined;

watch(open, () => {
  if(!open.value) {
    onClosed();
  }
}, { immediate: false });

</script>

<template>
  <div :class="`${ui?.wrapper ?? ''}`" role="img">
    <StaticImage
      ref="static-image"
      :ctrl-key="`editableImage-${ctrlKey}`"
      :ui="ui?.image"
      :show-stub="showStub"
      :entity-src="entitySrc"
      :category="category"
      :sizes="sizes"
      :is-high-priority="isHighPriority"
      :alt-res-name="altResName"
    />
    <div :class="`relative ${ui?.btn?.wrapper ?? ''}`">
      <input
        :id="fileInputHtmlId"
        ref="file-input"
        class="hidden"
        type="file"
        name="image"
        accept="image/*"
        @change="onFileSelected"
      >
      <UButton size="lg" :icon="ui?.btn?.icon?.name ?? 'ion-cloud-upload-sharp'" :ui="uiStyling" variant="solid" color="primary" :aria-label="$t(getI18nResName2('ariaLabels', 'ariaLabelSwap'))"  @click="openFileDialog">        
        {{ btnResName ? $t(btnResName) : '' }}
      </UButton>

      <UModal
        v-model="open" 
        :ui="{ 
          container: 'items-center',
          width: 'w-full min-w-[300px] w-[calc(min(85vw,70vh))]',
          height: 'h-auto' 
        }">
        <CroppingBox 
          :ctrl-key="`${ctrlKey}-croppingBox`"
          :category="category"
          :fill-alpha="fillAlpha"
          @close="onClosed"/>
      </UModal>

      <ModalWaitingIndicator ref="modal-waiter" v-model:open="modalWaiterOpen" :ctrl-key="`${ctrlKey}-Waiter`" />
    </div>
  </div>
</template>
