import { PdfFontMediumFile, type IAppLogger } from '@golobe-demo/shared';
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
