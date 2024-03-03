import type { Storage, StorageValue } from 'unstorage';
import { destr } from 'destr';
import { join } from 'pathe';
import type { IAssetsProvider, AssetType } from '../shared/interfaces';
import { type IAppLogger } from '../shared/applogger';

export class AssetsProvider implements IAssetsProvider {
  private readonly logger: IAppLogger;
  private readonly publicAssetsStorage: Storage<StorageValue>;

  public static inject = ['publicAssetsStorage', 'logger'] as const;
  constructor (publicAssetsStorage: Storage<StorageValue>, logger: IAppLogger) {
    this.logger = logger;
    this.publicAssetsStorage = publicAssetsStorage;
  }

  getAsset = async (assetType: AssetType, filename: string): Promise<Object | undefined> => {
    this.logger.verbose(`(AssetsProvider) accessing asset, type=${assetType}, filename=${filename}`);
    let result: any;
    switch (assetType) {
      case 'geo':
        result = destr<any>(await this.publicAssetsStorage.getItem(join('geo', filename)));
        break;
      default:
        this.logger.warn(`(AssetsProvider) unexpected asset type, type=${assetType}, filename=${filename}`);
    }
    this.logger.verbose(`(AssetsProvider) accessing asset, type=${assetType}, filename=${filename}, result=${result ? 'ok' : 'not found'}`);
    return result;
  };
}
