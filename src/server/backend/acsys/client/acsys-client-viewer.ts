import { type IAppLogger, type EntityId } from '../../app-facade/interfaces';
import type { IAcsysClientViewer } from './interfaces';
import { type StorageItemResponseDto } from './dto';
import { RouteGetFile, RouteReadData, AcsysTableStorageItems, AcsysTableIdColumn } from './constants';
import { type IUserOptions } from './../../../../appconfig';
import { AcsysClientBase } from './acsys-client-base';
import { ApiResponseTypes, UserRoleEnum } from './interfaces';
import { AppException, AppExceptionCodeEnum } from './../../app-facade/implementation';
import dayjs from 'dayjs';
import uniqBy from 'lodash-es/uniqBy';

export class AcsysClientViewer extends AcsysClientBase implements IAcsysClientViewer {
  public static inject = ['logger'] as const;
  constructor (baseUrl: string, userOptions: IUserOptions, logger: IAppLogger, roleKind?: UserRoleEnum) {
    super(baseUrl, userOptions, roleKind ?? UserRoleEnum.Viewer, logger);
  }

  getFileInfos = async (fileIds: EntityId[]): Promise<{ id: EntityId, mimeType: string; lastModifiedUtc: Date; }[]> => {
    this.logger.verbose(`(AcsysClientViewer) obtaining file info, fileIds=[${fileIds.join('; ')}]`); 

    const queryParams = {
      table: AcsysTableStorageItems,
      options: `{"where":[["${AcsysTableIdColumn}","IN (${fileIds.map(id => `'${id}'`).join(',')})",[]]]}`
    };

    const fetchResult = await this.fetch<ApiResponseTypes.json, StorageItemResponseDto[]>(RouteReadData, queryParams, undefined, 'GET', UserRoleEnum.Viewer, true, ApiResponseTypes.json, undefined);
    const uniqueItems = uniqBy(fetchResult, (i) => i.acsys_id);
    const result = uniqueItems.map(fetchedItem => {
        return {
          id: fetchedItem.acsys_id,
          lastModifiedUtc: dayjs(fetchedItem.updated).toDate(),
          mimeType: fetchedItem.content_type
        };
    });

    this.logger.verbose(`(AcsysClientViewer) file infos obtained, fileIds=[${fileIds.join('; ')}], result=[${JSON.stringify(result)}]`); 
    return result;
  };

  readFile = async (fileId: EntityId): Promise<{ mimeType: string, bytes: Buffer, lastModifiedUtc: Date }> => {
    this.logger.verbose(`(AcsysClientViewer) reading file, fileId=${fileId}`); 

    await this.ensureAuthenticated(false);
    const accessToken = this.getCurrentAccessToken();
    if(!accessToken) {
      this.logger.warn(`(AcsysClientViewer) failed to read file, cannot obtain access token, fileId=${fileId}`);
      throw new AppException(AppExceptionCodeEnum.ACSYS_INTEGRATION_ERROR, 'failed to read file', 'error-stub');
    }

    const queryParams = {
      file: fileId,
      token: accessToken
    };

    const fetchResult = await this.fetch<ApiResponseTypes.bytes>(RouteGetFile, queryParams, undefined, 'GET', UserRoleEnum.Viewer, true, ApiResponseTypes.bytes, undefined);
    
    this.logger.verbose(`(AcsysClientViewer) file read completed, fileId=${fileId}, mimeType=${fetchResult.mimeType}, size=${fetchResult.bytes.length}`); 
    return {
      mimeType: fetchResult.mimeType,
      bytes: fetchResult.bytes,
      lastModifiedUtc: fetchResult.lastModifiedUtc
    };
  };
}
