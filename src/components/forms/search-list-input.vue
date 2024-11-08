<script setup lang="ts">
import { AppConfig, AppException, AppExceptionCodeEnum, UserNotificationLevel, type Locale, type EntityId, type CacheEntityType, type ILocalizableValue, type IEntityCacheItem, type IEntityCacheCityItem, getLocalizeableValue, type I18nResName, getI18nResName2 } from '@golobe-demo/shared';
import { type SearchListItemType, type ISearchListItem } from './../../types';
import { getObject } from './../../helpers/rest-utils';
import isArray from 'lodash-es/isArray';
import isString from 'lodash-es/isString';
import isObject from 'lodash-es/isObject';
import { type IListItemDto } from '../../server/api-definitions';
import { usePreviewState } from './../../composables/preview-state';
import { getClientServices, getCommonServices } from '../../helpers/service-accessors';

interface IProps {
  ctrlKey: string,
  itemSearchUrl: string,
  type: SearchListItemType,
  persistent: boolean,
  placeholderResName?: I18nResName,
  minSuggestionInputChars?: number,
  maxSuggestionItemsCount?: number,
  additionalQueryParams?: any,
  ariaLabelResName?: I18nResName
}
const props = withDefaults(defineProps<IProps>(), {
  placeholderResName: undefined,
  minSuggestionInputChars: 3,
  maxSuggestionItemsCount: 10,
  listContainerClass: undefined,
  additionalQueryParams: undefined,
  ariaLabelResName: undefined
});

const { locale } = useI18n();
const { enabled } = usePreviewState();

const selectedMenuItem = ref<ISearchListItem & { label: string } | undefined>();
const fetchInProgress = ref(false);

let selectedItemName: string | undefined;
const exclusionIds: Ref<EntityId[]> = ref([]);

const componentRef = shallowRef();
const logger = getCommonServices().getLogger();

const controlSettingsStore = useControlSettingsStore();
const userNotificationStore = useUserNotificationStore();

const modelRef = defineModel<ISearchListItem | null | undefined>('selectedValue');

defineExpose({
  setExclusionIds,
  setInputFocus
});

const getControlValueSetting = () => controlSettingsStore.getControlValueSetting<EntityId | undefined>(props.ctrlKey, undefined, props.persistent);

async function applyInitialValue () {
  const initiallySelectedValue = modelRef.value;
  if (initiallySelectedValue && initiallySelectedValue.displayName) {
    const controlValueSetting = getControlValueSetting();
    const displayName = (import.meta.client ? (await tryLookupLocalizeableDisplayNameOnClient(initiallySelectedValue.id)) : undefined) ?? getItemDisplayText(initiallySelectedValue.displayName)!;
    controlValueSetting.value = initiallySelectedValue.id;
    modelRef.value = { ...initiallySelectedValue, displayName };
    selectedMenuItem.value = { ...modelRef.value, label: getItemDisplayText(displayName)! };
  } else if (initiallySelectedValue === null) {
    const controlValueSetting = getControlValueSetting();
    controlValueSetting.value = undefined;
    modelRef.value = selectedMenuItem.value = undefined;
  }
}

function setExclusionIds (idsList?: EntityId[]) {
  logger.verbose(`(SearchListInput) setting exclusion ids list: ctrlKey=${props.ctrlKey}, list=${JSON.stringify(idsList ?? [])}`);
  exclusionIds.value = idsList ?? [];
  if (modelRef.value && exclusionIds.value.includes(modelRef.value.id)) {
    setSelectedItem(undefined);
  }
}

function setSelectedItem (item?: ISearchListItem | null | undefined) {
  logger.verbose(`(SearchListInput) setting selected item: ctrlKey=${props.ctrlKey}, id=${item?.id ?? '[none]'}`);

  if (!item) {
    selectedItemName = selectedMenuItem.value = undefined;
    updateValue(undefined);
    return;
  }

  selectedItemName = getItemDisplayText(item.displayName);
  selectedMenuItem.value = { ...item, label: selectedItemName! } ;
  updateValue(item);
}

function setInputFocus () {
  const inputEl = document.querySelector(`[data-ctrlkey="${props.ctrlKey}"]`) as HTMLElement;
  if(!inputEl) {
    logger.warn(`(SearchListInput) cannot set focus, input element not found: ctrlKey=${props.ctrlKey}`);
    return;
  }
  
  logger.debug(`(SearchListInput) setting input focus: ctrlKey=${props.ctrlKey}, id=${inputEl.id}`);
  inputEl.focus();
}

function getCacheEntityType (): CacheEntityType {
  const searchType = props.type;
  switch (searchType) {
    case 'destination':
      return 'City';
    default:
      logger.warn(`(SearchListInput) unexpected search type: ctrlKey=${props.ctrlKey}, type=${searchType}`);
      throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'internal server error', 'error-stub');
  }
}

async function updateClientEntityCacheIfNeeded (items: ISearchListItem[]): Promise<void> {
  if (!import.meta.client || !items.length) {
    return;
  }

  logger.debug(`(SearchListInput) updating entity cache: ctrlKey=${props.ctrlKey}, ids=[${items.map(i => i.id).join(', ')}]`);

  const type = getCacheEntityType();
  const entityCache = getClientServices().getEntityCache();
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
      await entityCache.set<'City'>(item as IEntityCacheCityItem, AppConfig.caching.clientRuntime.expirationsSeconds.default);
    } else if (import.meta.env.MODE === 'development') {
      logger.warn(`(SearchListInput) unexpected item type: ctrlKey=${props.ctrlKey}, type=${props.type}`);
    }
  }
}

async function tryLookupLocalizeableDisplayNameOnClient (id: EntityId): Promise<ILocalizableValue | undefined> {
  if (!import.meta.client) {
    return undefined;
  }

  return (await getCityFromCache(id, false))?.displayName;
}

async function getCityFromCache (cityId: EntityId, fetchFromServer: boolean): Promise<IEntityCacheCityItem | undefined> {
  const entityCache = getClientServices().getEntityCache();
  const entityCacheType = getCacheEntityType();
  const lookupResult = await entityCache.get<'City'>([cityId], [], entityCacheType, fetchFromServer ? { expireInSeconds: AppConfig.caching.clientRuntime.expirationsSeconds.default } : false);
  return (lookupResult?.length ?? 0) > 0 ? lookupResult![0] : undefined;
}


function updateValue (item?: ISearchListItem | undefined) {
  const itemDisplayText = getItemDisplayText(item?.displayName);
  logger.verbose(`(SearchListInput) updating value: ctrlKey=${props.ctrlKey}, id=${item?.id}, text=${itemDisplayText}, type=${props.type}`);
  const controlValueSetting = getControlValueSetting();
  controlValueSetting.value = item ? item.id : undefined;
  modelRef.value = item;
  logger.verbose(`(SearchListInput) value updated: ctrlKey=${props.ctrlKey}, id=${item?.id}, text=${itemDisplayText}, type=${props.type}`);
}

watch(locale, async () => {
  let item = modelRef.value;
  if (!item?.id) {
    return;
  }

  logger.verbose(`(SearchListInput) locale changed, updating displayed text: ctrlKey=${props.ctrlKey}, id=${item.id}, type=${props.type}, locale=${locale.value}`);
  if (!isObject(item?.displayName)) {
    logger.debug(`(SearchListInput) checking cache for text localization: ctrlKey=${props.ctrlKey}, id=${item.id}`);

    const selectedItemId = item.id;
    const cacheItem = await getCityFromCache(selectedItemId, false);
    if (!cacheItem) {
      logger.warn(`(SearchListInput) entity cache empty, cannot localize displayed text: ctrlKey=${props.ctrlKey}, id=${item.id}, type=${props.type}, locale=${locale.value}`);
      return;
    }
    item = cacheItem;
    setSelectedItem(item);
    logger.verbose(`(SearchListInput) displayed text updated: ctrlKey=${props.ctrlKey}, id=${item.id}, type=${props.type}, locale=${locale.value}`);
  } else if (item?.displayName) {
    setSelectedItem(item);
  }
});

function getItemDisplayText (text?: string | ILocalizableValue): string | undefined {
  if (!text) {
    return undefined;
  }

  if (isString(text)) {
    return text;
  } else {
    return getLocalizeableValue(text, locale.value as Locale);
  }
}

function onActivate (item: ISearchListItem) {
  logger.verbose(`(SearchListInput) list item activated: ctrlKey=${props.ctrlKey}, id=${item.id}, displayName=${getItemDisplayText(item.displayName)}`);
  updateValue(item);
}

function normalizeSearchTerm(q: string) {
  return q?.trim()?.toLocaleLowerCase() ?? '';
}

async function fetchSearchItems (q: string) {
  const searchTermNormalized = normalizeSearchTerm(q);
  if((searchTermNormalized?.length ?? 0) < props.minSuggestionInputChars) {
    logger.debug(`(SearchListInput) ignoring search request, search term is too short: ctrlKey=${props.ctrlKey}, searchTerm=[${q}]`);
    return [];
  }
  
  logger.debug(`(SearchListInput) sending search request: ctrlKey=${props.ctrlKey}, searchTerm=[${q}], normalized=[${searchTermNormalized}]`);
  fetchInProgress.value = true;

  try {
    const dto = await getObject<IListItemDto[]>(props.itemSearchUrl, {
        locale: locale.value,
        size: props.maxSuggestionItemsCount,
        onlyPopular: false,
        searchTerm: q,
        drafts: enabled,
        ...(props.additionalQueryParams ? props.additionalQueryParams : {})
      }, enabled ? 'no-cache' : 'default', false, undefined, 'default');

      if (dto) {
        if(isArray(dto)) {
          logger.verbose(`(SearchListInput) received list search results, ctrlKey=${props.ctrlKey}, count=${dto.length}, searchTerm=[${q}]`);
        } else {
          logger.warn(`(SearchListInput) received non-array response on search request, ctrlKey=${props.ctrlKey}, url=${props.itemSearchUrl}, searchTerm=[${q}], normalized=[${searchTermNormalized}], props=${JSON.stringify(props)}`);
          userNotificationStore.show({
            level: UserNotificationLevel.ERROR,
            resName: getI18nResName2('appErrors', 'unknown')
          });
          return [];
        }        
      } else {
        logger.verbose(`(SearchListInput) search response contains empty data, ctrlKey=${props.ctrlKey}, url=${props.itemSearchUrl}, searchTerm=[${q}], normalized=[${searchTermNormalized}], props=${JSON.stringify(props)}`);
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
      await updateClientEntityCacheIfNeeded(result);

      if(exclusionIds.value.length) {
        result = result.filter(d => !exclusionIds.value.includes(d.id));
        if(!result.length) {
          logger.verbose(`(SearchListInput) after filtering search result does not contain matching items, ctrlKey=${props.ctrlKey}, url=${props.itemSearchUrl}, searchTerm=[${q}], exclusionIds=[${exclusionIds.value.join('; ')}], props=${JSON.stringify(props)}`);
          return [];
        }
      }
      return result;
  } catch(err: any) {
    logger.warn(`(SearchListInput) search request exception occured, ctrlKey=${props.ctrlKey}, url=${props.itemSearchUrl}, searchTerm=[${q}], normalized=[${searchTermNormalized}], props=${JSON.stringify(props)}`, err);
    userNotificationStore.show({
      level: UserNotificationLevel.ERROR,
      resName: getI18nResName2('appErrors', 'unknown')
    });
    return [];
  } finally {
    fetchInProgress.value = false;
  }
}

onMounted(async () => {
  await applyInitialValue();

  const controlValueSetting = getControlValueSetting();
  if (controlValueSetting.value) {
    const entityId = controlValueSetting.value as EntityId;
    logger.debug(`(SearchListInput) obtaining selected item display text: ctrlKey=${props.ctrlKey}, id=${entityId}, type=${props.type}`);
    const displayName = await tryLookupLocalizeableDisplayNameOnClient(entityId);
    if (displayName) {
      selectedItemName = getItemDisplayText(displayName);
      const item = { id: entityId, displayName };
      selectedMenuItem.value = { ...item, label: selectedItemName! };
      updateValue(item);
    } else {
      logger.debug(`(SearchListInput) obtaining selected item display text from cache: ctrlKey=${props.ctrlKey}, id=${entityId}, type=${props.type}`);
      const cachedEntity = await getCityFromCache(entityId, true);
      if (cachedEntity) {
        selectedItemName = getItemDisplayText(cachedEntity.displayName);
        selectedMenuItem.value = { ...cachedEntity!, label: selectedItemName! };
        updateValue(cachedEntity);
      } else {
        logger.warn(`(SearchListInput) failed to obtain selected item display text: ctrlKey=${props.ctrlKey}, id=${entityId}, type=${props.type}`);
      }
    }
  }

  watch(selectedMenuItem, () => {
    logger.debug(`(SearchListInput) selected menu item changed: ctrlKey=${props.ctrlKey}, id=${selectedMenuItem.value?.id}, displayName=${getItemDisplayText(selectedMenuItem.value?.displayName)}`);
    if(selectedMenuItem.value) {
      onActivate(selectedMenuItem.value);
    } else {
      setSelectedItem(undefined);
    }
  }, { immediate: true });

  watch(modelRef, () => {
    if((!!modelRef.value && modelRef.value.id === selectedMenuItem.value?.id) || (!modelRef.value && !selectedMenuItem.value?.id)) {
      return;
    }
    logger.debug(`(SearchListInput) model value changed, setting selected menu item: ctrlKey=${props.ctrlKey}, id=${modelRef.value?.id}, displayName=${getItemDisplayText(modelRef.value?.displayName)}`);
    setSelectedItem(modelRef.value);
  });
});

</script>

<template>
   <UInputMenu ref="componentRef" v-model="selectedMenuItem" :data-ctrlkey="ctrlKey" option-attribute="label" by="id" :loading="fetchInProgress" :search="fetchSearchItems" :placeholder="placeholderResName ? $t(placeholderResName) : ''" :debounce="AppConfig.suggestionPopupDelayMs" nullable :ui="!fetchInProgress ? { base: '!pl-0' } : undefined" variant="none" :aria-label="ariaLabelResName ? $t(ariaLabelResName) : ''">
    <template #option-empty="{ query }">
      <span v-if="normalizeSearchTerm(query).length < minSuggestionInputChars" class="text-wrap">{{ $t(getI18nResName2('searchList', 'termTooShort'), { count: minSuggestionInputChars }) }}</span>
      <span v-else class="text-wrap">{{ $t(getI18nResName2('searchList', 'notFound')) }}</span>
    </template>
    <template #empty>
      <span class="text-wrap">{{ $t(getI18nResName2('searchList', 'termTooShort'), { count: minSuggestionInputChars }) }}</span>
    </template>
  </UInputMenu>
</template>
