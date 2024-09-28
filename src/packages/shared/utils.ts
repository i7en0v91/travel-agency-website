import toLower from 'lodash-es/toLower';
import replace from 'lodash-es/replace';
import fromPairs from 'lodash-es/fromPairs';
import { DEV_ENV_MODE, LocaleEnum, AppPage, OgImageExt, EntityIdRadix } from './constants';
import { getPagePath } from './pages';
import type { Price, Locale, ILocalizableValue, GeoPoint, DistanceUnitKm, EntityId } from './types';
import { type I18nResName, getI18nResName3 } from './i18n';
import random from 'lodash-es/random';
import destr from 'destr';
import isNumber from 'lodash-es/isNumber';
import slugify from 'slugify';
import { Decimal } from 'decimal.js';
import { join, dirname, sep } from 'pathe';
import Mime from 'mime';

export function calculateDistanceKm (from: GeoPoint, to: GeoPoint): DistanceUnitKm {
  const EarthRadius: DistanceUnitKm = 6371;

  const deg2rad = (deg: number) => deg * (Math.PI / 180);

  const dLat = deg2rad(to.lat - from.lat);
  const dLon = deg2rad(to.lon - from.lon);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(from.lat)) * Math.cos(deg2rad(to.lat)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EarthRadius * c;
}

export function normalizePrice (value: Price | number, numZeros: number): Price {
  const raw = Math.floor(value instanceof Decimal ? value.toNumber() : value);
  if (numZeros <= 0) {
    return new Decimal(raw);
  }
  const base = Math.pow(10, numZeros);
  const remainder = raw % base;
  const floor = raw - remainder;
  return new Decimal((remainder > base / 2) ? (floor + base) : floor);
}

export function extractAirportCode (displayName: string) {
  if (displayName.length < 3) {
    return displayName.toUpperCase();
  }
  return displayName.substring(0, 3).toUpperCase();
}

export function getScoreClassResName (score: number): I18nResName {
  if (score >= 4.0) {
    return getI18nResName3('searchOffers', 'scoreClass', 'veryGood');
  } else if (score >= 3.0) {
    return getI18nResName3('searchOffers', 'scoreClass', 'good');
  } else if (score >= 2.0) {
    return getI18nResName3('searchOffers', 'scoreClass', 'medium');
  } else if (score >= 1.0) {
    return getI18nResName3('searchOffers', 'scoreClass', 'low');
  } else {
    return getI18nResName3('searchOffers', 'scoreClass', 'veryLow');
  }
}

/**
 * Searches for directory named {@param dirName} starting from {@param startPath} and 
 * moving up to parent directories (one by one) until specified {@param dirName} directory 
 * is found inside one of parent directories.
 * @param startPath Initial path from where to start
 * @param dirName Name of directory to search for
 * @param existsProbeFn directory existence probe callback. @example async (path: string) => { await access(path); return true; }
 * @param level amount of levels navigated, for internal use
 * @returns Path containing requested directory, or {@constant undefined} if not found
 */
export async function lookupParentDirectory (startPath: string, dirName: string, existsProbeFn: (probePath: string) => Promise<boolean>, level = 0): Promise<string | undefined> {
  if (level > 20) {
    return undefined;
  }
  const probe = join(startPath, dirName);
  try {
    if (await existsProbeFn(probe)) {
      return probe;
    }
  } catch(err: any) {
    // possible access exception
    console.assert(!!err); // to mute lint @typescript-eslint/no-unused-vars warning
  }

  const parentDir = dirname(startPath);
  if (parentDir.indexOf(sep) === parentDir.lastIndexOf(sep)) {
    return undefined;
  }

  return lookupParentDirectory(parentDir, dirName, existsProbeFn, level + 1);
}

export function isTestEnv (): boolean {
  return (!!import.meta.env.VITE_VITEST && 
    (import.meta.env.VITE_VITEST === true || import.meta.env.VITE_VITEST === 'true')
  ) || !!process.env?.VITEST || !!process.env?.VITE_VITEST || process.env?.NODE_ENV === 'test';
}

export function isDevEnv (): boolean {
  return import.meta.env.MODE === DEV_ENV_MODE || process.env?.NODE_ENV === DEV_ENV_MODE;
}

export function isDevOrTestEnv (): boolean {
  return isDevEnv() || isTestEnv();
}

export function isQuickStartEnv (): boolean {
  return (!!import.meta.env.VITE_QUICKSTART && 
    (import.meta.env.VITE_QUICKSTART === true || import.meta.env.VITE_QUICKSTART==='true' || import.meta.env.VITE_QUICKSTART==='1')
  ) || !!process.env?.VITE_QUICKSTART;
}

export function isPublishEnv (): boolean {
  return !!process.env.PUBLISH;
}

export function newUniqueId(): EntityId {
  const getPart = () => (random(10000000000000) + new Date().getTime()).toString(EntityIdRadix);
  const high = getPart();
  const low = getPart();
  return `${high}${low}`;
}

export function testHeaderValue (header: string, testValue: string) : boolean {
  const normalizeValue = (v: string) => toLower(replace(v, /\s/g, ''));
  return normalizeValue(header) === normalizeValue(testValue);
}

export function stringifyClone(obj: any): any {
  if(!obj) {
    return undefined;
  }

  return destr(JSON.stringify(obj));
}

export function getLocalizeableValue (localizeableValue: Pick<ILocalizableValue, Locale>, locale: Locale) {
  return localizeableValue[locale];
}

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

export function mapLocalizeableValues (f: (...lv: string[]) => string, ...localizeableValues: ILocalizableValue[]): ILocalizableValue {
  return fromPairs(
    Object.keys(LocaleEnum).map(x => x.toLowerCase())
      .map(l => [l, f(...localizeableValues.map(v => (v as any)[l] as string))])
  ) as any;
}

export function getOgImageFileName (page: AppPage, locale: Locale): string {
  return `${page === AppPage.Index ? 'index' : getPagePath(page)}_${locale.toLowerCase()}.${OgImageExt}`;
}

export async function delay (milliseconds: number) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  await new Promise<void>((resolve, reject) => { setTimeout(() => resolve(), milliseconds); });
}

/**
 * Spin waits until specified condition is TRUE
 * @param condition predicate to check
 * @param timeoutMs maximum number of milliseconds to wait for {@link condition} to become TRUE
 * @param iterationMs wait interval in milliseconds between successive checks for condition
 * @returns TRUE if condition has been met until timeout; FALSE otherwise
 */
export async function spinWait (condition: () => Promise<boolean>, timeoutMs: number, iterationMs: number = 1000): Promise<boolean> {
  const startWait = new Date().getTime();
  let conditionMet = await condition();
  if (conditionMet) {
    return true;
  }

  while (!conditionMet) {
    const elapsedMs = new Date().getTime() - startWait;
    if (elapsedMs > timeoutMs) {
      return false;
    }

    await delay(iterationMs);
    conditionMet = await condition();
  }

  return true;
}

export async function obtainFreeSlug (tokens: string[], testSlugUsedFunc: (slug: string) => Promise<boolean>, maxIter: number = 1000) : Promise<string | undefined> {
  const resultBase = slugify(tokens.join(' ').trim());
  if (resultBase.length === 0) {
    throw new Error('empty slug data');
  }

  let result = resultBase;
  for (let i = 0; i <= maxIter; i++) {
    if (i === maxIter) {
      return undefined;
    }

    if (!(await testSlugUsedFunc(result))) {
      break;
    }
    result = `${resultBase}-${i + 1}`;
  }

  return result;
}

export function detectMimeType(fileName: string): string {
  const mime = Mime.getType(fileName);
  if(!mime) {
    throw new Error('Cannot detect MIME type');
  }
  return mime;
}