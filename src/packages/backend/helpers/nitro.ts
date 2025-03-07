import { PdfFontMediumFile, type IAppLogger } from '@golobe-demo/shared';
import isBuffer from 'lodash-es/isBuffer';
import isString from 'lodash-es/isString';
import { createStorage, type Storage, type StorageValue } from 'unstorage';

export function createCache (): Storage<StorageValue> {
  return createStorage();
}

export async function getNitroCache (logger?: IAppLogger): Promise<Storage<StorageValue>> {
  const result = (globalThis as any).$nitroCache as Storage<StorageValue>;
  if (!result) {
    logger?.error('nitro cache is not available');
    throw new Error('nitro cache is not available');
  }

  return result;
}

export async function getSrcsetCache (logger?: IAppLogger): Promise<Storage<StorageValue>> {
  const result = (globalThis as any).$srcsetCache as Storage<StorageValue>;
  if (!result) {
    logger?.error('images srcset cache is not available');
    throw new Error('images srcset cache is not available');
  }

  return result;
}

export async function getAppAssetsStorage (logger?: IAppLogger): Promise<Storage<StorageValue>> {
  const result = (globalThis as any).$appDataStorage as Storage<StorageValue>;
  if (!result) {
    logger?.error('app assets storage is not available');
    throw new Error('app assets storage is not available');
  }

  if (!(await result.getItem('world-map.json'))) {
    logger?.error('app assets storage is miconfigured');
    throw new Error('app assets storage is miconfigured');
  }

  return result;
}

export async function getLocalesAssetsStorage (logger?: IAppLogger): Promise<Storage<StorageValue>> {
  const result = (globalThis as any).$localesStorage as Storage<StorageValue>;
  if (!result) {
    logger?.error('locales assets storage is not available');
    throw new Error('locales assets storage is not available');
  }

  if (!(await result.getItem('en.json'))) {
    logger?.error('locales assets storage is miconfigured');
    throw new Error('locales assets storage is miconfigured');
  }

  return result;
}

export async function getPdfFontsAssetsStorage (logger?: IAppLogger): Promise<Storage<StorageValue>> {
  const result = (globalThis as any).$pdfFontsStorage as Storage<StorageValue>;
  if (!result) {
    logger?.error('pdf fonts assets storage is not available');
    throw new Error('pdf fonts assets storage is not available');
  }

  if (!(await result.getItem(PdfFontMediumFile))) {
    logger?.error('pdf fonts assets storage is miconfigured');
    throw new Error('pdf fonts assets storage is miconfigured');
  }

  return result;
}

export function convertRawToBuffer(rawData: any, logger?: IAppLogger): Buffer {
  logger?.debug('converting data to buffer');
  let result: Buffer;
  if (isBuffer(rawData)) {
    result = rawData as Buffer;
    logger?.debug('data already has a buffer data type');
  } else if (isString(rawData)) {
    const strLen = (rawData as string).length;
    const sample = (rawData as string).substring(0, Math.min(strLen, 128));
    logger?.debug('converting data from string', sample);
    result = Buffer.from(rawData as string, 'binary');
  } else {
    logger?.debug('converting data to buffer directly');
    result = Buffer.from(rawData as any);
  }
  logger?.debug('data converted to buffer', { size: result.length });
  return result;
};