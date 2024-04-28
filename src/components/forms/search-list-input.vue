<script setup lang="ts">
import type { Dropdown } from 'floating-vue';
import isArray from 'lodash-es/isArray';
import isString from 'lodash-es/isString';
import isObject from 'lodash-es/isObject';
import { type I18nResName, getI18nResName2 } from './../../shared/i18n';
import { type EntityId, type CacheEntityType, type SearchListItemType, type ISearchListItem, type ILocalizableValue, type IEntityCacheItem, type IEntityCacheCityItem } from './../../shared/interfaces';
import { updateTabIndices } from './../../shared/dom';
import { getLocalizeableValue } from './../../shared/common';
import AppConfig from './../../appconfig';
import { type IListItemDto } from './../../server/dto';
import { UserNotificationLevel, type Locale, TabIndicesUpdateDefaultTimeout } from './../../shared/constants';
import { AppException, AppExceptionCodeEnum } from './../../shared/exceptions';

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
const props = withDefaults(defineProps<IProps>(), {
  selectedValue: undefined,
  placeholderResName: undefined,
  minSuggestionInputChars: 3,
  maxSuggestionItemsCount: 10,
  listContainerClass: undefined,
  additionalQueryParams: undefined,
  ariaLabelResName: undefined,
  initiallySelectedValue: undefined
});

const { locale } = useI18n();

let showOnDataChanged = false;
const searchTerm = ref<string | undefined>('');
let selectedItemName: string | undefined;
const exclusionIds: Ref<EntityId[]> = ref([]);

const hasMounted = ref(false);

const inputEl = shallowRef<HTMLInputElement>();
const logger = CommonServicesLocator.getLogger();

const controlSettingsStore = useControlSettingsStore();
const userNotificationStore = useUserNotificationStore();

defineExpose({
  setExclusionIds,
  setValue,
  getValue,
  setInputFocus
});

const getControlValueSetting = () => controlSettingsStore.getControlValueSetting<EntityId | undefined>(props.ctrlKey, undefined, props.persistent);

async function setupInitialValue () {
  if (props.initiallySelectedValue && props.initiallySelectedValue.displayName) {
    const controlValueSetting = getControlValueSetting();
    const displayName = (import.meta.client ? (await tryLookupLocalizeableDisplayNameOnClient(props.initiallySelectedValue.id)) : undefined) ?? getItemDisplayText(props.initiallySelectedValue.displayName)!;
    controlValueSetting.value = props.initiallySelectedValue.id;
    selectedItemName = searchTerm.value = getItemDisplayText(displayName);
  } else if (props.initiallySelectedValue === null) {
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
  if (document.activeElement !== inputEl.value && props.selectedValue) {
    searchTerm.value = selectedItemName;
  }
  setTimeout(() => updateTabIndices(), TabIndicesUpdateDefaultTimeout);
}

function onInputBlur () {
  if (!isSuggestionPopupShown()) {
    if (props.selectedValue) {
      searchTerm.value = selectedItemName;
    }
    cancelSuggestionPopup();
  }
}

function isSuggestionPopupShown () {
  return (dropdown.value?.$el.className as string)?.includes('v-popper--shown') ?? false;
}

function onSuggestionPopupShowFired () {
  if ((searchTerm.value?.length ?? 0) >= props.minSuggestionInputChars) {
    showOnDataChanged = true;
    if (searchTermQueryParam.value !== searchTerm.value) {
      searchTermQueryParam.value = searchTerm.value; // will automatically trigger refresh
    } else {
      refresh();
    }
  } else {
    logger.verbose(`(SearchListInput) won't send search request as searchTerm is too short: ctrlKey=${props.ctrlKey}, ctr=${popupShowCounter}`);
    data.value = undefined;
    cancelSuggestionPopup();
  }
}

function scheduleSuggestionPopup () {
  if (isSuggestionPopupShown()) {
    logger.debug(`(SearchListInput) popup show won't be scheduled as it is currently shown: ctrlKey=${props.ctrlKey}`);
    return;
  }

  popupShowCounter++;
  logger.debug(`(SearchListInput) scheduling popup show: ctrlKey=${props.ctrlKey}, ctr=${popupShowCounter}`);
  scheduledPopupShows.push(popupShowCounter);
  const showScheduleNumber = popupShowCounter;
  setTimeout(() => {
    if (scheduledPopupShows.includes(showScheduleNumber)) {
      logger.debug(`(SearchListInput) scheduled popup show fired: ctrlKey=${props.ctrlKey}, ctr=${showScheduleNumber}`);
      onSuggestionPopupShowFired();
    }
  }, AppConfig.suggestionPopupDelayMs);
}

function cancelSuggestionPopup () {
  logger.debug(`(SearchListInput) hiding scheduled popup requests: ctrlKey=${props.ctrlKey}`);
  scheduledPopupShows = [];
  try {
    dropdown.value?.hide();
  } catch (err: any) { // KB: sometimes throws error on webkit
    const userAgent = (window?.navigator as any)?.userAgent;
    logger.warn(`(SearchListInput) exception on hiding dropdown: ctrlKey=${props.ctrlKey}`, err, { userAgent });
  }
  setTimeout(() => updateTabIndices(), TabIndicesUpdateDefaultTimeout);
}

function setExclusionIds (idsList?: EntityId[]) {
  logger.verbose(`(SearchListInput) setting exclusion ids list: ctrlKey=${props.ctrlKey}, list=${JSON.stringify(idsList ?? [])}`);
  exclusionIds.value = idsList ?? [];
  if (props.selectedValue && exclusionIds.value.includes(props.selectedValue.id)) {
    setValue(undefined);
  }
}

function setValue (value?: ISearchListItem | undefined) {
  logger.verbose(`(SearchListInput) setting new value: ctrlKey=${props.ctrlKey}, id=${value?.id ?? '[none]'}`);

  if (!value) {
    selectedItemName = searchTerm.value = undefined;
    updateSelectedValue(undefined);
    return;
  }

  selectedItemName = searchTerm.value = getItemDisplayText(value.displayName);
  updateSelectedValue(value);
}

function getValue () : ISearchListItem | undefined {
  if (!props.selectedValue || !selectedItemName) {
    logger.debug(`(SearchListInput) current value accessed: ctrlKey=${props.ctrlKey}, result=undefined`);
    return undefined;
  }

  logger.debug(`(SearchListInput) current value accessed: ctrlKey=${props.ctrlKey}, id=${props.selectedValue.id}, slug=${props.selectedValue.slug}`);
  return props.selectedValue;
}

function setInputFocus () {
  inputEl.value?.focus();
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
  const entityCache = ClientServicesLocator.getEntityCache();
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
      await entityCache.set(item, AppConfig.caching.clientRuntime.expirationsSeconds.default);
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
  const entityCache = ClientServicesLocator.getEntityCache();
  const entityCacheType = getCacheEntityType();
  const lookupResult = await entityCache.get<'City', IEntityCacheCityItem>([cityId], entityCacheType, fetchFromServer ? { expireInSeconds: AppConfig.caching.clientRuntime.expirationsSeconds.default } : false);
  return (lookupResult?.length ?? 0) > 0 ? lookupResult![0] : undefined;
}

const searchTermQueryParam = ref<string | undefined>();
const { data, error, status, refresh } = await useFetch(props.itemSearchUrl,
  {
    method: 'get',
    server: false,
    lazy: true,
    query: {
      locale,
      size: props.maxSuggestionItemsCount,
      onlyPopular: false,
      searchTerm: searchTermQueryParam,
      ...(props.additionalQueryParams ? props.additionalQueryParams : {})
    },
    immediate: false,
    transform: (response: any) => {
      const dto = response as IListItemDto[];
      if (dto || isArray(dto)) {
        logger.verbose(`(SearchListInput) received list search results, ctrlKey=${props.ctrlKey}, count=${dto.length}`);
      } else {
        logger.warn(`(SearchListInput) request response contains empty data, ctrlKey=${props.ctrlKey}, url=${props.itemSearchUrl}, props=${JSON.stringify(props)}`);
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
    logger.warn(`(SearchListInput) search request failed with exception, ctrlKey=${props.ctrlKey}, url=${props.itemSearchUrl}, props=${JSON.stringify(props)}`, error.value);
    data.value = undefined;
  }
});
watch(status, () => {
  logger.verbose(`(SearchListInput) request fetch status changed, ctrlKey=${props.ctrlKey}, url=${props.itemSearchUrl}, status=${status.value}`);
  if (status.value === 'success' && data.value) {
    updateClientEntityCacheIfNeeded(data.value!);
  }

  if (showOnDataChanged && (status.value === 'success' || status.value === 'error')) {
    if (status.value === 'success' && (data.value?.filter(d => !exclusionIds.value.includes(d.id)).length ?? 0) > 0) {
      if (!isSuggestionPopupShown()) {
        logger.verbose(`(SearchListInput) showing dropdown, ctrlKey=${props.ctrlKey}, url=${props.itemSearchUrl}, count=${data.value!.length}`);
        setTimeout(() => {
          dropdown.value?.show();
          setTimeout(() => updateTabIndices(), TabIndicesUpdateDefaultTimeout);
        }, 0);
      } else {
        logger.debug(`(SearchListInput) dropdown is already visible, ctrlKey=${props.ctrlKey}, url=${props.itemSearchUrl}, count=${data.value!.length}`);
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
  logger.verbose(`(SearchListInput) updating selected item: ctrlKey=${props.ctrlKey}, id=${item?.id}, text=${itemDisplayText}, type=${props.type}`);
  const controlValueSetting = getControlValueSetting();
  controlValueSetting.value = item ? item.id : undefined;
  $emit('update:selectedValue', item);
  logger.verbose(`(SearchListInput) selected item updated: ctrlKey=${props.ctrlKey}, id=${item?.id}, text=${itemDisplayText}, type=${props.type}`);
}

watch(locale, async () => {
  let item = props.selectedValue;
  if (!item?.id) {
    return;
  }

  logger.verbose(`(SearchListInput) locale changed, updating displayed text: ctrlKey=${props.ctrlKey}, id=${item.id}, type=${props.type}, locale=${locale.value}`);
  if (!isObject(item?.displayName)) {
    logger.debug(`(SearchListInput) checking cache for text localization: ctrlKey=${props.ctrlKey}, id=${item.id}`);

    const selectedItemId = props.selectedValue!.id;
    const cacheItem = await getCityFromCache(selectedItemId, false);
    if (!cacheItem) {
      logger.warn(`(SearchListInput) entity cache empty, cannot localize displayed text: ctrlKey=${props.ctrlKey}, id=${item.id}, type=${props.type}, locale=${locale.value}`);
      return;
    }
    item = cacheItem;
    setValue(item);
    logger.verbose(`(SearchListInput) displayed text updated: ctrlKey=${props.ctrlKey}, id=${item.id}, type=${props.type}, locale=${locale.value}`);
  } else if (item?.displayName) {
    setValue(item);
  }
});

function onInputTextChanged () {
  let inputText = inputEl.value?.value ?? '';
  logger.debug(`(SearchListInput) on input text changed: ctrlKey=${props.ctrlKey}, text=${inputText}`);
  inputText = inputText.trim();
  if (inputText.length >= props.minSuggestionInputChars) {
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

const dropdown = shallowRef<InstanceType<typeof Dropdown>>();

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
  logger.verbose(`(SearchListInput) list item activated: ctrlKey=${props.ctrlKey}, id=${item.id}, displayName=${item.displayName}`);
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
    logger.debug(`(SearchListInput) obtaining value display text: ctrlKey=${props.ctrlKey}, id=${entityId}, type=${props.type}`);
    const displayName = await tryLookupLocalizeableDisplayNameOnClient(entityId);
    if (displayName) {
      selectedItemName = searchTerm.value = getItemDisplayText(displayName);
      $emit('update:selectedValue', { id: entityId, displayName });
    } else {
      logger.debug(`(SearchListInput) obtaining value display text from cache: ctrlKey=${props.ctrlKey}, id=${entityId}, type=${props.type}`);
      const cachedEntity = await getCityFromCache(entityId, true);
      if (cachedEntity) {
        selectedItemName = searchTerm.value = getItemDisplayText(cachedEntity.displayName);
        updateSelectedValue(cachedEntity!);
      } else {
        logger.warn(`(SearchListInput) failed to obtain value display text: ctrlKey=${props.ctrlKey}, id=${entityId}, type=${props.type}`);
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
      ref="inputEl"
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
                :key="`${props.ctrlKey}-SearchRes-${idx}`"
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
