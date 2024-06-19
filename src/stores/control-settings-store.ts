import isArray from 'lodash-es/isArray';
import isString from 'lodash-es/isString';
import { type EntityId } from '../shared/interfaces';

export type ControlValueSettingType = EntityId | string;
export interface IControlValueSetting<T = ControlValueSettingType | ControlValueSettingType[]> {
  ctrlKey: string,
  value?: T | undefined
}

export const useControlSettingsStore = defineStore('controlSettingsStore', () => {
  const logger = CommonServicesLocator.getLogger();

  const valueSettingsCache = new Map<string, IControlValueSetting<any>>();

  const getControlValueSettingStorageKey = function (ctrlKey: string) {
    return `ctrlValue:${ctrlKey}`;
  };

  const persistControlValueSetting = <T = ControlValueSettingType | ControlValueSettingType[]>(ctrlKey: string, value?: T | undefined) => {
    logger.debug(`(controlSettingsStore) persisting control value setting: ctrlKey=${ctrlKey}, value=${value ?? '[none]'}`);
    if (value) {
      localStorage.setItem(getControlValueSettingStorageKey(ctrlKey), JSON.stringify(value));
      logger.debug(`(controlSettingsStore) control value setting persisted: ctrlKey=${ctrlKey}, value=${value}`);
    } else {
      localStorage.removeItem(getControlValueSettingStorageKey(ctrlKey));
      logger.debug(`(controlSettingsStore) control value setting remove: ctrlKey=${ctrlKey}, value=${value ?? '[none]'}`);
    }
  };

  const readControlValueSetting = (ctrlKey: string) : ControlValueSettingType | ControlValueSettingType[] | undefined => {
    logger.debug(`(controlSettingsStore) reading control value setting: ctrlKey=${ctrlKey}}`);
    const itemRaw = localStorage.getItem(ctrlKey);
    let result: ControlValueSettingType | ControlValueSettingType[] | undefined;
    if (itemRaw) {
      if (!result) {
        try {
          result = JSON.parse(itemRaw);
          if (isArray(result)) {
            logger.debug(`(controlSettingsStore) control value setting read (array): ctrlKey=${ctrlKey}'}, value=${result}`);
            return result;
          } else if (isString(result)) {
            logger.debug(`(controlSettingsStore) control value setting read (string): ctrlKey=${ctrlKey}'}, value=${result}`);
            return result;
          }
        } catch (err: any) {
          // should try another format
        }
      }
      if (!result) {
        result = itemRaw.toString();
        logger.debug(`(controlSettingsStore) control value setting read (string): ctrlKey=${ctrlKey}'}, value=${result}`);
        return result;
      }
    }
    logger.debug(`(controlSettingsStore) control value setting read (empty): ctrlKey=${ctrlKey}'}`);
    return undefined;
  };

  /**
   *
   * @param ctrlKey Identifier of using component
   * @param defaultValue Default value to use, starting from SSR and passing to client
   * @param persistent Whether to store value in localStorage. Note, this will break SSR, because localStorage is not available on server.
   * So, using component must be ClientOnly
   */
  const getControlValueSetting = <T = ControlValueSettingType | ControlValueSettingType[]>(ctrlKey: string, defaultValue?: T | undefined, persistent?: boolean): IControlValueSetting<T> => {
    persistent ??= false;
    logger.debug(`(controlSettingsStore) accessing control value settings: ctrlKey=${ctrlKey}, persistent=${persistent}, defaultValue=${defaultValue}`);
    let cached: any = (valueSettingsCache.get(ctrlKey) as IControlValueSetting<T>) ?? undefined;
    if (!cached) {
      logger.verbose(`(controlSettingsStore) registering new control value settings: ctrlKey=${ctrlKey}, persistent=${persistent}, defaultValue=${defaultValue}`);
      const initialValue = import.meta.client ? (readControlValueSetting(getControlValueSettingStorageKey(ctrlKey)) ?? defaultValue) : defaultValue;
      cached = reactive({
        ctrlKey,
        value: initialValue
      });
      valueSettingsCache.set(ctrlKey, cached);
    }
    if (persistent && import.meta.client) {
      watch(cached, () => {
        logger.debug(`(controlSettingsStore) value changed: ctrlKey=${ctrlKey}, persistent=${persistent}, value=${cached.value}`);
        persistControlValueSetting(ctrlKey, cached.value);
      }, { deep: true });
    }
    logger.debug(`(controlSettingsStore) control value settings accessed: ctrlKey=${ctrlKey}, persistent=${persistent} currentValue=${JSON.stringify(cached?.value)}`);
    return cached!;
  };

  return {
    getControlValueSetting
  };
});
