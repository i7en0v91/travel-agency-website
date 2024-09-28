import type { Storage, StorageValue } from 'unstorage';
import { destr } from 'destr';
import isString from 'lodash-es/isString';
import isBuffer from 'lodash-es/isBuffer';
import { type IAppLogger, AppException, AppExceptionCodeEnum } from '@golobe-demo/shared';
import { type IAppAssetsProvider } from './../types';

export class AppAssetsProvider implements IAppAssetsProvider {
  private readonly logger: IAppLogger;
  private readonly appAssetsStorage: Storage<StorageValue>;
  private readonly pdfFontsAssetsStorage: Storage<StorageValue>;

  public static inject = ['appAssetsStorage', 'pdfFontsAssetsStorage', 'logger'] as const;
  constructor (appAssetsStorage: Storage<StorageValue>, pdfFontsAssetsStorage: Storage<StorageValue>, logger: IAppLogger) {
    this.logger = logger;
    this.appAssetsStorage = appAssetsStorage;
    this.pdfFontsAssetsStorage = pdfFontsAssetsStorage;
  }

  convertRawToBuffer = (rawData: any): Buffer => {
    this.logger.debug('(AppAssetsProvider) converting data to buffer');
    let result: Buffer;
    if (isBuffer(rawData)) {
      result = rawData as Buffer;
      this.logger.debug('(AppAssetsProvider) data already has a buffer data type');
    } else if (isString(rawData)) {
      const strLen = (rawData as string).length;
      this.logger.debug(`(AppAssetsProvider) converting data from string, sample=${(rawData as string).substring(0, Math.min(strLen, 128))}`);
      result = Buffer.from(rawData as string, 'binary');
    } else {
      this.logger.debug('(AppAssetsProvider) converting data to buffer directly');
      result = Buffer.from(rawData as any);
    }
    this.logger.debug(`(AppAssetsProvider) data converted to buffer, size=${result.length}`);
    return result;
  };

  getPdfFont = async (filename: string): Promise<Buffer> => {
    this.logger.verbose(`(AppAssetsProvider) accessing pdf font, filename=${filename}`);
    const fileContent = (await this.pdfFontsAssetsStorage.getItemRaw(filename));
    if (!fileContent) {
      this.logger.warn(`(AppAssetsProvider) font is not available, , filename=${filename}`);
      throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'cannot obtain font', 'error-stub');
    }
    const result = this.convertRawToBuffer(fileContent);
    this.logger.verbose(`(AppAssetsProvider) pdf font accessed, filename=${filename}, size=${result ? result.length : 'not found'}`);
    return result;
  };

  getAppData = async (filename: string): Promise<NonNullable<unknown>> => {
    this.logger.verbose(`(AppAssetsProvider) accessing app data, filename=${filename}`);
    const result = destr<any>(await this.appAssetsStorage.getItem(filename));
    if (!result) {
      this.logger.warn(`(AppAssetsProvider) app data is not available, , filename=${filename}`);
      throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'cannot obtain app resource', 'error-stub');
    }
    this.logger.verbose(`(AppAssetsProvider) accessing app data, filename=${filename}, result=${result ? 'ok' : 'not found'}`);
    return result;
  };
}
