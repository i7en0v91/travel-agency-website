import { type EntityId, AppConfig, eraseTimeOfDay, type IAppLogger, AppException, AppExceptionCodeEnum, DefaultFlightClass, DefaultFlightTripType, FlightMinPassengers, StaysMinGuestsCount, StaysMinRoomsCount, DefaultFlightOffersSorting, DefaultStayOffersSorting } from '@golobe-demo/shared';
import { UserAccountPageCtrlKey, StoreKindEnum, FindFlightsPageCtrlKey, FindStaysPageCtrlKey, DefaultTimeRangeFilter } from '../helpers/constants';
import { getFunctionalElementKey, RESET_TO_DEFAULT, toShortForm } from './../helpers/components';
import { buildStoreDefinition, type PublicStore } from '../helpers/stores/pinia';
import isArray from 'lodash-es/isArray';
import isString from 'lodash-es/isString';
import deepmerge from 'lodash-es/merge';
import { destr } from 'destr';
import dayjs from 'dayjs';
import type { ComputedRef } from 'vue';
import { isCommonControl, isSpecificControl, isNestedControl, type ControlKey } from '../helpers/components';
import type { SearchOffersFilterRange, SearchOffersFilterVariantId } from '../types';
import omit from 'lodash-es/omit';

/** Control value identifier, usually a component key */
export type ControlValueKey = ControlKey;

/** Control value, e.g. entity identifier */
type ControlSingleValue = string | null;
/** Value type which store can hold, must be easy serializable */
export type ControlStoreValue = ControlSingleValue | Exclude<ControlSingleValue, null>[];
type ControlValueValueObjProp = { value: ControlStoreValue };
/** Base type for additional information about control value */
type ValueMetaInfo = { 
  /** browser's timeline-aligned value last update timestamp */
  agentUpdateTimestamp?: number,
  fullKey: ControlKey
} & ControlValueValueObjProp;
type ControlValueInitializer<TModelValue> = (() => TModelValue);
type ValueConverter<TModelValue> = 
TModelValue extends boolean ? { 
  /** {@link storeValue} may be undefined when local storage/settings are empty */
  to: (storeValue: ControlStoreValue | undefined) => boolean | null, 
  from: (modelValue: boolean) => ControlStoreValue | null
} :
TModelValue extends ControlStoreValue ? { 
  /** {@link storeValue} may be undefined when local storage/settings are empty */
  isStoredValueAcceptable: (storeValue: ControlStoreValue | undefined) => boolean 
} : { 
  to: (storeValue: ControlStoreValue) => TModelValue | null, 
  from: (modelValue: TModelValue) => ControlStoreValue | null
};
/** Options which can be serialized and passed in the store */
type ControlValueStoreOptions = {
  /** Whether control value needs to be persisted in local storage and restored on next setup */
  persistent?: boolean
};
type ValueConverterOptions<TModelValue> = { valueConverter: ValueConverter<TModelValue> };
/** All options including {@link ControlValueStoreOptions} and non-serializeable options like functions */
type ControlValueAllOptions<TModelValue> = ControlValueStoreOptions & {
  /** Default value used when user settings/last selected values are empty */
  defaultValue?: TModelValue | ControlValueInitializer<TModelValue>,
  /** Allows to overwrite any default or last selected value during setup */
  initialOverwrite?: TModelValue | ControlValueInitializer<TModelValue>,
  
} & ValueConverterOptions<TModelValue>;
export type ControlValueInfo = ValueMetaInfo & ControlValueStoreOptions;
type ControlValueSettingType = EntityId | string;

const StringValidator: ValueConverter<ControlStoreValue> = {
  isStoredValueAcceptable: (value: ControlStoreValue | undefined) => {
    if(value === null || value === undefined) {
      return true;
    }
    if(typeof value !== 'string') {
      return false;
    }
    return true;
  }
};

const NumberValueConverter: ValueConverter<number> = {
  from: (value) => value.toString(),
  to: (value) =>  {
    if(!value) {
      return null;
    }

    if(typeof value !== 'string') {
      throw new Error('incorrect value type');
    };
    const result = parseInt(value);
    if(Number.isNaN(result) || result === Infinity) {
      throw new Error('incorrect value');
    };

    return result;
  }
};

const ControlKeyValueConverter: ValueConverter<ControlKey> = {
  from: (value: ControlKey) => { 
    if(!isArray(value)) {
      throw new Error('incorrect control key value type');
    }
    return value.join(':');
  },
  to: (value): ControlKey | null => {
    if(!value) {
      return null;
    }
    if(typeof value !== 'string') {
      throw new Error('incorrect value type');
    };

    return value.split(':') as ControlKey;
  }
};

const BoleanValueConverter: ValueConverter<boolean> = {
  from: (value: boolean) => value ? 'true' : 'false',
  to: (value): boolean | null => {
    if(!value) {
      return null;
    }
    if(typeof value !== 'string') {
      throw new Error('incorrect value type');
    };

    const normalizedValue = value.trim().toLowerCase();
    switch(normalizedValue) {
      case 'true':
      case '1':
        return true as boolean;
      case 'false':
      case '0':
        return false as boolean;
      default:
        throw new Error('incorrect value');
    }
  }
};

const RangeFilterValueConverter: ValueConverter<SearchOffersFilterRange> = {
  from: (value: SearchOffersFilterRange) => JSON.stringify(value),
  to: (value): SearchOffersFilterRange | null => {
    if(!value) {
      return null;
    }
    if(typeof value !== 'string') {
      throw new Error('incorrect value type');
    };
    const normalizedValue = value.trim();
    if(!normalizedValue.length) {
      return null;
    }

    const parsed = destr<SearchOffersFilterRange>(normalizedValue);
    if(!parsed) {
      throw new Error('failed to parse range filter');
    }
    return parsed;
  }
};

const DateValueConverter: ValueConverter<Date> = {
  from: (value) => value.toISOString(),
  to: (value) =>  {
    if(!value) {
      return null;
    }

    if(typeof value !== 'string') {
      throw new Error('incorrect value  type');
    };
    return eraseTimeOfDay(new Date(value));
  }
};

const DateRangeValueConverter: ValueConverter<Date[]> = {
  from: (value) => value.map(x => x.toISOString()),
  to: (value) =>  {
    if(!value) {
      return null;
    }

    if(!isArray(value)) {
      throw new Error('incorrect value type');
    };
    return value.map(x => eraseTimeOfDay(new Date(x)));
  }
};

declare type State = {
  s_controlValues: Map<string, ControlValueInfo>
};

const StoreId = StoreKindEnum.ControlValues;

function getControlValueKey(ctrlKey: ControlKey) {
  return `CtrlVal:${toShortForm(ctrlKey)}`;
};

function saveControlValue(
  ctrlKey: ControlKey, 
  value: ControlValueSettingType | ControlValueSettingType[] | null, 
  logger: IAppLogger
) {
  logger.debug(`saving control value settings`, { ctrlKey, controlValue: value });
  const settingsKey = getControlValueKey(ctrlKey);
  if (value) {
    const serializedValue = JSON.stringify(value);
    localStorage.setItem(settingsKey, serializedValue);
    logger.debug(`control value settings saved`, { ctrlKey, controlValue: value });
  } else {
    localStorage.removeItem(settingsKey);
    logger.debug(`control value settings removed`, { ctrlKey, controlValue: value });
  }
};

function readControlValue (ctrlKey: ControlKey, logger: IAppLogger): 
  ControlValueSettingType | ControlValueSettingType[] | undefined {
  logger.debug(`reading control value setting`, { ctrlKey });
  const settingsKey = getControlValueKey(ctrlKey);
  const itemRaw = localStorage.getItem(settingsKey);
  let result: ControlValueSettingType | ControlValueSettingType[] | undefined;
  if (itemRaw) {
    if (!result) {
      try {
        result = JSON.parse(itemRaw);
        if (isArray(result)) {
          logger.debug(`control value setting read (array)`, { ctrlKey, controlValue: result });
          return result;
        } else if (isString(result)) {
          logger.debug(`control value setting read (string)`, { ctrlKey, controlValue: result });
          return result;
        }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (err: any) {
        // should try another format
      }
    }
    if (!result) {
      result = itemRaw.toString();
      logger.debug(`control value setting read (string)`, { ctrlKey, controlValue: result });
      return result;
    }
  }
  logger.debug(`control value setting read (empty)`, { ctrlKey });
  return undefined;
};

function getCurrentTimestamp() {
  return new Date().getTime();
}

function mergeOptions(...sources: Partial<ControlValueAllOptions<any>>[]): Partial<ControlValueAllOptions<any>> {
  if(!sources?.length) {
    return {};
  } else if(sources.length === 1) {
    return sources[0];
  } else {
    return deepmerge(sources[0], ...sources.slice(1));
  }
}

function getValueDefaultOptions(key: ControlValueKey, logger: IAppLogger): ControlValueAllOptions<any> {
  let commonTypeDefaults: ControlValueAllOptions<any>;
  if(isCommonControl(key, 'SearchList')) {
    commonTypeDefaults = { persistent: true, valueConverter: StringValidator } as ControlValueAllOptions<EntityId>;
  } else if(isCommonControl(key, 'Dropdown')) {
    commonTypeDefaults = { persistent: true, valueConverter: StringValidator } as ControlValueAllOptions<string>;
  } else if(isCommonControl(key, 'Counter')) {
    commonTypeDefaults = { persistent: true, valueConverter: NumberValueConverter } as ControlValueAllOptions<number>;
  } else if(isCommonControl(key, 'DatePicker')) {
    commonTypeDefaults = { persistent: true, valueConverter: DateValueConverter } as ControlValueAllOptions<Date>;
  } else if(isCommonControl(key, 'DateRangePicker')) {
    commonTypeDefaults = { persistent: true, valueConverter: DateRangeValueConverter } as ControlValueAllOptions<Date[]>;
  } else if(isCommonControl(key, 'TabGroup')) {
    commonTypeDefaults = { persistent: true, valueConverter: ControlKeyValueConverter } as ControlValueAllOptions<ControlKey>;
  } else if(isCommonControl(key, 'Accordion')) {
    commonTypeDefaults = { persistent: true, defaultValue: true, valueConverter: BoleanValueConverter } as ControlValueAllOptions<boolean>;
  } else if(isCommonControl(key, 'RangeFilter')) {
    commonTypeDefaults = { persistent: false, defaultValue: undefined, valueConverter: RangeFilterValueConverter } as ControlValueAllOptions<SearchOffersFilterRange>;
  } else if(isCommonControl(key, 'ChecklistFilter')) {
    commonTypeDefaults = { persistent: false, defaultValue: undefined } as ControlValueAllOptions<SearchOffersFilterVariantId[]>;
  } else if(isCommonControl(key, 'ChoiceFilter')) {
    commonTypeDefaults = { persistent: false, defaultValue: undefined } as ControlValueAllOptions<SearchOffersFilterVariantId>;
  } else {
    logger.error(`unknown value key`, undefined, { key });
    throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'unknown value', 'error-page');
  }

  let specificControlDefaults: Partial<ControlValueAllOptions<any>> | undefined;
  // Dropdowns
  if(isSpecificControl(key, ['SearchOffers', 'FlightOffers', 'TripType', 'Dropdown'])) {
    specificControlDefaults = { defaultValue: DefaultFlightTripType };
  } else if(isSpecificControl(key, ['SearchOffers', 'FlightOffers', 'FlightParams', 'FlightClass', 'Dropdown'])) {
    specificControlDefaults = { defaultValue: DefaultFlightClass };
  } else if(isSpecificControl(key, [...FindFlightsPageCtrlKey, 'ListView', 'ResultItemsList', 'SecondarySort', 'Dropdown'])) {
    specificControlDefaults = { defaultValue: DefaultFlightOffersSorting };
  } else if(isSpecificControl(key, [...FindStaysPageCtrlKey, 'ListView', 'ResultItemsList', 'SecondarySort', 'Dropdown'])) {
    specificControlDefaults = { defaultValue: DefaultStayOffersSorting };
  } else if(isSpecificControl(key, [...UserAccountPageCtrlKey, 'TabGroup', 'History', 'Tab', 'TimeRangeFilter', 'Dropdown'])) {
    specificControlDefaults = { defaultValue: DefaultTimeRangeFilter };
  // Search offer counter
  } else if(isSpecificControl(key, ['SearchOffers', 'FlightOffers', 'FlightParams', 'NumPassengers', 'Counter'])) {
    specificControlDefaults = { defaultValue: FlightMinPassengers };  
  } else if(isSpecificControl(key, ['SearchOffers', 'StayOffers', 'StayParams', 'Rooms', 'Counter'])) {
    specificControlDefaults = { defaultValue: StaysMinRoomsCount };  
  } else if(isSpecificControl(key, ['SearchOffers', 'StayOffers', 'StayParams', 'Guests', 'Counter'])) {
    specificControlDefaults = { defaultValue: StaysMinGuestsCount };  
  // Date pickers
  } else if(isSpecificControl(key, ['SearchOffers', 'FlightOffers', 'Dates', 'DatePicker'])) {
    specificControlDefaults = { defaultValue: () => eraseTimeOfDay(dayjs().toDate()) };
  } else if(isSpecificControl(key, ['SearchOffers', 'FlightOffers', 'Dates', 'DateRangePicker'])) {
    specificControlDefaults = { 
      defaultValue: () => {
        const deteFrom = eraseTimeOfDay(dayjs().utc(true).toDate());
        const dateTo = eraseTimeOfDay(dayjs().utc(true).add(AppConfig.autoInputDatesRangeDays, 'day').toDate());
        return [deteFrom, dateTo];
      }
    };
  } else if(isSpecificControl(key, ['SearchOffers', 'StayOffers', 'CheckIn', 'DatePicker'])) {
    specificControlDefaults = { defaultValue: () => eraseTimeOfDay(dayjs().toDate()) };
  } else if(isSpecificControl(key, ['SearchOffers', 'StayOffers', 'CheckOut', 'DatePicker'])) {
    specificControlDefaults = { defaultValue: () => eraseTimeOfDay(dayjs().add(AppConfig.autoInputDatesRangeDays, 'day').toDate()) };
  // Tabs group
  } else if(isSpecificControl(key, ['SearchOffers', 'TabGroup'])) {
    specificControlDefaults = { persistent: false };
  } else if(isSpecificControl(key, ['Page', 'Favourites', 'TabGroup'])) {
    specificControlDefaults = { persistent: false };
  } else if(isSpecificControl(key, [...FindFlightsPageCtrlKey, 'ListView', 'ResultItemsList', 'TabGroup'])) {
    specificControlDefaults = { 
      defaultValue: getFunctionalElementKey({ sortOption: DefaultFlightOffersSorting, isPrimary: true }) 
    };
  } else if(isSpecificControl(key, [...FindStaysPageCtrlKey, 'ListView', 'ResultItemsList', 'TabGroup'])) {
    specificControlDefaults = { 
      defaultValue: getFunctionalElementKey({ sortOption: 'hotels', isPrimary: true })
    };
  }

  // disable storing search params in user preferences on find offers pages
  if(
    isNestedControl(key, [...FindFlightsPageCtrlKey, 'ListView', 'ResultItemsList']) ||
    isNestedControl(key, [...FindStaysPageCtrlKey, 'ListView', 'ResultItemsList'])
  ) {
    specificControlDefaults ??= { persistent: false };
    specificControlDefaults.persistent = false;
  }

 return mergeOptions(
  { 
    persistent: false, 
    valueConverter: undefined as any 
  },
  commonTypeDefaults, 
  specificControlDefaults ?? {}
 ) as ControlValueAllOptions<any>;
};

function getValueConverter<TModelValue>(key: ControlValueKey, logger: IAppLogger) {
  const defaultOptions = getValueDefaultOptions(key, logger) as ControlValueAllOptions<TModelValue>;
  return defaultOptions.valueConverter;
}

function applyOptionsOverDefaults<TModelValue>(
  key: ControlValueKey, 
  options: Partial<ControlValueStoreOptions> | undefined,
  logger: IAppLogger
): ControlValueAllOptions<TModelValue> {
  const defaultOptions = getValueDefaultOptions(key, logger);
  const mergedOptions = mergeOptions(
    { 
      persistent: false, 
      fullKey: key,
      value: null,
      valueConverter: undefined as any 
    } as any, 
    defaultOptions, 
    options ?? {}
  ) as ControlValueAllOptions<TModelValue>;
  return mergedOptions;
}

function pickStoreOptionsOnly<TOptions extends ControlValueStoreOptions>(
  options: ControlValueAllOptions<any> | ControlValueInfo
): TOptions {
 return omit(options, ['defaultValue', 'initialOverwrite', 'valueConverter']) as TOptions;
}

const evalControlValue = <TModelValue>(
  value : TModelValue | ControlValueInitializer<TModelValue> | undefined
) => (value && (typeof value === 'function')) ? ((value as any)() as TModelValue) : value;

function convertStoreToModel<TModelValue>(
  key: ControlValueKey, 
  storeValue: ControlStoreValue, 
  logger: IAppLogger
): TModelValue {
  const valueConverter = getValueConverter(key, logger) as ValueConverter<TModelValue>;
  if(valueConverter) {
    if('isStoredValueAcceptable' in valueConverter) {
      if(!valueConverter.isStoredValueAcceptable(storeValue)) {
        logger.warn(`store value is not acceptable`, undefined, { key, controlValue: storeValue });
        throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'value is not acceptable', 'error-stub');
      }
    } else {
      try {
        return valueConverter.to(storeValue) as TModelValue;
      } catch(err: any) {
        logger.warn(`failed to convert model to store value`, err, { key, controlValue: storeValue });
        throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'failed to convert model value', 'error-stub');
      }
    }
  }
   
  return storeValue as TModelValue;
}

function convertModelToStore<TModelValue>(
  key: ControlValueKey, 
  modelValue: TModelValue | null | undefined, 
  logger: IAppLogger
): ControlStoreValue {
  if(modelValue === null || modelValue === undefined) {
    return null;
  }

  let storeValue: ControlStoreValue;
  const valueConverter = getValueConverter(key, logger) as ValueConverter<TModelValue>;
  if(valueConverter && 'from' in valueConverter) {
    try {
      storeValue = valueConverter.from(modelValue as any);
    } catch(err: any) {
      logger.warn(`failed to convert model to store value`, err, { key, controlValue: modelValue });
      throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'failed to convert model value', 'error-stub');
    }
  } else {
    storeValue = modelValue as ControlStoreValue;
  }
  return storeValue;
}

const storeDefBuilder = () => buildStoreDefinition(StoreId, 
  () => {
    return {};
  },
  {
    state: (): State => {
      return { 
        s_controlValues: new Map([])
      };
    },
    getters: {
      /**
       * All tracked control values
       */
      values(): ReadonlyMap<string, ControlValueInfo> {
        return this.s_controlValues;
      }
    },
    actions: {
      /**
       * Get current value of specified control.
       * If value is not being tracked at the time {@link getValue} method is invoked (e.g. 
       * responsible controls haven't been mounted yet) it will be instantiated with respective 
       * settings taken via {@link getValueDefaultOptions}
       */
      async getValue<TModelValue = ControlStoreValue>(
        key: ControlValueKey
      ): Promise<TModelValue> {
        this.ensureValueTracked({ 
          key
        });

        const logger = this.getLogger();
        const valueInfo = this.values.get(toShortForm(key))! as ControlValueInfo;
        const storeValue = valueInfo.value;
        return convertStoreToModel<TModelValue>(key, storeValue, logger);
      },

      /**
       * Set specified control value.
       * If value is not being tracked at the time {@link setValue} method is invoked (e.g. 
       * responsible controls haven't been mounted yet) it will be instantiated with respective 
       * settings taken via {@link getValueDefaultOptions}
       */
      async setValue<TModelValue>(
        key: ControlValueKey, 
        value: TModelValue | typeof RESET_TO_DEFAULT
      ): Promise<void> {

        if(value === RESET_TO_DEFAULT) {
          this.resetToDefault(key);
        } else {
          this.updateControlValue({ 
            key, 
            value: { modelValue: value } 
          });
        }
      },

      /**
       * Returns ref to value's editing state to be used as models in control components
       * @param options optionally overwrite default options {@link getValueDefaultOptions}
       * @returns writable computed ref to value's editing state
       */
      acquireValueRef<TModelValue = ControlStoreValue>(
        key: ControlValueKey, 
        options?: Partial<ControlValueStoreOptions>
      ): { valueRef: WritableComputedRef<TModelValue> } {
        const logger = this.getLogger();
        
        this.ensureValueTracked({ 
          key, 
          options: options as ControlValueStoreOptions
        });

        const shortKey = toShortForm(key);
        const valueRef = computed<TModelValue>({
          get: () =>  {
            const valueInfo = this.values.get(shortKey);
            if(!valueInfo) {
              logger.warn(`get failed - value not being tracked`, undefined, { key });
              throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'vaule not being tracked', 'error-stub');
            }

            return convertStoreToModel<TModelValue>(
              key, 
              valueInfo.value,
              logger
            );
          },
          set: (value: TModelValue) => {
            this.updateControlValue({ 
              key: key, 
              value: { modelValue: value } 
            });
          }
        });
        return { valueRef: valueRef };
      },

      /**
       * Returns computed ref based on reactive state of other values
       * @param viewFn computation function which receives a list of values specified via {@link keys} (in order they were specified)
       * @param keys list of keys whose values to be passed in computation function {@link viewFn}.
       * If some of values (keys) are not being tracked at the time {@link acquireValuesView} method 
       * is invoked (e.g. responsible controls haven't been mounted yet) then they will be instantiated
       * with respective settings taken via {@link getValueDefaultOptions}
       */
      acquireValuesView<TViewResult>(
        viewFn: (...values: ComputedRef<unknown>[]) => TViewResult, 
        ...keys: ControlValueKey[]
      ): ComputedRef<TViewResult> {
        const logger = this.getLogger();
        if(!keys.length) {
          const C = viewFn();
          return computed(() => C);
        }

        const valueRefs = keys.map(k => this.acquireValueRef(k));
        logger.verbose(`values view - value refs acquired`, { keys });
        return computed(() => {
          const args = valueRefs.map(fr => fr.valueRef);
          return viewFn(...args);
        });
      }
    },
    patches: {
      ensureValueTracked(args: { 
        key: ControlValueKey,
        options?: Partial<ControlValueAllOptions<unknown>>
      }) {
        const logger = this.getLogger();

        const shortKey = toShortForm(args.key);
        if(this.values.has(shortKey)) {
          return;
        }
 
        const valueOptions = applyOptionsOverDefaults(
          args.key, 
          args.options ?? {}, 
          logger
        ) as ControlValueAllOptions<unknown>;

        let initialModelValue: any;
        if(!valueOptions.persistent) {
          initialModelValue = evalControlValue(valueOptions.initialOverwrite ?? valueOptions.defaultValue);
          logger.verbose(`initializing non-persistent value`, { key: args.key, controlValue: initialModelValue });
        } else {
          const savedValue = import.meta.client ? this.loadValue(args.key) : null;
          const savedModelValue = savedValue ? convertStoreToModel(args.key, savedValue, logger) : undefined;
          initialModelValue = evalControlValue(valueOptions.initialOverwrite ?? savedModelValue ?? valueOptions.defaultValue);
          logger.verbose(`initializing persistent value`, { key: args.key, controlValue: initialModelValue });
        }

        const initialStoreValue = convertModelToStore(
          args.key,
          initialModelValue,
          logger
        );
        const initialControlValueInfo: ControlValueInfo = {
          ...valueOptions,
          fullKey: args.key,
          value: initialStoreValue ?? null,
        };
        this.$patch((s) => { 
          s.s_controlValues.set(shortKey, pickStoreOptionsOnly(initialControlValueInfo));
        });

        this.updateControlValue({
          key: args.key,
          value: { storeValue: initialStoreValue },
          force: true
        });
      },

      resetToDefault(key: ControlValueKey) {
        const valueOptions = applyOptionsOverDefaults(
          key, 
          {}, 
          this.getLogger()
        ) as ControlValueAllOptions<unknown>;
        const defaultValue = evalControlValue(valueOptions.initialOverwrite ?? valueOptions.defaultValue);
        this.updateControlValue({
          key,
          value: { modelValue: defaultValue },
          force: true
        });
      },

      updateControlValue(args: { 
        key: ControlValueKey, 
        value: { modelValue: unknown } | { storeValue: ControlStoreValue }, 
        force?: boolean 
      }) {
        const logger = this.getLogger();
        logger.verbose(`updating value`, { key: args.key, controlValue: 'modelValue' in args.value ? args.value.modelValue : args.value.storeValue });
        const timestamp = getCurrentTimestamp();
        const shortKey = toShortForm(args.key);
        let valueInfo = this.s_controlValues.get(shortKey);
        if(!valueInfo) {
          const serverOnlyOptions: Partial<ControlValueAllOptions<unknown>> | undefined = 
            (import.meta.server && 'modelValue' in args.value) ? {
              initialOverwrite: args.value.modelValue
            } : undefined;
          logger.verbose(`value not being tracked - initializing with registry value`, { key: args.key, controlValue: 'modelValue' in args.value ? args.value.modelValue : args.value.storeValue,  serverOnlyOptions });
          this.ensureValueTracked({ 
            key: args.key, 
            options: serverOnlyOptions 
          });
          valueInfo = this.s_controlValues.get(shortKey)!;
        }

        const storeValue = 'modelValue' in args.value ? 
          convertModelToStore(
            args.key,
            args.value.modelValue,
            logger
          ) : args.value.storeValue;
        this.$patch((s) => { 
          s.s_controlValues.set(shortKey, pickStoreOptionsOnly({
            ...valueInfo,
            value: storeValue,
            agentUpdateTimestamp: timestamp
          }));
        });

        if(valueInfo?.persistent) {
          this.storeValue({ key: args.key, value: storeValue });
        }
      },

      storeValue(args: { key: ControlValueKey, value: ControlStoreValue }) {
        if(import.meta.server) {
          return;
        }

        const logger = this.getLogger();
        logger.debug(`persisting value`, { key: args.key, controlValue: args.value });
        const strValue = args.value ?? null;
        saveControlValue(args.key, strValue, logger);
      },

      loadValue(key: ControlValueKey): ControlStoreValue {
        if(import.meta.server) {
          throw new Error('loading value is not implemented on server');
        }

        const logger = this.getLogger();
        logger.debug(`loading value`, { key });
        return readControlValue(key, logger) ?? null;
      },
    }
  }
);
const StoreDef = storeDefBuilder();
const useControlValuesStoreInternal = defineStore(StoreId, StoreDef);
export const useControlValuesStore = useControlValuesStoreInternal as PublicStore<typeof storeDefBuilder>;
export type ControlValuesStoreInternal = ReturnType<typeof useControlValuesStoreInternal>;