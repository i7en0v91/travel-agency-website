import destr from 'destr';
import isNumber from 'lodash-es/isNumber';
import Mime from 'mime';

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

export function stringifyClone(obj: any): any {
  if(!obj) {
    return undefined;
  }

  return destr(JSON.stringify(obj));
}

export function detectMimeType(fileName: string): string {
  const mime = Mime.getType(fileName);
  if(!mime) {
    throw new Error('Cannot detect MIME type');
  }
  return mime;
}