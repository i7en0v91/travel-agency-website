<script setup lang="ts">
import { AppConfig, HeaderAppVersion, AppException, AppExceptionCodeEnum, UserNotificationLevel, type Locale, type EntityId, type CacheEntityType, type ILocalizableValue, type IEntityCacheItem, type IEntityCacheCityItem, getLocalizeableValue, type I18nResName, getI18nResName2 } from '@golobe-demo/shared';
import { updateTabIndices, TabIndicesUpdateDefaultTimeout } from './../../helpers/dom';
import type { SearchListItemType, ISearchListItem } from './../../types';
import type { Dropdown } from 'floating-vue';
import isArray from 'lodash-es/isArray';
import isString from 'lodash-es/isString';
import isObject from 'lodash-es/isObject';
import type { IListItemDto } from '../../server/api-definitions';
import { usePreviewState } from './../../composables/preview-state';
import { getClientServices, getCommonServices } from '../../helpers/service-accessors';

interface IProps {
  ctrlKey: string,
  itemSearchUrl: string,
  type: SearchListItemType,
  persistent: boolean,
  selectedValue: ISearchListItem | undefined,
  initiallySelectedValue?: ISearchListItem | null | undefined,
  placeholderResName?: I18nResName,
  minSuggestionInputChars?: number,
  maxSuggestionItemsCount?: number,
  listContainerClass?: string,
  additionalQueryParams?: any,
  ariaLabelResName?: I18nResName
}
const { additionalQueryParams, itemSearchUrl, type, selectedValue, persistent, ctrlKey, initiallySelectedValue, maxSuggestionItemsCount = 10, minSuggestionInputChars = 3 } = defineProps<IProps>();

const { locale } = useI18n();
const { enabled } = usePreviewState();

let showOnDataChanged = false;
const searchTerm = ref<string | undefined>('');
let selectedItemName: string | undefined;
const exclusionIds: Ref<EntityId[]> = ref([]);

const hasMounted = ref(false);

const inputField = useTemplateRef<HTMLInputElement>('input-field');
const logger = getCommonServices().getLogger();

const controlSettingsStore = useControlSettingsStore();
const userNotificationStore = useUserNotificationStore();

defineExpose({
  setExclusionIds,
  setValue,
  getValue,
  setInputFocus
});

const getControlValueSetting = () => controlSettingsStore.getControlValueSetting<EntityId | undefined>(ctrlKey, undefined, persistent);

async function setupInitialValue () {
  if (initiallySelectedValue && initiallySelectedValue.displayName) {
    const controlValueSetting = getControlValueSetting();
    const displayName = (import.meta.client ? (await tryLookupLocalizeableDisplayNameOnClient(initiallySelectedValue.id)) : undefined) ?? getItemDisplayText(initiallySelectedValue.displayName)!;
    controlValueSetting.value = initiallySelectedValue.id;
    selectedItemName = searchTerm.value = getItemDisplayText(displayName);
  } else if (initiallySelectedValue === null) {
    const controlValueSetting = getControlValueSetting();
    controlValueSetting.value = undefined;
    selectedItemName = searchTerm.value = undefined;
  }
}
await setupInitialValue();

let popupShowCounter = 0;
let scheduledPopupShows: number[] = [];

function onMenuShown () {
  setTimeout(() => updateTabIndices(), TabIndicesUpdateDefaultTimeout);
}

function onMenuHide () {
  if (document.activeElement !== inputField.value && selectedValue) {
    searchTerm.value = selectedItemName;
  }
  setTimeout(() => updateTabIndices(), TabIndicesUpdateDefaultTimeout);
}

function onInputBlur () {
  if (!isSuggestionPopupShown()) {
    if (selectedValue) {
      searchTerm.value = selectedItemName;
    }
    cancelSuggestionPopup();
  }
}

function isSuggestionPopupShown () {
  return (dropdown.value?.$el.className as string)?.includes('v-popper--shown') ?? false;
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
    logger.verbose(`(SearchListInput) won't send search request as searchTerm is too short: ctrlKey=${ctrlKey}, ctr=${popupShowCounter}`);
    data.value = undefined;
    cancelSuggestionPopup();
  }
}

function scheduleSuggestionPopup () {
  if (isSuggestionPopupShown()) {
    logger.debug(`(SearchListInput) popup show won't be scheduled as it is currently shown: ctrlKey=${ctrlKey}`);
    return;
  }

  popupShowCounter++;
  logger.debug(`(SearchListInput) scheduling popup show: ctrlKey=${ctrlKey}, ctr=${popupShowCounter}`);
  scheduledPopupShows.push(popupShowCounter);
  const showScheduleNumber = popupShowCounter;
  setTimeout(() => {
    if (scheduledPopupShows.includes(showScheduleNumber)) {
      logger.debug(`(SearchListInput) scheduled popup show fired: ctrlKey=${ctrlKey}, ctr=${showScheduleNumber}`);
      onSuggestionPopupShowFired();
    }
  }, AppConfig.suggestionPopupDelayMs);
}

function cancelSuggestionPopup () {
  logger.debug(`(SearchListInput) hiding scheduled popup requests: ctrlKey=${ctrlKey}`);
  scheduledPopupShows = [];
  try {
    dropdown.value?.hide();
  } catch (err: any) { // KB: sometimes throws error on webkit
    const userAgent = (window?.navigator as any)?.userAgent;
    logger.warn(`(SearchListInput) exception on hiding dropdown: ctrlKey=${ctrlKey}`, err, { userAgent });
  }
  setTimeout(() => updateTabIndices(), TabIndicesUpdateDefaultTimeout);
}

function setExclusionIds (idsList?: EntityId[]) {
  logger.verbose(`(SearchListInput) setting exclusion ids list: ctrlKey=${ctrlKey}, list=${JSON.stringify(idsList ?? [])}`);
  exclusionIds.value = idsList ?? [];
  if (selectedValue && exclusionIds.value.includes(selectedValue.id)) {
    setValue(undefined);
  }
}

function setValue (value?: ISearchListItem | undefined) {
  logger.verbose(`(SearchListInput) setting new value: ctrlKey=${ctrlKey}, id=${value?.id ?? '[none]'}`);

  if (!value) {
    selectedItemName = searchTerm.value = undefined;
    updateSelectedValue(undefined);
    return;
  }

  selectedItemName = searchTerm.value = getItemDisplayText(value.displayName);
  updateSelectedValue(value);
}

function getValue () : ISearchListItem | undefined {
  if (!selectedValue || !selectedItemName) {
    logger.debug(`(SearchListInput) current value accessed: ctrlKey=${ctrlKey}, result=undefined`);
    return undefined;
  }

  logger.debug(`(SearchListInput) current value accessed: ctrlKey=${ctrlKey}, id=${selectedValue.id}, slug=${selectedValue.slug}`);
  return selectedValue;
}

function setInputFocus () {
  inputField.value?.focus();
}

function getCacheEntityType (): CacheEntityType {
  const searchType = type;
  switch (searchType) {
    case 'destination':
      return 'City';
    default:
      logger.warn(`(SearchListInput) unexpected search type: ctrlKey=${ctrlKey}, type=${searchType}`);
      throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'internal server error', 'error-stub');
  }
}

async function updateClientEntityCacheIfNeeded (items: ISearchListItem[]): Promise<void> {
  if (!import.meta.client || !items.length) {
    return;
  }

  logger.debug(`(SearchListInput) updating entity cache: ctrlKey=${ctrlKey}, ids=[${items.map(i => i.id).join(', ')}]`);

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
      logger.warn(`(SearchListInput) unexpected item type: ctrlKey=${ctrlKey}, type=${type}`);
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
        logger.verbose(`(SearchListInput) received list search results, ctrlKey=${ctrlKey}, count=${dto.length}`);
      } else {
        logger.warn(`(SearchListInput) request response contains empty data, ctrlKey=${ctrlKey}, url=${itemSearchUrl}`);
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
watch(error, () => {
  if (error.value) {
    logger.warn(`(SearchListInput) search request failed with exception, ctrlKey=${ctrlKey}, url=${itemSearchUrl}}`, error.value);
    data.value = undefined;
  }
});
watch(status, () => {
  logger.verbose(`(SearchListInput) request fetch status changed, ctrlKey=${ctrlKey}, url=${itemSearchUrl}, status=${status.value}`);
  if (status.value === 'success' && data.value) {
    updateClientEntityCacheIfNeeded(data.value!);
  }

  if (showOnDataChanged && (status.value === 'success' || status.value === 'error')) {
    if (status.value === 'success' && (data.value?.filter(d => !exclusionIds.value.includes(d.id)).length ?? 0) > 0) {
      if (!isSuggestionPopupShown()) {
        logger.verbose(`(SearchListInput) showing dropdown, ctrlKey=${ctrlKey}, url=${itemSearchUrl}, count=${data.value!.length}`);
        setTimeout(() => {
          dropdown.value?.show();
          setTimeout(() => updateTabIndices(), TabIndicesUpdateDefaultTimeout);
        }, 0);
      } else {
        logger.debug(`(SearchListInput) dropdown is already visible, ctrlKey=${ctrlKey}, url=${itemSearchUrl}, count=${data.value!.length}`);
      }
    } else {
      data.value = undefined;
      cancelSuggestionPopup();
    }
    showOnDataChanged = false;
  }
  if (status.value === 'error') {
    userNotificationStore.show({
      level: UserNotificationLevel.ERROR,
      resName: getI18nResName2('appErrors', 'unknown')
    });
  }
});

const $emit = defineEmits<{(event: 'update:selectedValue', value?: ISearchListItem | undefined): void}>();

function updateSelectedValue (item?: ISearchListItem | undefined) {
  const itemDisplayText = getItemDisplayText(item?.displayName);
  logger.verbose(`(SearchListInput) updating selected item: ctrlKey=${ctrlKey}, id=${item?.id}, text=${itemDisplayText}, type=${type}`);
  const controlValueSetting = getControlValueSetting();
  controlValueSetting.value = item ? item.id : undefined;
  $emit('update:selectedValue', item);
  logger.verbose(`(SearchListInput) selected item updated: ctrlKey=${ctrlKey}, id=${item?.id}, text=${itemDisplayText}, type=${type}`);
}

watch(locale, async () => {
  let item = selectedValue;
  if (!item?.id) {
    return;
  }

  logger.verbose(`(SearchListInput) locale changed, updating displayed text: ctrlKey=${ctrlKey}, id=${item.id}, type=${type}, locale=${locale.value}`);
  if (!isObject(item?.displayName)) {
    logger.debug(`(SearchListInput) checking cache for text localization: ctrlKey=${ctrlKey}, id=${item.id}`);

    const selectedItemId = selectedValue!.id;
    const cacheItem = await getCityFromCache(selectedItemId, false);
    if (!cacheItem) {
      logger.warn(`(SearchListInput) entity cache empty, cannot localize displayed text: ctrlKey=${ctrlKey}, id=${item.id}, type=${type}, locale=${locale.value}`);
      return;
    }
    item = cacheItem;
    setValue(item);
    logger.verbose(`(SearchListInput) displayed text updated: ctrlKey=${ctrlKey}, id=${item.id}, type=${type}, locale=${locale.value}`);
  } else if (item?.displayName) {
    setValue(item);
  }
});

function onInputTextChanged () {
  let inputText = inputField.value?.value ?? '';
  logger.debug(`(SearchListInput) on input text changed: ctrlKey=${ctrlKey}, text=${inputText}`);
  inputText = inputText.trim();
  if (inputText.length >= minSuggestionInputChars) {
    searchTerm.value = inputText.trim();
    cancelSuggestionPopup();
    setTimeout(() => {
      scheduleSuggestionPopup();
    }, 0);
  } else if (inputText.length === 0) {
    searchTerm.value = '';
    selectedItemName = undefined;
    cancelSuggestionPopup();
    updateSelectedValue(undefined);
  } else {
    cancelSuggestionPopup();
  }
}

const dropdown = useTemplateRef<InstanceType<typeof Dropdown>>('dropdown');

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
  logger.verbose(`(SearchListInput) list item activated: ctrlKey=${ctrlKey}, id=${item.id}, displayName=${item.displayName}`);
  cancelSuggestionPopup();
  selectedItemName = searchTerm.value = getItemDisplayText(item.displayName);
  updateSelectedValue(item);
}

function onEscape () {
  cancelSuggestionPopup();
}

onMounted(async () => {
  hasMounted.value = true;

  const controlValueSetting = getControlValueSetting();
  if (controlValueSetting.value) {
    const entityId = controlValueSetting.value as EntityId;
    logger.debug(`(SearchListInput) obtaining value display text: ctrlKey=${ctrlKey}, id=${entityId}, type=${type}`);
    const displayName = await tryLookupLocalizeableDisplayNameOnClient(entityId);
    if (displayName) {
      selectedItemName = searchTerm.value = getItemDisplayText(displayName);
      $emit('update:selectedValue', { id: entityId, displayName });
    } else {
      logger.debug(`(SearchListInput) obtaining value display text from cache: ctrlKey=${ctrlKey}, id=${entityId}, type=${type}`);
      const cachedEntity = await getCityFromCache(entityId, true);
      if (cachedEntity) {
        selectedItemName = searchTerm.value = getItemDisplayText(cachedEntity.displayName);
        updateSelectedValue(cachedEntity!);
      } else {
        logger.warn(`(SearchListInput) failed to obtain value display text: ctrlKey=${ctrlKey}, id=${entityId}, type=${type}`);
      }
    }
  }
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
      :id="ctrlKey"
      ref="input-field"
      type="text"
      class="search-list-input-el"
      :placeholder="placeholderResName ? $t(placeholderResName) : ''"
      :value="hasMounted ? searchTerm : ''"
      :maxLength="256"
      autocomplete="off"
      @input="onInputTextChanged"
      @blur="onInputBlur"
    >
    <VDropdown
      ref="dropdown"
      v-floating-vue-hydration="{ tabIndex: 0 }"
      :ctrl-key="`${ctrlKey}-DropDownWrapper`"
      :aria-id="`${ctrlKey}-DropDownWrapper`"
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
            <ol v-if="(data?.filter(d => !exclusionIds.includes(d.id)).length ?? 0) > 0" role="select">
              <li
                v-for="(v, idx) in (data?.filter(d => !exclusionIds.includes(d.id)))"
                :key="`${ctrlKey}-SearchRes-${idx}`"
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
