import { joinURL, parseURL, stringifyParsedURL } from 'ufo';
import type en from './locales/en.json';
import { AvailableLocaleCodes, DefaultLocale, OgImagePathSegment, RestApiAuth, RestApiLogging } from './constants';
import type { Locale } from './types';

export type I18nResName = string;
export function getI18nResName1<P1 extends keyof NonNullable<typeof en>> (p1: P1): I18nResName {
  return p1;
}

export function getI18nResName2<
  P1 extends keyof NonNullable<typeof en>,
  P2 extends keyof NonNullable<NonNullable<typeof en>[P1]>
> (p1: P1, p2?: P2): I18nResName {
  if (p2) {
    return `${p1}.${p2! as string}`;
  }
  return p1;
}

export function getI18nResName3<
  P1 extends keyof NonNullable<typeof en>,
  P2 extends keyof NonNullable<NonNullable<typeof en>[P1]>,
  P3 extends keyof NonNullable<NonNullable<NonNullable<typeof en>[P1]>[P2]>
> (p1: P1, p2?: P2, p3?: P3): I18nResName {
  if (p3 && p2) {
    return `${p1}.${p2! as string}.${p3! as string}`;
  } else if (p2) {
    return `${p1}.${p2! as string}`;
  } else {
    return p1;
  }
}

export function patchUrlWithLocale (url: string, locale: string): string | undefined {
  const urlObj = parseURL(url);
  if (!urlObj) {
    return undefined;
  }
  if (urlObj.pathname) {
    urlObj.pathname = joinURL(`/${locale}`, urlObj.pathname);
  } else {
    urlObj.pathname = `/${locale}`;
  }
  return stringifyParsedURL(urlObj);
}

export function getLocaleFromUrl (url: string) : Locale | undefined {
  if (url.startsWith(`/${RestApiLogging}`) ||
    url.startsWith(`/${RestApiAuth}`)) {
    return undefined;
  }

  if (url.includes(OgImagePathSegment)) {
    url = url.replace(OgImagePathSegment, '');
  }

  let result: Locale = 'en';
  if (url.startsWith(`/${<Locale>'ru'}`) || url.startsWith('ru')) {
    result = <Locale>'ru';
  } else if (url.startsWith(`/${<Locale>'fr'}`) || url.startsWith('fr')) {
    result = <Locale>'fr';
  }

  return result;
}

export function RuPluralizationRule (choice: number, choicesLength: number): number {
  function clampMatchedChoice (matchedChoice: number): number {
    if (matchedChoice >= choicesLength) {
      return choicesLength > 1 ? 1 : 0;
    }
    return matchedChoice;
  }

  if (choice <= 0) {
    return 0;
  }

  const teen = choice > 10 && choice < 20;
  const endsWithOne = choice % 10 === 1;
  if (!teen && endsWithOne) {
    return clampMatchedChoice(1);
  }
  if (!teen && choice % 10 >= 2 && choice % 10 <= 4) {
    return clampMatchedChoice(2);
  }

  return clampMatchedChoice(choice < 5 ? 2 : 3);
}

export function localizePath(path: string, locale: Locale ): string {
  if(path.startsWith('http')) {
    const parsedUrl = parseURL(path);
    parsedUrl.host = undefined;
    parsedUrl.protocol = undefined;
    path = stringifyParsedURL(parsedUrl);
  };
  if(!path.startsWith('/')) {
    path = `/${path}`;
  }

  const localePrefix = AvailableLocaleCodes.filter(l => l !== DefaultLocale && (path.startsWith(`/${l}`)));
  if (localePrefix.length > 0) {
    path = path.replace(`/${localePrefix[0]}`, '/');
    if (path.startsWith('//')) {
      path = path.replace('//', '/');
    }
  }
  let result = path;
  if (locale !== DefaultLocale) {
    result = joinURL(`/${locale}`, path);
  }
  return result;
};
