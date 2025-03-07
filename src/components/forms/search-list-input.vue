<script setup lang="ts">
import { toShortForm, type ControlKey } from './../../helpers/components';
import { AppConfig, UserNotificationLevel, type Locale, type EntityId, type ILocalizableValue, type IEntityCacheItem, type IEntityCacheCityItem, getLocalizeableValue, type I18nResName, getI18nResName2 } from '@golobe-demo/shared';
import type { SearchListItemType, ISearchListItem } from './../../types';
import { getObject } from './../../helpers/rest-utils';
import isArray from 'lodash-es/isArray';
import { type IListItemDto, ApiEndpointCitiesSearch } from '../../server/api-definitions';
import { usePreviewState } from './../../composables/preview-state';
import { getCommonServices } from '../../helpers/service-accessors';
import { useEntityCacheStore } from '../../stores/entity-cache-store';
import { useControlValuesStore, type ControlStoreValue } from '../../stores/control-values-store';

interface IProps {
  ctrlKey: ControlKey,
  type: SearchListItemType,
  persistent?: boolean,
  placeholderResName?: I18nResName,
  minSuggestionInputChars?: number,
  maxSuggestionItemsCount?: number,
  exclusionIds?: EntityId[],
  additionalQueryParams?: any,
  ariaLabelResName?: I18nResName
}
const { 
  additionalQueryParams, 
  type, 
  persistent = undefined,
  exclusionIds,
  ctrlKey, 
  maxSuggestionItemsCount = 10, 
  minSuggestionInputChars = 3 
} = defineProps<IProps>();

const { locale } = useI18n();
const { enabled } = usePreviewState();

const logger = getCommonServices().getLogger().addContextProps({ component: 'SearchListInput' });

const userNotificationStore = useUserNotificationStore();
const entityCacheStore = useEntityCacheStore();
const controlValuesStore = useControlValuesStore();

const modelValue = defineModel<EntityId | null | undefined>('selectedValue');
const selectedMenuItem = ref<ISearchListItem & { label: string } | undefined>();
const fetchInProgress = ref(false);

const itemSearchUrl = computed(() => type === 'City' ? `/${ApiEndpointCitiesSearch}` : '');

defineExpose({
  setInputFocus
});

function setInputFocus () {
  const inputEl = document.querySelector(`[data-ctrlkey="${toShortForm(ctrlKey)}"]`) as HTMLElement;
  if(!inputEl) {
    logger.warn('cannot set focus, input element not found', undefined, ctrlKey);
    return;
  }
  
  logger.debug('setting input focus', { ctrlKey, id: inputEl.id });
  inputEl.focus();
}

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

function normalizeSearchTerm(q: string) {
  return q?.trim()?.toLocaleLowerCase() ?? '';
}

function getItemDisplayText (text?: ILocalizableValue): string | undefined {
  if (!text) {
    return undefined;
  }
  return getLocalizeableValue(text, locale.value as Locale);
}

async function fetchSearchItems (q: string) {
  const searchTermNormalized = normalizeSearchTerm(q);
  if((searchTermNormalized?.length ?? 0) < minSuggestionInputChars) {
    logger.debug('ignoring search request, search term is too short', ctrlKey);
    return [];
  }
  
  logger.debug('sending search request', ctrlKey);
  fetchInProgress.value = true;

  try {
    const dto = await getObject<IListItemDto[]>(itemSearchUrl.value, {
        locale: locale.value,
        size: maxSuggestionItemsCount,
        onlyPopular: false,
        searchTerm: q,
        drafts: enabled,
        ...(additionalQueryParams ? additionalQueryParams : {})
      }, enabled ? 'no-cache' : 'default', false, undefined, 'default');

      if (dto) {
        if(isArray(dto)) {
          logger.verbose('received list search results', { ctrlKey, count: dto.length });
        } else {
          logger.warn('received non-array response on search request', undefined, { ctrlKey, url: itemSearchUrl.value });
          userNotificationStore.show({
            level: UserNotificationLevel.ERROR,
            resName: getI18nResName2('appErrors', 'unknown')
          });
          return [];
        }        
      } else {
        logger.verbose('search response contains empty data', { ctrlKey, url: itemSearchUrl.value });
        return [];
      }
      
      let result: ISearchListItem[] = (dto.map((t) => {
        return {
          id: t.id,
          slug: t.slug,
          displayName: t.displayName,
          label: getItemDisplayText(t.displayName)
        };
      }));
      await updateCache(result);

      if(exclusionIds?.length) {
        result = result.filter(d => !exclusionIds.includes(d.id));
        if(!result.length) {
          logger.verbose('after filtering search result does not contain matching items', { ctrlKey, url: itemSearchUrl.value });
          return [];
        }
      }
      return result;
  } catch(err: any) {
    logger.warn('search request exception occured', err, { ctrlKey, url: itemSearchUrl.value });
    userNotificationStore.show({
      level: UserNotificationLevel.ERROR,
      resName: getI18nResName2('appErrors', 'unknown')
    });
    return [];
  } finally {
    fetchInProgress.value = false;
  }
}

async function setModelValueFromSelection (item?: ISearchListItem | null): Promise<void> {
  const itemDisplayText = getItemDisplayText(item?.displayName);
  logger.verbose('updating model value from selection', { ctrlKey, id: item?.id, text: itemDisplayText, type });
  if(item) {
    logger.debug('updating entity cache with selected value', { ctrlKey, text: itemDisplayText });
    await entityCacheStore.set({ ...item, type, slug: item.slug! });
  }
  modelValue.value = item?.id ?? null;

  logger.debug('model value updated', { ctrlKey, id: item?.id, text: itemDisplayText, type });
}

async function setSelectionFromModelValue (value?: EntityId | null): Promise<void> {
  logger.verbose('updating selected item from model value', { ctrlKey, id: value });
  if(value) {
    const entityItem = (await entityCacheStore.get({ ids: [value!] }, type, true))[0];
    selectedMenuItem.value = { ...entityItem, label: getItemDisplayText(entityItem.displayName)! };
  } else {
    selectedMenuItem.value = undefined;
  }
  logger.debug('selected item updated', { ctrlKey, id: value });
}

onMounted(() => {
  const initialOverwrite = modelValue.value as ControlStoreValue;
  logger.debug('acquiring store value ref', { ctrlKey, initialOverwrite });
  const { valueRef: storeValueRef } = controlValuesStore.acquireValueRef(ctrlKey, {
    initialOverwrite,
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

  watch([modelValue, locale], () => {
    logger.debug('model value watcher', { ctrlKey, modelValue: modelValue.value, storeValue: storeValueRef.value });
    if(modelValue.value !== storeValueRef.value) {
      storeValueRef.value = modelValue.value ?? null;
    }
    setSelectionFromModelValue(modelValue.value);
  }, { immediate: true });

  watch(selectedMenuItem, () => {
    logger.debug('selected menu item watcher', { ctrlKey, id: selectedMenuItem.value?.id, displayName: getItemDisplayText(selectedMenuItem.value?.displayName) });
    if(modelValue.value !== selectedMenuItem.value) {
      if (!modelValue.value || !exclusionIds?.includes(modelValue.value)) {
        setModelValueFromSelection(selectedMenuItem.value);
      } else {
        setModelValueFromSelection(undefined);
      }
    }
  }, { immediate: false });
});

</script>

<template>
   <UInputMenu v-model="selectedMenuItem" :data-ctrlkey="toShortForm(ctrlKey)" option-attribute="label" by="id" :loading="fetchInProgress" :search="fetchSearchItems" :placeholder="placeholderResName ? $t(placeholderResName) : ''" :debounce="AppConfig.suggestionPopupDelayMs" nullable :ui="!fetchInProgress ? { base: '!pl-0' } : undefined" variant="none" :aria-label="ariaLabelResName ? $t(ariaLabelResName) : ''">
    <template #option-empty="{ query }">
      <span v-if="normalizeSearchTerm(query).length < minSuggestionInputChars" class="text-wrap">{{ $t(getI18nResName2('searchList', 'termTooShort'), { count: minSuggestionInputChars }) }}</span>
      <span v-else class="text-wrap">{{ $t(getI18nResName2('searchList', 'notFound')) }}</span>
    </template>
    <template #empty>
      <span class="text-wrap">{{ $t(getI18nResName2('searchList', 'termTooShort'), { count: minSuggestionInputChars }) }}</span>
    </template>
  </UInputMenu>
</template>
