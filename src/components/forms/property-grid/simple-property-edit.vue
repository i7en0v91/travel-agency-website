<script setup lang="ts">
import { AppConfig, validateObjectSync, maskLog, SecretValueMask, isPasswordSecure, getI18nResName2, type I18nResName } from '@golobe-demo/shared';
import type { SimplePropertyType, PropertyGridControlButtonType } from './../../../types';
import { defaultErrorHandler } from './../../../helpers/exceptions';
import { object, string } from 'yup';
import { getCommonServices } from '../../../helpers/service-accessors';
import type { UFormGroup } from '../../../.nuxt/components';

interface IProps {
  ctrlKey: string,
  validateAndSave: (value?: string) => Promise<I18nResName | 'success' | 'cancel'>,
  captionResName?: I18nResName,
  type: SimplePropertyType,
  value?: string,
  placeholderResName?: I18nResName,
  maxLength?: number,
  minLength?: number,
  required?: boolean,
  autoTrim?: boolean,
  autoClearOnEditStart?: boolean,
  isAddRowInListEdit?: boolean,
  firstControlSectionButtons?: { view: PropertyGridControlButtonType[], edit: PropertyGridControlButtonType[] } | 'default',
  lastControlSectionButtons?: { view: PropertyGridControlButtonType[], edit: PropertyGridControlButtonType[] } | 'default'
};

const props = withDefaults(defineProps<IProps>(), {
  captionResName: undefined,
  maxLength: 256,
  minLength: undefined,
  value: undefined,
  placeholderResName: undefined,
  required: false,
  autoTrim: true,
  autoClearOnEditStart: false,
  firstControlSectionButtons: 'default',
  lastControlSectionButtons: 'default'
});

const EmptyValuePlaceholder = '-';
const EmailValidationSchema = object({
  email: string().email(getI18nResName2('validations', 'email'))
});;

const logger = getCommonServices().getLogger();

const inputFormGroup = useTemplateRef('root-component');
const isEditMode = ref(false);
const editValue = ref(props.value);
const showValidationError = ref(false);

const { t } = useI18n();

const customValidationErrMsgResName = ref<I18nResName>();
const validationErrMsg = computed(() =>  {
  if(!isEditMode.value) {
    return;
  }

  let normalizedValue = editValue.value ?? '';
  if(props.autoTrim && props.type !== 'password') {
    normalizedValue = normalizedValue.trim();
  }

  if(props.required && !normalizedValue.length) {
    logger.verbose(`(SimplePropertyEdit) preliminary validation failed - field required, ctrlKey=${props.ctrlKey}`);
    return t(getI18nResName2('validations', 'required'));
  }

  if(props.minLength && normalizedValue.length < props.minLength) {
    logger.verbose(`(SimplePropertyEdit) preliminary validation failed, ctrlKey=${props.ctrlKey}, required minLength=${props.minLength}`);
    return t(getI18nResName2('validations', 'minLength'), { min: props.minLength });
  }

  if(props.type === 'email') {
    const validationResult = validateObjectSync({ email: normalizedValue }, EmailValidationSchema);
    if(validationResult?.errors?.length) {
      const errMsgResName = validationResult.errors[0] as I18nResName;
      logger.verbose(`(SimplePropertyEdit) preliminary email validation failed, ctrlKey=${props.ctrlKey}, msgResName=[${errMsgResName}]`);
      return t(errMsgResName);
    }
  }

  if (props.type === 'password') {
    if (!isPasswordSecure(normalizedValue)) {
      const errMsgResName = getI18nResName2('validations', 'password');
      logger.verbose(`(SimplePropertyEdit) preliminary password validation failed, ctrlKey=${props.ctrlKey}`);
      return t(errMsgResName, { min: AppConfig.userPasswordPolicy.minLength });
    }
  }

  if(customValidationErrMsgResName.value) {
    logger.verbose(`(SimplePropertyEdit) custom validation failed, ctrlKey=${props.ctrlKey}, msgResName=[${customValidationErrMsgResName.value}]`);
    return t(customValidationErrMsgResName.value);
  }
  
  return undefined;
});

const firstSectionButtons = computed<PropertyGridControlButtonType[]>(() => props.firstControlSectionButtons === 'default' ? (isEditMode.value ? ['cancel'] : []) : (isEditMode.value ? props.firstControlSectionButtons.edit : props.firstControlSectionButtons.view));
const lastSectionButtons = computed<PropertyGridControlButtonType[]>(() => props.lastControlSectionButtons === 'default' ? (isEditMode.value ? ['apply'] : ['change']) : (isEditMode.value ? props.lastControlSectionButtons.edit : props.lastControlSectionButtons.view));

function focusInput () {
  if (inputFormGroup?.value) {
    (inputFormGroup.value.$el as HTMLElement).querySelector('input')?.focus();
  }
}

function maskLogValue (value?: string) {
  if (props.type === 'password') {
    return SecretValueMask;
  }
  return maskLog(value);
}

async function performValidateAndSave (value?: string) : Promise<boolean> {
  logger.verbose(`(SimplePropertyEdit) validating and saving value, ctrlKey=${props.ctrlKey}, value=${maskLogValue(value)}`);
  customValidationErrMsgResName.value = undefined;

  if(validationErrMsg.value) {
    logger.verbose(`(SimplePropertyEdit) validating and saving value - preliminary validation failed, ctrlKey=${props.ctrlKey}, errMsg=${validationErrMsg.value}`);
    return false;
  }
  
  try {
    logger.verbose(`(SimplePropertyEdit) calling client save handler, ctrlKey=${props.ctrlKey}, value=${maskLogValue(value)}`);
    const validationResult = await props.validateAndSave(value);
    if (validationResult === 'cancel') {
      logger.verbose(`(SimplePropertyEdit) client save handler cancelled, ctrlKey=${props.ctrlKey}, value=${maskLogValue(value)}`);
      return false;
    }
    customValidationErrMsgResName.value = validationResult === 'success' ? undefined : validationResult;
    logger.verbose(`(SimplePropertyEdit) client save handler result, ctrlKey=${props.ctrlKey}, errMsgResName=${customValidationErrMsgResName.value}`);
  } catch (err: any) {
    logger.warn(`(SimplePropertyEdit) client save handler failed, ctrlKey=${props.ctrlKey}, value=${maskLogValue(value)}`, err);
    exitEditModeInternal();
    defaultErrorHandler(err);
    return false;
  }
  
  const result = !validationErrMsg.value;
  logger.verbose(`(SimplePropertyEdit) value validation result, ctrlKey=${props.ctrlKey}, value=${maskLogValue(value)}, result=${result}`);
  return result;
}

async function onControlButtonClick (button: PropertyGridControlButtonType): Promise<void> {
  logger.debug(`(SimplePropertyEdit) onControlButtonClick, ctrlKey=${props.ctrlKey}, button=${button}`);
  switch (button) {
    case 'add':
    case 'change':
      if (!isEditMode.value) {
        editValue.value = props.value;
        if (props.type === 'password' || props.autoClearOnEditStart) {
          editValue.value = '';
        }
        showValidationError.value = false;
        customValidationErrMsgResName.value = undefined;
        isEditMode.value = true;
        $emit('enterEditMode', props.ctrlKey);
        nextTick(() => {
          focusInput();
        });
      }
      break;
    case 'apply':
      if (props.autoTrim) {
        editValue.value = editValue.value?.trim();
        logger.debug(`(SimplePropertyEdit) value trimmed, ctrlKey=${props.ctrlKey}, newValue=${maskLogValue(editValue.value)}`);
      }

      showValidationError.value = true;
      if (await performValidateAndSave(editValue.value)) {
        logger.verbose(`(SimplePropertyEdit) value updated, ctrlKey=${props.ctrlKey}, value=${maskLogValue(editValue.value)}, prev=${props.value}`);
        $emit('update:value', editValue.value);
        isEditMode.value = false;
      }
      break;
    case 'cancel':
      exitEditModeInternal();
      break;
  }

  $emit('buttonClick', button);
}

function exitEditMode () {
  if (isEditMode.value) {
    logger.debug(`(SimplePropertyEdit) exiting edit mode, ctrlKey=${props.ctrlKey}`);
    editValue.value = props.value;
    isEditMode.value = false;
    showValidationError.value = false;
    customValidationErrMsgResName.value = undefined;
  }
}

function exitEditModeInternal () {
  if (isEditMode.value) {
    exitEditMode();
  }
}

const $emit = defineEmits<{
  (event: 'update:value', value: string | undefined): void, (event: 'enterEditMode', ctrlKey: string): void, 
  (event: 'buttonClick', button: PropertyGridControlButtonType): void
}>();

defineExpose({
  exitEditMode
});

const uiGroupStyling = computed(() => {
  return {
    wrapper: `${props.isAddRowInListEdit && !isEditMode.value ? 'hidden' : ''}`,
    container: 'mt-0',
    label: {
      wrapper: isEditMode.value ? 'hidden' : undefined
    }
  };
});

const uiInputStyling = computed(() => {
  return {
    base: `h-[3.5rem] ${isEditMode.value ? undefined : 'hidden'}`,
    rounded: 'rounded-lg',
    variant: {
      none: 'text-xl font-semibold ring-4 ring-inset ring-primary-300 dark:ring-primary-600 focus:ring-4 focus:ring-primary-300 focus:dark:ring-primary-600 focus:ring-inset',
      outline: validationErrMsg.value ? undefined : 'ring-0 focus:ring-0'
    }
  };
});

</script>

<template>
  <div class="contents">
    <div class="w-full h-auto overflow-auto">
      <UFormGroup ref="root-component" :name="props.type" :label="props.captionResName ? t(props.captionResName) : undefined" :ui="uiGroupStyling" :error="showValidationError && validationErrMsg">
        <UInput 
          v-model:="editValue" 
          :type="type" 
          color="gray"
          variant="none"
          :placeholder="placeholderResName ? t(placeholderResName) : undefined" 
          :disabled="!isEditMode" 
          :max-length="props.maxLength"
          :ui="uiInputStyling"
          @keypress.enter="() => { if(isEditMode) { onControlButtonClick('apply'); } }"
          @keyup.escape="() => { if(isEditMode) { exitEditModeInternal(); } }"
        />
        <div v-if="!isEditMode" class="truncate text-xl font-semibold">
          {{ props.type === 'password' ? SecretValueMask : ((props.value?.length ?? 0) > 0 ? props.value : EmptyValuePlaceholder) }}
        </div>
      </UFormGroup>
    </div>
    <div class="flex flex-row flex-nowrap gap-2 sm:gap-4 justify-self-end">
      <div class="flex-1">
        <PropertyGridControlSection :ctrl-key="`${props.ctrlKey}-firstControlSection`" :buttons="firstSectionButtons" @click="onControlButtonClick" />
      </div>
      <div class="flex-1">
        <PropertyGridControlSection :ctrl-key="`${props.ctrlKey}-lastControlSection`" :buttons="lastSectionButtons" @click="onControlButtonClick" />
      </div>
    </div>
  </div>
  </template>
