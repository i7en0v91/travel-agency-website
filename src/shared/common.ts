import toLower from 'lodash/toLower';
import replace from 'lodash/replace';
import { normalizeURL, parseURL } from 'ufo';
import fromPairs from 'lodash/fromPairs';
import AppConfig from '../appconfig';
import { type Locale, AvailableLocaleCodes, DEV_ENV_MODE } from './constants';
import type { ILocalizableValue } from './interfaces';
import { LocaleEnum } from './constants';

export function isLandingPageUrl (url: string): boolean {
  if (!url?.trim()) {
    return true;
  }

  const urlObj = parseURL(normalizeURL(url));
  if (!urlObj.pathname) {
    return true;
  }

  return AvailableLocaleCodes.some(c => ['/', `/${c}`, `/${c}/`].includes(urlObj.pathname.toLowerCase()));
}

export function testHeaderValue (header: string, testValue: string) : boolean {
  const normalizeValue = (v: string) => toLower(replace(v, /\s/g, ''));
  return normalizeValue(header) === normalizeValue(testValue);
}

export function isPasswordSecure (value: string): boolean {
  if (!value) {
    return false;
  }
  if (value.length < AppConfig.userPasswordPolicy.minLength) {
    return false;
  }
  if (AppConfig.userPasswordPolicy.uppercase && !/[A-Z]/.test(value)) {
    return false;
  }
  if (AppConfig.userPasswordPolicy.lowercase && !/[a-z]/.test(value)) {
    return false;
  }
  if (AppConfig.userPasswordPolicy.number && !/[0-9]/.test(value)) {
    return false;
  }
  if (AppConfig.userPasswordPolicy.specialChar && !/[#?!@$%^&*-]/.test(value)) {
    return false;
  }
  return true;
}

export function clampTextLine (text: string, maxLength: number): string {
  maxLength = Math.max(1, maxLength);
  if (maxLength < 4) {
    return text.substring(0, maxLength);
  }
  if ((text?.length ?? 0) <= maxLength) {
    return text;
  }

  const partLength = Math.ceil(maxLength / 2);
  const startStr = `${text.substring(0, partLength)}`;
  const endStr = `${text.substring(text.length - partLength, text.length)}`;
  return `${startStr}...${endStr}`;
}

export function strToBool (value: string): boolean {
  const regex = /^\s*(true|1|on)\s*$/i;
  return regex.test(value);
}

export function getLastSelectedOptionStorageKey (optionCtrlKey: string) {
  return `lastOptBtn:${optionCtrlKey}`;
}

export function getLocalizeableValue (localizeableValue: Pick<ILocalizableValue, Locale>, locale: Locale) {
  return localizeableValue[locale];
}

export function eraseTimeOfDay (dateTime: Date): Date {
  const totalMs = dateTime.getTime();
  return new Date(totalMs - totalMs % (1000 * 60 * 60 * 24));
}

export function isDevOrTestEnv (): boolean {
  return import.meta.env.MODE === DEV_ENV_MODE || import.meta.env.VITE_VITEST || process.env?.VITEST || process.env?.NODE_ENV === DEV_ENV_MODE;
}

export function isQuickStartEnv (): boolean {
  return import.meta.env.VITE_QUICKSTART;
}

export function parseEnumOrThrow (enumType: any, value?: string | number): any {
  if (!value) {
    throw new Error('enum value empty');
  }

  const testValue = value.toString().toLowerCase();
  const compareValues = (entryValue: any): boolean => {
    if (!entryValue) {
      return false;
    }
    return (entryValue as any).valueOf().toLowerCase() === testValue;
  };

  const matchedMembers = Object.entries(enumType).filter(e => compareValues(e[1]));
  if (matchedMembers.length === 0) {
    throw new Error(`unexpected enum value: ${value}`);
  }

  return enumType[matchedMembers[0][0]];
}

export function mapLocalizeableValues (f: (...lv: string[]) => string, ...localizeableValues: ILocalizableValue[]): ILocalizableValue {
  return fromPairs(
    Object.keys(LocaleEnum).map(x => x.toLowerCase())
      .map(l => [l, f(...localizeableValues.map(v => (v as any)[l] as string))])
  ) as any;
}
