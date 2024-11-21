import { AppPage, OgImageExt, EntityIdRadix } from './constants';
import { getPagePath } from './pages';
import type { Price, Locale, GeoPoint, DistanceUnitKm, EntityId } from './types';
import { type I18nResName, getI18nResName3 } from './i18n';
import random from 'lodash-es/random';
import slugify from 'slugify';
import { Decimal } from 'decimal.js';

export function getOgImageFileName (page: AppPage, locale: Locale): string {
  return `${page === AppPage.Index ? 'index' : getPagePath(page)}_${locale.toLowerCase()}.${OgImageExt}`;
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
  if (score > 4.5) {
    return getI18nResName3('searchOffers', 'scoreClass', 'veryGood');
  } else if (score >= 4.0) {
    return getI18nResName3('searchOffers', 'scoreClass', 'good');
  } else if (score >= 3.0) {
    return getI18nResName3('searchOffers', 'scoreClass', 'medium');
  } else if (score >= 2.0) {
    return getI18nResName3('searchOffers', 'scoreClass', 'low');
  } else {
    return getI18nResName3('searchOffers', 'scoreClass', 'veryLow');
  }
}

export function newUniqueId(): EntityId {
  const getPart = () => (random(10000000000000) + new Date().getTime()).toString(EntityIdRadix);
  const high = getPart();
  const low = getPart();
  return `${high}${low}`;
}