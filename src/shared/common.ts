import toLower from 'lodash-es/toLower';
import replace from 'lodash-es/replace';
import { normalizeURL, parseURL } from 'ufo';
import fromPairs from 'lodash-es/fromPairs';
import AppConfig from '../appconfig';
import { type Locale, AvailableLocaleCodes, SearchOffersListConstants, PagePath, OgImageExt } from './constants';
import type { ILocalizableValue, GeoPoint, DistanceUnitKm } from './interfaces';
import { LocaleEnum } from './constants';
import { type I18nResName, getI18nResName3 } from './../shared/i18n';

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

export function convertTimeOfDay (timeOfDayMinutes: number): { hour24: number, minutes: number } {
  timeOfDayMinutes = timeOfDayMinutes % SearchOffersListConstants.NumMinutesInDay;
  const h = Math.max(0, Math.floor(timeOfDayMinutes / 60));
  const m = Math.max(0, Math.floor(timeOfDayMinutes - 60 * h)) % 60;
  return {
    hour24: h,
    minutes: m
  };
}

export function getTimeOfDay (dateTimeUtc: Date, utcOffsetMinutes: number): number {
  return (dateTimeUtc.getHours() * 60 + dateTimeUtc.getMinutes() + utcOffsetMinutes) % SearchOffersListConstants.NumMinutesInDay;
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

export function getOgImageFileName (page: PagePath, locale: Locale): string {
  return `${page === PagePath.Index ? 'index' : page.valueOf()}_${locale.toLowerCase()}.${OgImageExt}`;
}
