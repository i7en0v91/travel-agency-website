import { type Locale, type IAppLogger, AppException, AppExceptionCodeEnum } from '@golobe-demo/shared';
import type { Storage, StorageValue } from 'unstorage';
import { destr } from 'destr';
import { convertRawToBuffer } from './../helpers/nitro';
import type { IAppAssetsProvider } from './../types';

export class AppAssetsProvider implements IAppAssetsProvider {
  private readonly logger: IAppLogger;
  private readonly appAssetsStorage: Storage<StorageValue>;
  private readonly localesAssetsStorage: Storage<StorageValue>;
  private readonly pdfFontsAssetsStorage: Storage<StorageValue>;

  public static inject = ['appAssetsStorage', 'pdfFontsAssetsStorage', 'localesAssetsStorage', 'logger'] as const;
  constructor (
      appAssetsStorage: Storage<StorageValue>, 
      pdfFontsAssetsStorage: Storage<StorageValue>, 
      localesAssetsStorage: Storage<StorageValue>, 
      logger: IAppLogger
  ) {
    this.logger = logger.addContextProps({ component: 'AppAssetsProvider' });
    this.appAssetsStorage = appAssetsStorage;
    this.localesAssetsStorage = localesAssetsStorage;
    this.pdfFontsAssetsStorage = pdfFontsAssetsStorage;
  }

  getPdfFont = async (filename: string): Promise<Buffer> => {
    this.logger.verbose('accessing pdf font', filename);
    const fileContent = (await this.pdfFontsAssetsStorage.getItemRaw(filename));
    if (!fileContent) {
      this.logger.warn('font is not available', undefined, filename);
      throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'cannot obtain font', 'error-stub');
    }
    const result = convertRawToBuffer(fileContent);
    this.logger.verbose('pdf font accessed', { filename, size: result?.length });
    return result;
  };

  getAppData = async (filename: string): Promise<NonNullable<unknown>> => {
    this.logger.verbose('accessing app data', filename);
    const result = destr<any>(await this.appAssetsStorage.getItem(filename));
    if (!result) {
      this.logger.warn('app data is not available', undefined, filename);
      throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'cannot obtain app resource', 'error-stub');
    }
    this.logger.verbose('accessing app data', { filename, result: !!result });
    return result;
  };

  getLocalization = async (locale: Locale): Promise<NonNullable<unknown>> => {
    this.logger.verbose('accessing localization', locale);
    const result = destr<any>(await this.localesAssetsStorage.getItem(`${locale.toLocaleLowerCase()}.json`));
    if (!result) {
      this.logger.warn('localization is not available', undefined, locale);
      throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'cannot obtain localization', 'error-page');
    }
    this.logger.verbose('accessing localization', { locale, result: !!result });
    return result;
  };
}
