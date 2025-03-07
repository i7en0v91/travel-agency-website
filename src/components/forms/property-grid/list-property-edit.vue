<script setup lang="ts">
import { toShortForm, type ControlKey } from './../../../helpers/components';
import { AppException, AppExceptionCodeEnum, maskLog, MaxListPropertyElementsCount, UserNotificationLevel, getI18nResName2, type I18nResName } from '@golobe-demo/shared';
import type { SimplePropertyType, PropertyGridControlButtonType, ConfirmBoxButton } from './../../../types';
import range from 'lodash-es/range';
import SimplePropertyEdit from './../../forms/property-grid/simple-property-edit.vue';
import PropertyGrid from './../../forms/property-grid/property-grid.vue';
import ConfirmBox from '../confirm-box.vue';
import { useConfirmDialogResult } from '../../../composables/modal-dialog-result';
import { getCommonServices } from '../../../helpers/service-accessors';

interface IProps {
  ctrlKey: ControlKey,
  captionResName: I18nResName,
  type: Exclude<SimplePropertyType, 'password'>,
  validateAndSave: (newValues: (string | undefined)[], currentValues: (string | undefined)[], op: 'add' | 'change' | 'delete', propIdx: number | 'add', newValue?: string) => Promise<I18nResName | 'success' | 'cancel'>,
  placeholderResName?: I18nResName,
  values: (string | undefined)[],
  maxElementsCount: number,
  maxLength?: number,
  minLength?: number,
  required?: boolean,
  autoTrim?: boolean
};

const { 
  validateAndSave, 
  values, 
  ctrlKey, 
  maxElementsCount, 
  autoTrim = true, 
  required = false, 
  maxLength = 256 
} = defineProps<IProps>();

const logger = getCommonServices().getLogger().addContextProps({ component: 'ListPropertyEdit' });
const userNotificationStore = useUserNotificationStore();

if (maxElementsCount > MaxListPropertyElementsCount) {
  logger.error('list property size exceeded maximum allowed', undefined, { ctrlKey, size: maxElementsCount });
  throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'list property size exceeded maximum allowed', 'error-page');
}
const propList = useTemplateRef('prop-list');
const propAdd = useTemplateRef('prop-add');
const confirmBoxRef = useTemplateRef('confirm-box');  
const confirmBoxButtons: ConfirmBoxButton[] = ['yes', 'no'];
const editValues = range(0, maxElementsCount).map((idx: number) => ref<string | undefined>(values[idx]));
const addingNewValue = ref<string | undefined>('');
const open = ref(false);
const result = ref<ConfirmBoxButton>();
const confirmMsgBoxParam = ref<{ itemText: string }>({ itemText: '' });

function getPropertyComponent (propIdx: number) {
  if (propIdx >= maxElementsCount) {
    return undefined;
  }
  // KB: using this "special" way of accessing component instance as a workaround.
  // KB: was not able to to do this in a standard way, probably because of dynamic ref array (propList) for property components
  return (propList.value && propList.value.length > propIdx) ? propList.value[propIdx] : undefined;
}

function applyValuesOperation (currentValues: (string | undefined)[], op: 'add' | 'change' | 'delete', propIdx: number | 'add', value?: string): (string | undefined)[] {
  let newValues: (string | undefined)[] = currentValues.slice(0, currentValues.length);
  switch (op) {
    case 'change':
      if (propIdx !== 'add' && (propIdx ?? 0) < currentValues.length) {
        newValues = currentValues.slice(0, currentValues.length);
        newValues[propIdx!] = value;
      } else {
        logger.warn('property index out of range (change', undefined, { ctrlKey, op, propIdx, value: maskLog(value) });
        throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'property index out of range', 'error-stub');
      }
      break;
    case 'add':
      newValues.push(value);
      break;
    case 'delete':
      if (propIdx !== 'add' && propIdx < currentValues.length) {
        newValues.splice(propIdx!, 1);
      } else {
        logger.warn('property index out of range (delete', undefined, { ctrlKey, op, propIdx, value: maskLog(value) });
        throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'property index out of range', 'error-stub');
      }
      break;
    default:
      logger.error('unexpected operation type', undefined, { ctrlKey, op, propIdx, value: maskLog(value) });
      throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'unexpected operation type', 'error-page');
  }
  return newValues;
}

async function onValidateAndSave (op: 'add' | 'change' | 'delete', propIdx: number | 'add', value?: string): Promise<I18nResName | 'success' | 'cancel'> {
  logger.verbose('calling client save handler', { ctrlKey, op, propIdx, value: maskLog(value) });
  const currentValues = values.slice(0, values.length);
  const newValues = applyValuesOperation(currentValues, op, propIdx, value);
  if (newValues.length > maxElementsCount) {
    return getI18nResName2('validations', 'maximumNumberOfRecordsReached');
  }
  const result = await validateAndSave(newValues, currentValues, op, propIdx, value);
  logger.verbose('client save handler result', { ctrlKey, propIdx, value: maskLog(value), errMsgResName: result });
  return result;
}

function onPropertyEnterEditMode (propIdx: number | 'add') {
  logger.debug('property entered edit mode', { ctrlKey, propIdx });
  for (let i = 0; i < maxElementsCount; i++) {
    if (propIdx === 'add' || i !== propIdx) {
      getPropertyComponent(i)?.exitEditMode();
    }
  }
  if (propIdx !== 'add') {
    propAdd.value?.exitEditMode();
  }
  $emit('enterEditMode', ctrlKey);
}

function handleItemValueChange (op: 'add' | 'delete' | 'change', propIdx: number | 'add', value?: string) {
  logger.verbose('handling value change', { ctrlKey, op, propIdx, value: maskLog(value) });
  // to this moment everything has been already validated & saved by respective SimplePropertyEdit, here need just to trigger component rerender
  const currentValues = values.slice(0, values.length);
  const newValues = applyValuesOperation(currentValues, op, propIdx, value);
  switch (op) {
    case 'add':
      if (value && values.length < maxElementsCount) {
        editValues[values.length].value = value;
      }
      addingNewValue.value = '';
      break;
    case 'delete':
      for (let i = (propIdx as number) + 1; i < currentValues.length; i++) {
        editValues[i - 1].value = editValues[i].value;
      }
      if (propIdx === 0 && currentValues.length === 1) {
        editValues[0].value = undefined;
      }
      break;
  }
  $emit('update:values', newValues);
}

async function onControlButtonClick (button: PropertyGridControlButtonType, propIdx: number | 'add'): Promise<void> {
  logger.debug('onControlButtonClick', { ctrlKey, button, propIdx });
  if (button === 'delete') {
    if (propIdx === 'add') {
      logger.error('invalid property index in control button click handler', undefined, { ctrlKey, button, propIdx });
      throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'invalid property index', 'error-stub');
    }
    onPropertyEnterEditMode(propIdx);
    const itemText = editValues[propIdx].value;
    confirmMsgBoxParam.value = { itemText : itemText ?? '' };
    const confirmBox = useConfirmDialogResult(
      confirmBoxRef, 
      { open, result }, 
      confirmBoxButtons, 
      'cancel', 
      getI18nResName2('propertyGrid', 'deleteConfirmMsg'), 
      confirmMsgBoxParam.value
    );
    const msgBoxResult = await confirmBox.show();
    if (msgBoxResult === 'yes') {
      const result = await onValidateAndSave('delete', propIdx, undefined);
      if (result === 'success') {
        handleItemValueChange('delete', propIdx, undefined);
      } else if (result !== 'cancel') {
        userNotificationStore.show({
          level: UserNotificationLevel.WARN,
          resName: result
        });
      }
    }
  } else if (button === 'add') {
    addingNewValue.value = '';
  }
}

function exitEditMode () {
  for (let i = 0; i < maxElementsCount; i++) {
    getPropertyComponent(i)?.exitEditMode();
  }
  propAdd.value?.exitEditMode();
}

const $emit = defineEmits<{(event: 'update:values', values: (string | undefined)[]): void, (event: 'enterEditMode', ctrlKey: ControlKey): void}>();

defineExpose({
  exitEditMode
});

</script>

<template>
  <div class="contents">
    <PropertyGrid :ctrl-key="[...ctrlKey, 'PropGrid']">
      <SimplePropertyEdit
        v-for="(v, idx) in values"
        :key="`${toShortForm(ctrlKey)}-v${idx}`"
        ref="prop-list"
        v-model:value="editValues[idx].value"
        :ctrl-key="[...ctrlKey, 'PropGrid', 'PropEdit', idx]"
        :type="type"
        :caption-res-name="captionResName"
        :placeholder-res-name="placeholderResName"
        :max-length="maxLength"
        :min-length="minLength"
        :auto-trim="autoTrim"
        :required="required"
        :validate-and-save="async (value?: string) => { return await onValidateAndSave('change', idx, value); }"
        :first-control-section-buttons="{ view: ['delete'], edit: ['cancel'] }"
        :last-control-section-buttons="{ view: ['change'], edit: ['apply'] }"
        @enter-edit-mode="() => onPropertyEnterEditMode(idx)"
        @update:value="(value?: string) => handleItemValueChange('change', idx, value)"
        @button-click="(button: PropertyGridControlButtonType) => onControlButtonClick(button, idx)"
      />
      <SimplePropertyEdit
        v-if="values.length < maxElementsCount"
        :key="`${toShortForm(ctrlKey)}-Add`"
        ref="prop-add"
        v-model:value="addingNewValue"
        :ctrl-key="[...ctrlKey, 'PropGrid', 'PropEdit', 'Add']"
        :type="type"
        :caption-res-name="captionResName"
        :placeholder-res-name="placeholderResName"
        :max-length="maxLength"
        :min-length="minLength"
        :auto-trim="autoTrim"
        :required="required"
        :is-add-row-in-list-edit="true"
        :auto-clear-on-edit-start="true"
        :validate-and-save="async (value?: string) => { return await onValidateAndSave('add', 'add', value); }"
        :first-control-section-buttons="{ view: [], edit: ['cancel'] }"
        :last-control-section-buttons="{ view: ['add'], edit: ['apply'] }"
        @enter-edit-mode="() => onPropertyEnterEditMode('add')"
        @update:value="(value?: string) => handleItemValueChange('add', 'add', value)"
        @button-click="(button: PropertyGridControlButtonType) => onControlButtonClick(button, 'add')"
      />
    </PropertyGrid>
    <ConfirmBox ref="confirm-box" v-model:open="open" v-model:result="result" :ctrl-key="[...ctrlKey, 'Delete', 'ConfirmBox']" :buttons="confirmBoxButtons" :msg-res-name="getI18nResName2('propertyGrid', 'deleteConfirmMsg')" :msg-res-args="confirmMsgBoxParam"/>
  </div>
</template>
