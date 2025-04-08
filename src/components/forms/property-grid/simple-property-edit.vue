<script setup lang="ts">
import type { ControlKey } from './../../../helpers/components';
import { maskLog, SecretValueMask, isPasswordSecure, getI18nResName2, type I18nResName } from '@golobe-demo/shared';
import { TabIndicesUpdateDefaultTimeout, updateTabIndices } from './../../../helpers/dom';
import type { SimplePropertyType, PropertyGridControlButtonType } from './../../../types';
import { defaultErrorHandler } from './../../../helpers/exceptions';
import { useVuelidate } from '@vuelidate/core';
import * as validators from '@vuelidate/validators';
import { email as vEmail, required as vRequired, minLength as vMinLength } from '@vuelidate/validators';
import PropertyGridRow from './property-grid-row.vue';
import TextBox from './../../forms/text-box.vue';
import { getCommonServices } from '../../../helpers/service-accessors';

interface IProps {
  ctrlKey: ControlKey,
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

const logger = getCommonServices().getLogger().addContextProps({ component: 'SimplePropertyEdit' });

const rootComponent = useTemplateRef('root-component');
const isEditMode = ref(false);
const customValidationErrMsgResName = ref<string | undefined>();
const editValue = ref(props.value);

const nuxtApp = useNuxtApp();
const userNotificationStore = useUserNotificationStore();
const { t } = useI18n();
const { createI18nMessage } = validators;
const withI18nMessage = createI18nMessage({ t });
const rules = computed(() => ({
  editValue: {
    validator: withI18nMessage(() => { return (customValidationErrMsgResName.value?.length ?? 0) === 0; }, { messagePath: () => customValidationErrMsgResName.value! }),
    ...(props.minLength ? { minLength: withI18nMessage(vMinLength(8)) } : {}),
    ...(props.required ? { required: withI18nMessage(vRequired, { messagePath: () => 'validations.required' }) } : {}),
    ...(props.type === 'email' ? { email: withI18nMessage(vEmail) } : {})
  }
}));
const v$ = useVuelidate(rules, { editValue, $lazy: true });

const firstSectionButtons = computed<PropertyGridControlButtonType[]>(() => props.firstControlSectionButtons === 'default' ? (isEditMode.value ? ['cancel'] : []) : (isEditMode.value ? props.firstControlSectionButtons.edit : props.firstControlSectionButtons.view));
const lastSectionButtons = computed<PropertyGridControlButtonType[]>(() => props.lastControlSectionButtons === 'default' ? (isEditMode.value ? ['apply'] : ['change']) : (isEditMode.value ? props.lastControlSectionButtons.edit : props.lastControlSectionButtons.view));

function focusInput () {
  if (rootComponent?.value) {
    (rootComponent.value.$el as HTMLElement).querySelector('input')?.focus();
  }
}

function maskLogValue (value?: string) {
  if (props.type === 'password') {
    return SecretValueMask;
  }
  return maskLog(value);
}

async function performValidateAndSave (value?: string) : Promise<boolean> {
  logger.verbose('validating and saving value', { ctrlKey: props.ctrlKey, value: maskLogValue(value) });
  customValidationErrMsgResName.value = undefined;

  v$.value.$touch();
  if (!v$.value.$error) {
    if ((value ?? '') === (props.value ?? '')) {
      logger.debug('value has not changed', { ctrlKey: props.ctrlKey, newValue: maskLogValue(editValue.value) });
      exitEditModeInternal();
      return false;
    }

    if (props.type === 'password' && (value?.length ?? 0) > 0) {
      if (!isPasswordSecure(value!)) {
        customValidationErrMsgResName.value = getI18nResName2('validations', 'password');
      }
    }

    if (!customValidationErrMsgResName.value) {
      try {
        logger.verbose('calling client save handler', { ctrlKey: props.ctrlKey, value: maskLogValue(value) });
        const validationResult = await props.validateAndSave(value);
        if (validationResult === 'cancel') {
          logger.verbose('client save handler cancelled', { ctrlKey: props.ctrlKey, value: maskLogValue(value) });
          return false;
        }
        customValidationErrMsgResName.value = validationResult === 'success' ? undefined : validationResult;
        logger.verbose('client save handler result', { ctrlKey: props.ctrlKey, errMsgResName: customValidationErrMsgResName.value });
      } catch (err: any) {
        logger.warn('client save handler failed', err, { ctrlKey: props.ctrlKey, value: maskLogValue(value) });
        exitEditModeInternal();
        defaultErrorHandler(err, { nuxtApp, userNotificationStore });
        return false;
      }
    }

    if (customValidationErrMsgResName.value) {
      v$.value.$touch();
    }
  }

  const result = !v$.value.$error;
  logger.verbose('value validation result', { ctrlKey: props.ctrlKey, value: maskLogValue(value), result });
  return result;
}

async function onControlButtonClick (button: PropertyGridControlButtonType): Promise<void> {
  logger.debug('onControlButtonClick', { ctrlKey: props.ctrlKey, button });
  switch (button) {
    case 'add':
    case 'change':
      if (!isEditMode.value) {
        editValue.value = props.value;
        if (props.type === 'password' || props.autoClearOnEditStart) {
          editValue.value = '';
        }
        isEditMode.value = true;
        v$.value.$reset();
        $emit('enterEditMode', props.ctrlKey);
        nextTick(() => {
          focusInput();
          setTimeout(() => updateTabIndices(), TabIndicesUpdateDefaultTimeout);
        });
      }
      break;
    case 'apply':
      if (props.autoTrim) {
        editValue.value = editValue.value?.trim();
        logger.debug('value trimmed', { ctrlKey: props.ctrlKey, newValue: maskLogValue(editValue.value) });
      }

      if (await performValidateAndSave(editValue.value)) {
        logger.verbose('value updated', { ctrlKey: props.ctrlKey, value: maskLogValue(editValue.value), prev: props.value });
        $emit('update:value', editValue.value);
        isEditMode.value = false;
        setTimeout(() => updateTabIndices(), TabIndicesUpdateDefaultTimeout);
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
    logger.debug('exiting edit mode', { ctrlKey: props.ctrlKey });
    editValue.value = props.value;
    isEditMode.value = false;
    v$.value.$reset();
  }
}

function exitEditModeInternal () {
  if (isEditMode.value) {
    exitEditMode();
    setTimeout(() => updateTabIndices(), TabIndicesUpdateDefaultTimeout);
  }
}

const $emit = defineEmits<{(event: 'update:value', value: string | undefined): void, (event: 'enterEditMode', ctrlKey: ControlKey): void,
(event: 'buttonClick', button: PropertyGridControlButtonType): void}>();

defineExpose({
  exitEditMode
});

onMounted(() => {
  watch(() => props.value, () => {
    logger.debug('model value watch handler', { ctrlKey: props.ctrlKey, modelValue: props.value, editMode: isEditMode.value });
    if(!isEditMode.value) {
      editValue.value = props.value;
    }
  }, { immediate: false });
});

</script>

<template>
  <PropertyGridRow
    ref="root-component"
    class="simple-property-edit"
    :ctrl-key="[...ctrlKey, 'Row']"
    :first-control-section-buttons="firstSectionButtons"
    :last-control-section-buttons="lastSectionButtons"
    @button-click="onControlButtonClick"
  >
    <template #value>
      <TextBox
        v-if="isEditMode"
        v-model:model-value="editValue"
        :ctrl-key="[...ctrlKey, 'Input']"
        class="simple-property-input mr-xs-2 mr-s-4"
        :type="type"
        :placeholder-res-name="props.placeholderResName"
        :max-length="props.maxLength"
        @keypress.enter="() => { if(isEditMode) { onControlButtonClick('apply'); } }"
        @keyup.escape="() => { if(isEditMode) { exitEditModeInternal(); } }"
      />
      <div v-else class="simple-property-view">
        <div v-if="props.captionResName" class="property-view-caption">
          {{ $t(props.captionResName) }}
        </div>
        <div class="property-view-value mt-xs-2">
          {{ props.type === 'password' ? SecretValueMask : ((props.value?.length ?? 0) > 0 ? props.value : EmptyValuePlaceholder) }}
        </div>
      </div>
    </template>
    <template #errors>
      <div v-if="v$.editValue.$errors.length" class="input-errors">
        <div class="form-error-msg">
          {{ v$.editValue.$errors[0].$message }}
        </div>
      </div>
    </template>
  </PropertyGridRow>
</template>
