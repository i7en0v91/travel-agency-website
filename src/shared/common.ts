import toLower from 'lodash-es/toLower';
import replace from 'lodash-es/replace';
import { normalizeURL, parseURL } from 'ufo';
import fromPairs from 'lodash-es/fromPairs';
import dayjs from 'dayjs';
import AppConfig from '../appconfig';
import { type Locale, AvailableLocaleCodes, OgImageExt, NumMinutesInDay } from './constants';
import { HtmlPage, AllHtmlPages, getHtmlPagePath, EntityIdPages } from './page-query-params';
import type { ILocalizableValue, GeoPoint, DistanceUnitKm, EntityId } from './interfaces';
import { LocaleEnum } from './constants';
import { type I18nResName, getI18nResName3 } from './../shared/i18n';
import random from 'lodash-es/random';

export function newUniqueId(): EntityId {
  const getPart = () => (random(10000000000000) + new Date().getTime()).toString(20);
  const high = getPart();
  const low = getPart();
  return `${high}${low}`;
}

export function lookupPageByUrl(urlOrPathname: string): HtmlPage | undefined {
  if (!urlOrPathname?.trim()) {
    return HtmlPage.Index;
  }

  const urlObj = parseURL(normalizeURL(urlOrPathname));
  if (!urlObj.pathname) {
    return HtmlPage.Index;
  }
  
  if (urlObj.pathname.includes('/index')) {
    return HtmlPage.Index;
  }

  const slashedPathName = urlObj.pathname.startsWith('/') ? urlObj.pathname : `/${urlObj.pathname}`;
  if(AvailableLocaleCodes.some(c => ['/', `/${c}`, `/${c}/`].includes(slashedPathName.toLowerCase()))) {
    return HtmlPage.Index;
  }

  return AllHtmlPages.find(pp => pp !== HtmlPage.Index && slashedPathName.includes(`/${getHtmlPagePath(pp)}`));
};

export function extractIdFromUrl(urlOrPathname: string): EntityId | undefined {
  const page = lookupPageByUrl(urlOrPathname);
  if(!page) {
    return undefined;
  }
  if(!EntityIdPages.includes(page)) {
    return undefined;
  }

  const urlParts = urlOrPathname.split('/');
  const pagePathIdx = urlParts.indexOf(getHtmlPagePath(page));
  if(pagePathIdx < 0 || (pagePathIdx >= urlParts.length - 1)) {
    return undefined;
  }

  return urlParts.splice(0, pagePathIdx + 2).pop();
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

export function getCurrentTimeUtc(): Date {
  return dayjs().utc().toDate();
}

export function eraseTimeOfDay (dateTime: Date): Date {
  const totalMs = dateTime.getTime();
  return new Date(totalMs - totalMs % (1000 * 60 * 60 * 24));
}

export function convertTimeOfDay (timeOfDayMinutes: number): { hour24: number, minutes: number } {
  timeOfDayMinutes = timeOfDayMinutes % NumMinutesInDay;
  const h = Math.max(0, Math.floor(timeOfDayMinutes / 60));
  const m = Math.max(0, Math.floor(timeOfDayMinutes - 60 * h)) % 60;
  return {
    hour24: h,
    minutes: m
  };
}

export function getTimeOfDay (dateTimeUtc: Date, utcOffsetMinutes: number): number {
  return (dateTimeUtc.getHours() * 60 + dateTimeUtc.getMinutes() + utcOffsetMinutes) % NumMinutesInDay;
}

export function extractAirportCode (displayName: string) {
  if (displayName.length < 3) {
    return displayName.toUpperCase();
  }
  return displayName.substring(0, 3).toUpperCase();
}

export function getValueForTimeOfDayFormatting (dateTimeUtc: Date, utcOffsetMinutes: number): Date {
  const timeOfDay = convertTimeOfDay(getTimeOfDay(dateTimeUtc, utcOffsetMinutes));
  return dayjs().local().set('hour', timeOfDay.hour24).set('minute', timeOfDay.minutes).toDate();
}

export function getValueForFlightDurationFormatting (departTimeUtc: Date, arriveTimeUtc: Date): { hours: string, minutes: string } {
  const departFlightDuration = Math.round((arriveTimeUtc.getTime() - departTimeUtc.getTime()) / 60000);
  const duration = convertTimeOfDay(departFlightDuration);
  return {
    hours: duration.hour24.toFixed(0),
    minutes: duration.minutes.toFixed(0)
  };
}

export function getValueForFlightDayFormatting (dateTimeUtc: Date, utcOffsetMinutes: number): Date {
  return dayjs(dateTimeUtc).local().add(utcOffsetMinutes, 'minute').toDate();
}

export function formatValidThruDate(dueDate: Date): string {
  return `${dueDate.getMonth().toString().padStart(2, '0')}/${ (dueDate.getFullYear() % 100).toString().padStart(2, '0')}`;
}

export function tryParseEnum (enumType: any, value?: string | number): any {
  if (!value) {
    return undefined;
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
    return undefined;
  }

  return enumType[matchedMembers[0][0]];
}

export function parseEnumOrThrow (enumType: any, value?: string | number): any {
  if (!value) {
    throw new Error('enum value empty');
  }

  const result = tryParseEnum(enumType, value);
  if (!result) {
    throw new Error(`unexpected enum value: ${JSON.stringify(value)}`);
  }

  return result;
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

export function getOgImageFileName (page: HtmlPage, locale: Locale): string {
  return `${page === HtmlPage.Index ? 'index' : getHtmlPagePath(page)}_${locale.toLowerCase()}.${OgImageExt}`;
}

export async function delay (milliseconds: number) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  await new Promise<void>((resolve, reject) => { setTimeout(() => resolve(), milliseconds); });
}

/**
 * Spin waits until specified condition is TRUE
 * @param condition predicate to check
 * @param timeoutSecs maximum number of seconds to wait for {@link condition} to become TRUE
 * @returns TRUE if condition has been met until timeout; FALSE otherwise
 */
export async function spinWait (condition: () => Promise<boolean>, timeoutSecs: number): Promise<boolean> {
  const startWait = process.uptime();
  let conditionMet = await condition();
  if (conditionMet) {
    return true;
  }

  while (!conditionMet) {
    const elapsedSecs = process.uptime() - startWait;
    if (elapsedSecs > timeoutSecs) {
      return false;
    }

    await delay(1000);
    conditionMet = await condition();
  }

  return true;
}
