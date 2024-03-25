import type { Storage, StorageValue } from 'unstorage';
import { destr } from 'destr';
import type { IAppAssetsProvider } from '../shared/interfaces';
import { type IAppLogger } from '../shared/applogger';

export class AppAssetsProvider implements IAppAssetsProvider {
  private readonly logger: IAppLogger;
  private readonly appAssetsStorage: Storage<StorageValue>;

  public static inject = ['appAssetsStorage', 'logger'] as const;
  constructor (appAssetsStorage: Storage<StorageValue>, logger: IAppLogger) {
    this.logger = logger;
    this.appAssetsStorage = appAssetsStorage;
  }

  getAsset = async (filename: string): Promise<Object | undefined> => {
    this.logger.verbose(`(AppAssetsProvider) accessing asset, filename=${filename}`);
    const result = destr<any>(await this.appAssetsStorage.getItem(filename));
    this.logger.verbose(`(AppAssetsProvider) accessing asset, filename=${filename}, result=${result ? 'ok' : 'not found'}`);
    return result;
  };
}
