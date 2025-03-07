import { type EntityId, AppConfig, eraseTimeOfDay, type IAppLogger, AppException, AppExceptionCodeEnum, DefaultFlightClass, DefaultFlightTripType, FlightMinPassengers, StaysMinGuestsCount, StaysMinRoomsCount } from '@golobe-demo/shared';
import { StoreKindEnum } from '../helpers/constants';
import { toShortForm } from './../helpers/components';
import { buildStoreDefinition } from '../helpers/stores/pinia';
import isArray from 'lodash-es/isArray';
import isString from 'lodash-es/isString';
import { defu } from 'defu';
import dayjs from 'dayjs';
import type { ComputedRef } from 'vue';
import { isCommonControl, isSpecificControl, type ControlKey } from '../helpers/components';

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
type ValueConverterOptions<TModelValue> = { valueConverter: ValueConverter<TModelValue> };
type ControlValueOptions<TModelValue> = {
  defaultValue?: TModelValue | ControlValueInitializer<TModelValue>,
  persistent?: boolean
} & ValueConverterOptions<TModelValue>;

type ControlValueRuntimeOptions<TModelValue = ControlStoreValue> = ControlValueOptions<TModelValue> & {
  initialOverwrite?: TModelValue | ControlValueInitializer<TModelValue>
};
export type ControlValueInfo<TModelValue = ControlStoreValue> = ValueMetaInfo & ControlValueRuntimeOptions<TModelValue>;
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
  from: (value) => value?.toString(),
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

const DateValueConverter: ValueConverter<Date> = {
  from: (value) => value?.toISOString() ?? null,
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
  from: (value) => value?.map(x => x.toISOString()) ?? null,
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
  s_controlValues: Map<string, ControlValueInfo<unknown>>
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

function getValueDefaultOptions(key: ControlValueKey, logger: IAppLogger): ControlValueOptions<any> {
  let commonTypeDefaults: ControlValueOptions<any>;
  if(isCommonControl(key, 'SearchList')) {
    commonTypeDefaults = { persistent: true, valueConverter: StringValidator } as ControlValueOptions<EntityId>;
  } else if(isCommonControl(key, 'Dropdown')) {
    commonTypeDefaults = { persistent: true, valueConverter: StringValidator } as ControlValueOptions<string>;
  } else if(isCommonControl(key, 'Counter')) {
    commonTypeDefaults = { persistent: true, valueConverter: NumberValueConverter } as ControlValueOptions<number>;
  } else if(isCommonControl(key, 'DatePicker')) {
    commonTypeDefaults = { persistent: true, valueConverter: DateValueConverter } as ControlValueOptions<Date>;
  } else if(isCommonControl(key, 'DateRangePicker')) {
    commonTypeDefaults = { persistent: true, valueConverter: DateRangeValueConverter } as ControlValueOptions<Date[]>;
  } else if(isCommonControl(key, 'OptionBtnGroup')) {
    commonTypeDefaults = { persistent: true, valueConverter: ControlKeyValueConverter } as ControlValueOptions<ControlKey>;
  } else if(isCommonControl(key, 'CollapsableSection')) {
    commonTypeDefaults = { persistent: true, valueConverter: BoleanValueConverter } as ControlValueOptions<boolean>;
  } else {
    logger.error(`unknown value key`, undefined, { key });
    throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'unknown value', 'error-page');
  }

  let specificControlDefaults: Partial<ControlValueOptions<any>> | undefined;
  // Dropdowns
  if(isSpecificControl(key, ['SearchOffers', 'FlightOffers', 'TripType', 'Dropdown'])) {
    specificControlDefaults = { defaultValue: DefaultFlightTripType };
  } else if(isSpecificControl(key, ['SearchOffers', 'FlightOffers', 'FlightParams', 'FlightClass', 'Dropdown'])) {
    specificControlDefaults = { defaultValue: DefaultFlightClass };
  // Search offer counter
  } else if(isSpecificControl(key, ['SearchOffers', 'FlightOffers', 'FlightParams', 'NumPassengers', 'Counter'])) {
    specificControlDefaults = { defaultValue: FlightMinPassengers };  
  } else if(isSpecificControl(key, ['SearchOffers', 'StayOffers', 'Rooms', 'Counter'])) {
    specificControlDefaults = { defaultValue: StaysMinRoomsCount };  
  } else if(isSpecificControl(key, ['SearchOffers', 'StayOffers', 'Guests', 'Counter'])) {
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
    specificControlDefaults = { defaultValue: () => dayjs().add(AppConfig.autoInputDatesRangeDays, 'day').toDate() };
  // Option button group
  } else if(isSpecificControl(key, ['SearchOffers', 'OptionBtnGroup'])) {
    specificControlDefaults = { persistent: false };
  } else if(isSpecificControl(key, ['Page', 'Favourites', 'OptionBtnGroup'])) {
    specificControlDefaults = { persistent: false };
  }

  return defu(
    commonTypeDefaults, 
    specificControlDefaults ?? {},
    { 
      persistent: false, 
      valueConverter: undefined as any 
    }
  );
};

const evalControlValue = <TModelValue>(
  value : TModelValue | ControlValueInitializer<TModelValue> | undefined
) => (value && (typeof value === 'function')) ? ((value as any)() as TModelValue) : value;

function getDefaultValueOnServer<TModelValue>(
  key: ControlValueKey, 
  options: Partial<ControlValueRuntimeOptions<TModelValue>> | undefined,
  logger: IAppLogger
): TModelValue {
  const defaultOptions = getValueDefaultOptions(key, logger);
  const result = 
    evalControlValue(options?.initialOverwrite) ?? 
    evalControlValue(options?.defaultValue) ?? 
    evalControlValue(defaultOptions.defaultValue);
  if(!result) {
    logger.error(`control value can be available on server only if default value is specified`, undefined, { key });
    throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'control value is not available on server', 'error-page');
  }
  return result;
};

function convertStoreToModel<TModelValue>(
  key: ControlValueKey, 
  storeValue: ControlStoreValue, 
  options: ControlValueOptions<TModelValue>, 
  logger: IAppLogger
): TModelValue {
  if(options.valueConverter) {
    const valueConverter = options.valueConverter;
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
  modelValue: TModelValue, 
  options: ControlValueOptions<TModelValue>, 
  logger: IAppLogger
): ControlStoreValue {
  let storeValue: ControlStoreValue;
  const valueConverter = options.valueConverter as ValueConverter<TModelValue>;
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

const StoreDef = buildStoreDefinition(StoreId, 
  () => { 
    // TODO: uncomment preview state
    // const { enabled } = usePreviewState();
    const enabled = false;
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
      values(): ReadonlyMap<string, ControlValueInfo<unknown>> {
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
        const valueInfo = this.values.get(toShortForm(key))! as ControlValueInfo<TModelValue>;
        const storeValue = valueInfo.value;
        return convertStoreToModel<TModelValue>(key, storeValue, valueInfo, logger);
      },

      /**
       * Set specified control value.
       * If value is not being tracked at the time {@link setValue} method is invoked (e.g. 
       * responsible controls haven't been mounted yet) it will be instantiated with respective 
       * settings taken via {@link getValueDefaultOptions}
       */
      async setValue<TModelValue = ControlStoreValue>(
        key: ControlValueKey, 
        value: TModelValue
      ): Promise<void> {
        this.updateControlValue({ 
          key, 
          value: { modelValue: value } 
        });
      },

      /**
       * Returns ref to value's editing state to be used as models in control components
       * @param options optionally overwrite default options:
       * - {@link defaultValue} value to use if local user input history is empty
       * - {@link persistent} whether to persist value in local storage and restore it in subsequent app launches, e.g. when browser restarts 
       * - {@link initialOverwrite} force overwrite any default or history values with specified in {@link initialOverwrite}
       * @returns writable computed ref to value's editing state
       */
      acquireValueRef<TModelValue = ControlStoreValue>(
        key: ControlValueKey, 
        options?: Partial<ControlValueRuntimeOptions<TModelValue>>
      ): { valueRef: WritableComputedRef<TModelValue> } {
        const logger = this.getLogger();
        
        if(import.meta.server) {
          const defaultValue = getDefaultValueOnServer(key, options, logger);
          return {
            valueRef: computed({
              get: () => {
                return defaultValue;
              },
              set: () => {}
            })
          };
        }
        
        this.ensureValueTracked({ 
          key, 
          options: options as ControlValueRuntimeOptions<unknown>
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
              (valueInfo as any) as ControlValueOptions<TModelValue>, 
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
        options?: Partial<ControlValueRuntimeOptions<unknown>>
      }) {
        const logger = this.getLogger();

        const shortKey = toShortForm(args.key);
        if(this.values.has(shortKey)) {
          return;
        }
 
        const defaultOptions = getValueDefaultOptions(args.key, logger);
        const mergedOptions: ControlValueRuntimeOptions<unknown> = defu(
          args.options, 
          defaultOptions, 
          { 
            persistent: false, 
            fullKey: args.key,
            valueConverter: undefined as any 
          }
        );

        if(import.meta.server) {
          getDefaultValueOnServer(args.key, args.options, logger); 
          return;
        }

        let initialModelValue: any;
        if(!mergedOptions.persistent) {
          initialModelValue = evalControlValue(mergedOptions.initialOverwrite ?? mergedOptions.defaultValue);
          logger.verbose(`initializing non-persistent value`, { key: args.key, controlValue: initialModelValue });
        } else {
          const savedValue = this.loadValue(args.key);
          const savedModelValue = savedValue ? convertStoreToModel(args.key, savedValue, mergedOptions, logger) : undefined;
          initialModelValue = evalControlValue(mergedOptions.initialOverwrite ?? savedModelValue ?? mergedOptions.defaultValue);
          logger.verbose(`initializing persistent value`, { key: args.key, controlValue: initialModelValue });
        }

        const initialStoreValue = convertModelToStore(
          args.key,
          initialModelValue,
          mergedOptions,
          logger
        );
        const initialControlValueInfo: ControlValueInfo<unknown> = {
          ...mergedOptions,
          fullKey: args.key,
          value: initialStoreValue ?? null,
        };
        this.$patch((s) => { 
          s.s_controlValues.set(shortKey, initialControlValueInfo);
        });

        this.updateControlValue({
          key: args.key,
          value: { storeValue: initialStoreValue },
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
          logger.verbose(`value not being tracked - initializing with registry value`, { key: args.key, controlValue: 'modelValue' in args.value ? args.value.modelValue : args.value.storeValue });
          this.ensureValueTracked({ key: args.key });
          valueInfo = this.s_controlValues.get(shortKey)!;
        }

        const storeValue = 'modelValue' in args.value ? 
          convertModelToStore(
            args.key,
            args.value.modelValue,
            valueInfo,
            logger
          ) : args.value.storeValue;
        this.$patch((s) => { 
          s.s_controlValues.set(shortKey, {
            ...valueInfo,
            value: storeValue,
            agentUpdateTimestamp: timestamp
          });
        });

        if(valueInfo?.persistent) {
          this.storeValue({ key: args.key, value: storeValue });
        }
      },

      storeValue(args: { key: ControlValueKey, value: ControlStoreValue }) {
        const logger = this.getLogger();
        logger.debug(`persisting value`, { key: args.key, controlValue: args.value });
        const strValue = args.value ?? null;
        saveControlValue(args.key, strValue, logger);
      },

      loadValue(key: ControlValueKey): ControlStoreValue {
        const logger = this.getLogger();
        logger.debug(`loading value`, { key });
        return readControlValue(key, logger) ?? null;
      },
    }
  }
);

export const useControlValuesStore = defineStore(StoreId, StoreDef);