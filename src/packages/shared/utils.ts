import isNumber from 'lodash-es/isNumber';
import Mime from 'mime';
import { hash } from 'ohash';
import isArray from 'lodash-es/isArray';

const CacheDirSeparator = ":";
const CachePrefix = ['cache', 'app'].join(CacheDirSeparator);

export type ControlKey<TControlKeyPart extends string | number = string | number> = TControlKeyPart[];

function compareLookupValues(entryValue: any, lookupValue: string, ignoreCase: boolean): boolean {
  if (!entryValue) {
    return false;
  }
  if(ignoreCase) {
    return entryValue.valueOf().toString().toLowerCase() === lookupValue;
  } else {
    return entryValue.valueOf().toString() === lookupValue;
  }
};

export function tryLookupKeyByValue<TKey extends string, TVal extends string | number, TObj extends Record<TKey, TVal>>(object: TObj, value: string | number | undefined | null, ignoreCase: boolean = true): TKey | undefined {
  if(value === undefined) {
    return undefined;
  }

  if(value === null) {
    return undefined;
  }

  if(!object) {
    return undefined;
  }

  if(isNumber(value)) {
    const matchedMembers = Object.entries(object).filter(e => isNumber(e[1]) && e[1] === value);
    return (matchedMembers.length > 0 ? matchedMembers[0][0] as TKey : undefined);
  } 

  const lookupValue = ignoreCase ? value.toString().toLowerCase() : value.toString();
  const matchedMembers = Object.entries(object).filter(e => compareLookupValues(e[1], lookupValue, ignoreCase));
  if (matchedMembers.length === 0) {
    return undefined;
  }

  return matchedMembers[0][0] as TKey;
}

export function lookupKeyByValueOrThrow<TKey extends string, TVal extends string | number, TObj extends Record<TKey, TVal>>(object: TObj, value: TVal | undefined | null, ignoreCase: boolean = true): TKey {
  if (!value) {
    throw new Error('lookup object is empty');
  }

  const result = tryLookupKeyByValue<TKey, TVal, TObj>(object, value, ignoreCase);
  if (!result) {
    throw new Error(`lookup key by value failed: object=[${JSON.stringify(object)}], value=[${value?.toString() ?? ''}]`);
  }

  return result;
}

export function tryLookupValue<TVal extends string | number, TObj extends Record<any, TVal>>(object: TObj, value: string | number | undefined | null, ignoreCase: boolean = true): TVal | undefined {
  const key = tryLookupKeyByValue(object, value, ignoreCase);
  if(!key) {
    return undefined;
  }
  return object[key];
}

export function lookupValueOrThrow<TVal extends string | number, TObj extends Record<any, TVal>>(object: TObj, value: string | number | undefined | null, ignoreCase: boolean = true): TVal {
  return object[lookupKeyByValueOrThrow(object, value, ignoreCase)];
}

export function detectMimeType(fileName: string): string {
  const mime = Mime.getType(fileName);
  if(!mime) {
    throw new Error('Cannot detect MIME type');
  }
  return mime;
}

export function formatAppCacheKey(...itemKeyParts: string[]) {
  if(!itemKeyParts) {
    throw new Error('empty key');
  }

  if(!itemKeyParts.length || itemKeyParts.every(i => !i)) {
    throw new Error('empty key');
  }

  return [CachePrefix, ...itemKeyParts].join(CacheDirSeparator);
}

export function areCtrlKeysEqual(key1: ControlKey, key2: ControlKey): boolean {
  return key1.length === key2.length && key1.every((v, idx) => v === key2[idx]);
}

export function toShortForm<TControlKeyPart extends string | number>(key: ControlKey<TControlKeyPart>): string {
  if(!key) {
    throw new Error('empty control key');
  }

  if(!isArray(key) || !key.length) {
    throw new Error(`invalid key [${JSON.stringify(key)}]`);
  }

  if(key.length === 1) {
    return key[0].toString();
  } else if(key.length === 2) {
    return `${key[0]}-${key[1]}`;
  } else {
    const firstPart = key[1];
    const keyHash = hash(key);
    const hashPart = keyHash.substring(0, Math.min(keyHash.length, 4));
    const lastPartIdx = key.findLastIndex(v => typeof v === 'string');
    const lastPart = lastPartIdx > 0 ? key.slice(lastPartIdx).join('-') : null;
    return lastPart ? `${firstPart}-${lastPart}-${hashPart}` : `${firstPart}-${hashPart}`;
  }
}
