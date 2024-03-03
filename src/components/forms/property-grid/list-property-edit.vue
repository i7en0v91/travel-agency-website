<script setup lang="ts">

import range from 'lodash-es/range';
import SimplePropertyEdit from './../../forms/property-grid/simple-property-edit.vue';
import PropertyGrid from './../../forms/property-grid/property-grid.vue';
import { updateTabIndices } from './../../../shared/dom';
import { getI18nResName2, type I18nResName } from './../../../shared/i18n';
import { type SimplePropertyType, type PropertyGridControlButtonType } from './../../../shared/interfaces';
import { MaxListPropertyElementsCount, UserNotificationLevel, TabIndicesUpdateDefaultTimeout } from './../../../shared/constants';
import { maskLog } from './../../../shared/applogger';
import { AppException, AppExceptionCodeEnum } from './../../../shared/exceptions';
import { useConfirmBox } from './../../../composables/confirm-box';

interface IProps {
  ctrlKey: string,
  captionResName: I18nResName,
  type: Exclude<SimplePropertyType, 'password'>,
  validateAndSave: (newValues: (string | undefined)[], currentValues: (string | undefined)[], op: 'add' | 'change' | 'delete', propIdx: number | 'add', newValue?: string) => Promise<I18nResName | 'success'>,
  placeholderResName?: I18nResName,
  values: (string | undefined)[],
  maxElementsCount: number,
  maxLength?: number,
  minLength?: number,
  required?: boolean,
  autoTrim?: boolean
};

const props = withDefaults(defineProps<IProps>(), {
  maxLength: 256,
  minLength: undefined,
  placeholderResName: undefined,
  required: false,
  autoTrim: true
});

const logger = CommonServicesLocator.getLogger();
const confirmBox = useConfirmBox();
const userNotificationStore = useUserNotificationStore();

if (props.maxElementsCount > MaxListPropertyElementsCount) {
  logger.error(`(ListPropertyEdit) list property size exceeded maximum allowed, ctrlKey=${props.ctrlKey}, size=${props.maxElementsCount}`);
  throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'list property size exceeded maximum allowed', 'error-page');
}
const propList: Ref<InstanceType<typeof SimplePropertyEdit> | undefined>[] = range(0, props.maxElementsCount).map(() => { return ref<InstanceType<typeof SimplePropertyEdit> | undefined>(); });
const propAdd = ref<InstanceType<typeof SimplePropertyEdit>>();
const editValues = range(0, props.maxElementsCount).map((idx: number) => ref<string | undefined>(props.values[idx]));
const addingNewValue = ref<string | undefined>('');

function getPropertyComponent (propIdx: number): InstanceType<typeof SimplePropertyEdit> | undefined {
  if (propIdx >= props.maxElementsCount) {
    return undefined;
  }
  // KB: using this "special" way of accessing component instance as a workaround.
  // KB: was not able to to do this in a standard way, probably because of dynamic ref array (propList) for property components
  return propList[propIdx].value ? (((propList[propIdx].value as any)[0] as any) as InstanceType<typeof SimplePropertyEdit>) : undefined;
}

function applyValuesOperation (currentValues: (string | undefined)[], op: 'add' | 'change' | 'delete', propIdx: number | 'add', value?: string): (string | undefined)[] {
  let newValues: (string | undefined)[] = currentValues.slice(0, currentValues.length);
  switch (op) {
    case 'change':
      if (propIdx !== 'add' && (propIdx ?? 0) < currentValues.length) {
        newValues = currentValues.slice(0, currentValues.length);
        newValues[propIdx!] = value;
      } else {
        logger.warn(`(ListPropertyEdit) property index out of range, ctrlKey=${props.ctrlKey}, op=${op}, propIdx=${propIdx}, value=${maskLog(value)}`);
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
        logger.warn(`(ListPropertyEdit) property index out of range, ctrlKey=${props.ctrlKey}, op=${op}, propIdx=${propIdx}, value=${maskLog(value)}`);
        throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'property index out of range', 'error-stub');
      }
      break;
    default:
      logger.error(`(ListPropertyEdit) unexpected operation type, ctrlKey=${props.ctrlKey}, op=${op}, propIdx=${propIdx}, value=${maskLog(value)}`);
      throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'unexpected operation type', 'error-page');
  }
  return newValues;
}

async function onValidateAndSave (op: 'add' | 'change' | 'delete', propIdx: number | 'add', value?: string): Promise<I18nResName | 'success'> {
  logger.verbose(`(ListPropertyEdit) calling client save handler: ctrlKey=${props.ctrlKey}, op=${op}, propIdx=${propIdx}, value=${maskLog(value)}`);
  const currentValues = props.values.slice(0, props.values.length);
  const newValues = applyValuesOperation(currentValues, op, propIdx, value);
  if (newValues.length > props.maxElementsCount) {
    return getI18nResName2('validations', 'maximumNumberOfRecordsReached');
  }
  const result = await props.validateAndSave(newValues, currentValues, op, propIdx, value);
  logger.verbose(`(ListPropertyEdit) client save handler result: ctrlKey=${props.ctrlKey}, propIdx=${propIdx}, value=${maskLog(value)}, errMsgResName=${result}`);
  return result;
}

function onPropertyEnterEditMode (propIdx: number | 'add') {
  logger.debug(`(ListPropertyEdit) property entered edit mode: ctrlKey=${props.ctrlKey}, propIdx=${propIdx}`);
  for (let i = 0; i < props.maxElementsCount; i++) {
    if (propIdx === 'add' || i !== propIdx) {
      getPropertyComponent(i)?.exitEditMode();
    }
  }
  if (propIdx !== 'add') {
    propAdd.value?.exitEditMode();
  }
  $emit('enterEditMode', props.ctrlKey);
}

function handleItemValueChange (op: 'add' | 'delete' | 'change', propIdx: number | 'add', value?: string) {
  logger.verbose(`(ListPropertyEdit) handling value change: ctrlKey=${props.ctrlKey}, op=${op}, propIdx=${propIdx}, value=${maskLog(value)}`);
  // to this moment everything has been already validated & saved by respective SimplePropertyEdit, here need just to trigger component rerender
  const currentValues = props.values.slice(0, props.values.length);
  const newValues = applyValuesOperation(currentValues, op, propIdx, value);
  switch (op) {
    case 'add':
      if (value && props.values.length < props.maxElementsCount) {
        editValues[props.values.length].value = value;
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
  logger.debug(`(ListPropertyEdit) onControlButtonClick, ctrlKey=${props.ctrlKey}, button=${button}, propIdx=${propIdx}`);
  if (button === 'delete') {
    if (propIdx === 'add') {
      logger.error(`(ListPropertyEdit) invalid property index in control button click handler, ctrlKey=${props.ctrlKey}, button=${button}, propIdx=${propIdx}`);
      throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'invalid property index', 'error-stub');
    }
    onPropertyEnterEditMode(propIdx);
    const itemText = editValues[propIdx].value;
    const result = await confirmBox.confirm(`${props.ctrlKey}-DeleteConfirm`, ['yes', 'no'], getI18nResName2('propertyGrid', 'deleteConfirmMsg'), { itemText });
    if (result === 'yes') {
      const result = await onValidateAndSave('delete', propIdx, undefined);
      if (result === 'success') {
        handleItemValueChange('delete', propIdx, undefined);
        nextTick(() => {
          setTimeout(() => updateTabIndices(), TabIndicesUpdateDefaultTimeout);
        });
      } else {
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
  for (let i = 0; i < props.maxElementsCount; i++) {
    getPropertyComponent(i)?.exitEditMode();
  }
  propAdd.value?.exitEditMode();
}

const $emit = defineEmits<{(event: 'update:values', values: (string | undefined)[]): void, (event: 'enterEditMode', ctrlKey: string): void}>();

defineExpose({
  exitEditMode
});

</script>

<template>
  <PropertyGrid :ctrl-key="`${props.ctrlKey}-propGrid`" class="list-property-edit">
    <SimplePropertyEdit
      v-for="(v, idx) in values"
      :key="`${props.ctrlKey}-v${idx}`"
      :ref="propList[idx]"
      v-model:value="editValues[idx].value"
      :ctrl-key="`${props.ctrlKey}-v${idx}`"
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
      :key="`${props.ctrlKey}-Add`"
      ref="propAdd"
      v-model:value="addingNewValue"
      :ctrl-key="`${props.ctrlKey}-Add`"
      :type="type"
      class="list-property-edit-add"
      :caption-res-name="captionResName"
      :placeholder-res-name="placeholderResName"
      :max-length="maxLength"
      :min-length="minLength"
      :auto-trim="autoTrim"
      :required="required"
      :auto-clear-on-edit-start="true"
      :validate-and-save="async (value?: string) => { return await onValidateAndSave('add', 'add', value); }"
      :first-control-section-buttons="{ view: [], edit: ['cancel'] }"
      :last-control-section-buttons="{ view: ['add'], edit: ['apply'] }"
      @enter-edit-mode="() => onPropertyEnterEditMode('add')"
      @update:value="(value?: string) => handleItemValueChange('add', 'add', value)"
      @button-click="(button: PropertyGridControlButtonType) => onControlButtonClick(button, 'add')"
    />
  </PropertyGrid>
</template>
