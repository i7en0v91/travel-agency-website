<script setup lang="ts">
import { toShortForm, type ControlKey } from './../../helpers/components';
import { AppConfig, HeaderAppVersion, UserNotificationLevel, type Locale, type EntityId, type ILocalizableValue, type IEntityCacheItem, type IEntityCacheCityItem, getLocalizeableValue, type I18nResName, getI18nResName2 } from '@golobe-demo/shared';
import { updateTabIndices, TabIndicesUpdateDefaultTimeout } from './../../helpers/dom';
import type { SearchListItemType, ISearchListItem } from './../../types';
import type { Dropdown } from 'floating-vue';
import isArray from 'lodash-es/isArray';
import { type IListItemDto, ApiEndpointCitiesSearch } from '../../server/api-definitions';
import { usePreviewState } from './../../composables/preview-state';
import { getCommonServices } from '../../helpers/service-accessors';
import { useEntityCacheStore } from '../../stores/entity-cache-store';
import { useControlValuesStore } from '../../stores/control-values-store';

interface IProps {
  ctrlKey: ControlKey,
  type: SearchListItemType,
  persistent?: boolean,
  placeholderResName?: I18nResName,
  minSuggestionInputChars?: number,
  maxSuggestionItemsCount?: number,
  exclusionIds?: EntityId[],
  listContainerClass?: string,
  additionalQueryParams?: any,
  ariaLabelResName?: I18nResName
}
const { 
  additionalQueryParams, 
  type, 
  ctrlKey, 
  persistent = undefined,
  exclusionIds,
  maxSuggestionItemsCount = 10, 
  minSuggestionInputChars = 3
} = defineProps<IProps>();

const logger = getCommonServices().getLogger().addContextProps({ component: 'SearchListInput' });

const { locale } = useI18n();
const { enabled } = usePreviewState();

const userNotificationStore = useUserNotificationStore();
const entityCacheStore = useEntityCacheStore();
const controlValuesStore = useControlValuesStore();

const modelValue = defineModel<EntityId | null | undefined>('selectedValue');
const searchTerm = ref<string | undefined>('');
const fieldValueDisplayLabel = ref<ILocalizableValue | undefined>();
const inputField = useTemplateRef<HTMLInputElement>('input-field');
const dropdown = useTemplateRef<InstanceType<typeof Dropdown>>('dropdown');

let showOnDataChanged = false;
let popupShowCounter = 0;
let scheduledPopupShows: number[] = [];

const itemSearchUrl = computed(() => type === 'City' ? `/${ApiEndpointCitiesSearch}` : '');

defineExpose({
  setInputFocus
});

const searchTermQueryParam = ref<string | undefined>();
const { data, error, status, refresh } = await useFetch(itemSearchUrl,
  {
    method: 'get',
    server: false,
    lazy: true,
    headers: [[HeaderAppVersion, AppConfig.versioning.appVersion.toString()]],
    cache: enabled ? 'no-cache' : 'default',
    query: {
      locale,
      size: maxSuggestionItemsCount,
      onlyPopular: false,
      searchTerm: searchTermQueryParam,
      drafts: enabled,
      ...(additionalQueryParams ? additionalQueryParams : {})
    },
    immediate: false,
    transform: (response: any) => {
      const dto = response as IListItemDto[];
      if (dto || isArray(dto)) {
        logger.verbose('received list search results', { ctrlKey, count: dto.length });
      } else {
        logger.warn('request response contains empty data', undefined, { ctrlKey, url: itemSearchUrl.value });
        return undefined;
      }
      const result: ISearchListItem[] = (dto.map((t) => {
        return {
          id: t.id,
          slug: t.slug,
          displayName: t.displayName
        };
      }));
      return result;
    }
  });

const dropdownListItems = computed(() => {
  return (status.value === 'success' || status.value === 'error') ?
    data.value?.filter(d => !exclusionIds || !exclusionIds.includes(d.id)) : [];
});

async function updateCache (items: ISearchListItem[]): Promise<void> {
  if (!import.meta.client || !items.length) {
    return;
  }

  logger.debug('updating entity cache', { ctrlKey, items });

  for (let i = 0; i < items.length; i++) {
    const dto = items[i];
    let item: IEntityCacheItem;
    if (type === 'City') {
      item = {
        type: 'City',
        id: dto.id,
        slug: dto.slug,
        displayName: dto.displayName
      } as IEntityCacheCityItem;
      await entityCacheStore.set(item as IEntityCacheCityItem);
    } else {
      logger.warn('unexpected item type', undefined, { ctrlKey, type });
    }
  }
}

function onSuggestionPopupShowFired () {
  if ((searchTerm.value?.length ?? 0) >= minSuggestionInputChars) {
    showOnDataChanged = true;
    if (searchTermQueryParam.value !== searchTerm.value) {
      searchTermQueryParam.value = searchTerm.value; // will automatically trigger refresh
    } else {
      refresh();
    }
  } else {
    logger.verbose('won', { ctrlKey, ctr: popupShowCounter });
    data.value = undefined;
    cancelSuggestionPopup();
  }
}

function scheduleSuggestionPopup () {
  if (isSuggestionPopupShown()) {
    logger.debug('popup show won', ctrlKey);
    return;
  }

  popupShowCounter++;
  logger.debug('scheduling popup show', { ctrlKey, ctr: popupShowCounter });
  scheduledPopupShows.push(popupShowCounter);
  const showScheduleNumber = popupShowCounter;
  setTimeout(() => {
    if (scheduledPopupShows.includes(showScheduleNumber)) {
      logger.debug('scheduled popup show fired', { ctrlKey, ctr: showScheduleNumber });
      onSuggestionPopupShowFired();
    }
  }, AppConfig.suggestionPopupDelayMs);
}

function cancelSuggestionPopup () {
  logger.debug('hiding scheduled popup requests', ctrlKey);
  scheduledPopupShows = [];
  try {
    dropdown.value?.hide();
  } catch (err: any) { // KB: sometimes throws error on webkit
    const userAgent = (window?.navigator as any)?.userAgent;
    logger.warn('exception on hiding dropdown', err, { userAgent, ctrlKey });
  }
  setTimeout(() => updateTabIndices(), TabIndicesUpdateDefaultTimeout);
}

function onInputTextChanged () {
  let inputText = inputField.value?.value ?? '';
  logger.debug('on input text changed', { ctrlKey, text: inputText });
  inputText = inputText.trim();
  if (inputText.length >= minSuggestionInputChars) {
    searchTerm.value = inputText.trim();
    cancelSuggestionPopup();
    setTimeout(() => {
      scheduleSuggestionPopup();
    }, 0);
  } else if (inputText.length === 0) {
    cancelSuggestionPopup();
    setModelValueFromSelection(undefined);
  } else {
    cancelSuggestionPopup();
  }
}

function setInputFocus () {
  inputField.value?.focus();
}

function onMenuShown () {
  setTimeout(() => updateTabIndices(), TabIndicesUpdateDefaultTimeout);
}

function onMenuHide () {
  if (document.activeElement !== inputField.value && modelValue.value) {
    searchTerm.value = getItemDisplayText(fieldValueDisplayLabel.value);
  }
  setTimeout(() => updateTabIndices(), TabIndicesUpdateDefaultTimeout);
}

function onInputBlur () {
  if (!isSuggestionPopupShown()) {
    if (modelValue.value) {
      searchTerm.value = getItemDisplayText(fieldValueDisplayLabel.value);
    } else {
      searchTerm.value = '';
    }
    cancelSuggestionPopup();
  }
}

function isSuggestionPopupShown () {
  return (dropdown.value?.$el.className as string)?.includes('v-popper--shown') ?? false;
}

function getItemDisplayText (text?: ILocalizableValue): string | undefined {
  if (!text) {
    return undefined;
  }
  return getLocalizeableValue(text, locale.value as Locale);
}

function onEscape () {
  cancelSuggestionPopup();
}

async function setModelValueFromSelection (item?: ISearchListItem | undefined): Promise<void> {
  const itemDisplayText = getItemDisplayText(item?.displayName);
  logger.verbose('updating model value from selection', { ctrlKey, id: item?.id, text: itemDisplayText, type });
  if(item) {
    logger.debug('updating entity cache with selected value', { ctrlKey, text: itemDisplayText });
    await entityCacheStore.set({ ...item, slug: item.slug!, type });
  }
  modelValue.value = item?.id ?? null;

  logger.debug('model value updated', { ctrlKey, id: item?.id, text: itemDisplayText, type });
}

async function onActivate (item: ISearchListItem): Promise<void> {
  logger.verbose('list item activated', { ctrlKey, id: item.id, displayName: getItemDisplayText(item.displayName) });
  cancelSuggestionPopup();
  await setModelValueFromSelection(item);
}

onMounted(() => {
  logger.debug('acquiring store value ref', { ctrlKey });
  const { valueRef: storeValueRef } = controlValuesStore.acquireValueRef(ctrlKey, {
    persistent
  });

  watch(storeValueRef, () => {
    logger.debug('store value watcher', { ctrlKey, modelValue: modelValue.value, storeValue: storeValueRef.value });
    const newValue: EntityId | null = (storeValueRef.value as EntityId) ?? null;
    const changed = storeValueRef.value !== modelValue.value;
    if(changed) {
      modelValue.value = newValue;  
    }
  }, { immediate: true });

  watch([locale, fieldValueDisplayLabel], async () => {
    logger.debug('display label watcher', { ctrlKey, id: modelValue.value, type, locale: locale.value });
    if(modelValue.value) {
      searchTerm.value = getItemDisplayText(fieldValueDisplayLabel.value);
    } else {
      searchTerm.value = '';
    }
  }, { immediate: true });

  watch(modelValue, () => {
    logger.debug('model value watcher', { ctrlKey, modelValue: modelValue.value, storeValue: storeValueRef.value });
    if(modelValue.value !== storeValueRef.value) {
      storeValueRef.value = modelValue.value ?? null;
    }
  }, { immediate: false });

  watch(modelValue, async () => {
    if(modelValue.value) {
      logger.debug('obtaining display label for value', { ctrlKey, value: modelValue.value });
      const entityInfo = (await entityCacheStore.get({ ids: [modelValue.value] }, type, true))[0];
      logger.debug('updating display label for value', { ctrlKey, displayLabel: getItemDisplayText(entityInfo.displayName) });
      fieldValueDisplayLabel.value = entityInfo.displayName;
    } else {
      fieldValueDisplayLabel.value = undefined;
    }
  }, { immediate: true });

  watch(() => [modelValue.value, ...(exclusionIds ?? [])], () => {
    logger.verbose('exclusion ids list watcher', { ctrlKey, list: exclusionIds });
    if (modelValue.value && exclusionIds?.includes(modelValue.value)) {
      setModelValueFromSelection(undefined);
    }
  });

  watch(error, () => {
    if (error.value) {
      logger.warn('search request failed with exception', error.value, { ctrlKey, url: itemSearchUrl.value });
      data.value = undefined;
    }
  });

  watch(status, () => {
    logger.verbose('request fetch status changed', { ctrlKey, url: itemSearchUrl.value, status: status.value });
    if (status.value === 'success') {
      if(dropdownListItems.value?.length) {
        updateCache(data.value!);
        if(showOnDataChanged) {
          if (!isSuggestionPopupShown()) {
            logger.verbose('showing dropdown', { ctrlKey, url: itemSearchUrl.value, count: data.value!.length });
            setTimeout(() => {
              dropdown.value?.show();
              setTimeout(() => updateTabIndices(), TabIndicesUpdateDefaultTimeout);
            }, 0);
          } else {
            logger.debug('dropdown is already visible', { ctrlKey, url: itemSearchUrl.value, count: data.value!.length });
          }
          showOnDataChanged = false;
        }
      } else {
        showOnDataChanged = false;
        cancelSuggestionPopup();
      }
    } else if (status.value === 'error') {
      userNotificationStore.show({
        level: UserNotificationLevel.ERROR,
        resName: getI18nResName2('appErrors', 'unknown')
      });
    }
  });
});

</script>

<template>
  <div
    class="search-list-input"
    role="searchbox"
    :aria-label="ariaLabelResName ? $t(ariaLabelResName) : ''"
    @keyup.escape="onEscape"
  >
    <input
      :id="toShortForm(ctrlKey)"
      ref="input-field"
      type="text"
      class="search-list-input-el"
      :placeholder="placeholderResName ? $t(placeholderResName) : ''"
      :value="searchTerm ?? ''"
      :maxLength="256"
      autocomplete="off"
      @input="onInputTextChanged"
      @blur="onInputBlur"
    >
    <VDropdown
      ref="dropdown"
      v-floating-vue-hydration="{ tabIndex: 0 }"
      :ctrl-key="[...ctrlKey, 'Wrapper']"
      :aria-id="`${toShortForm(ctrlKey)}-DropDownWrapper`"
      :distance="14"
      :hide-triggers="(triggers: any) => [...triggers, 'click']"
      :show-triggers="(triggers: any) => [...triggers, 'click']"
      placement="bottom-start"
      :flip="false"
      theme="control-dropdown"
      no-auto-focus
      @apply-show="onMenuShown"
      @apply-hide="onMenuHide"
    >
      <template #popper>
        <div :class="`search-list-input-select-div ${listContainerClass}`" :data-popper-anchor="ctrlKey">
          <ClientOnly>
            <ol v-if="dropdownListItems?.length" role="select">
              <li
                v-for="(v, idx) in dropdownListItems"
                :key="`${toShortForm(ctrlKey)}-SearchRes-${idx}`"
                :class="`search-list-input-item p-xs-1 brdr-1 tabbable`"
                @click="() => { onActivate(v); }"
                @keyup.space="() => { onActivate(v); }"
                @keyup.enter="() => { onActivate(v); }"
                @keyup.escape="onEscape"
              >
                {{ (v.displayName as any)[locale] }}
              </li>
            </ol>
          </ClientOnly>
        </div>
      </template>
    </VDropdown>
  </div>
</template>
