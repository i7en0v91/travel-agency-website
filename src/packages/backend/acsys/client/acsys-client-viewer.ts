import { AppException, AppExceptionCodeEnum, type IAcsysUserOptions, type IAppLogger, type EntityId } from '@golobe-demo/shared';
import type { IAcsysClientViewer } from './interfaces';
import type { StorageItemResponseDto } from './dto';
import { RouteGetFile, RouteReadData, AcsysTableStorageItems, AcsysTableIdColumn } from './constants';
import { AcsysClientBase } from './acsys-client-base';
import { ApiResponseTypes, UserRoleEnum } from './interfaces';
import dayjs from 'dayjs';
import uniqBy from 'lodash-es/uniqBy';

export class AcsysClientViewer extends AcsysClientBase implements IAcsysClientViewer {
  public static inject = ['logger'] as const;
  constructor (baseUrl: string, userOptions: IAcsysUserOptions, logger: IAppLogger, roleKind?: UserRoleEnum) {
    super(baseUrl, userOptions, roleKind ?? UserRoleEnum.Viewer, logger);
  }

  getFileInfos = async (fileIds: EntityId[]): Promise<{ id: EntityId, mimeType: string; lastModifiedUtc: Date; }[]> => {
    this.logger.verbose('obtaining file info', fileIds); 

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

    this.logger.verbose('file infos obtained', { fileIds, result }); 
    return result;
  };

  readFile = async (fileId: EntityId): Promise<{ mimeType: string, bytes: Buffer, lastModifiedUtc: Date }> => {
    this.logger.verbose('reading file', fileId); 

    await this.ensureAuthenticated(false);
    const accessToken = this.getCurrentAccessToken();
    if(!accessToken) {
      this.logger.warn('failed to read file, cannot obtain access token', undefined, fileId);
      throw new AppException(AppExceptionCodeEnum.ACSYS_INTEGRATION_ERROR, 'failed to read file', 'error-stub');
    }

    const queryParams = {
      file: fileId,
      token: accessToken
    };

    const fetchResult = await this.fetch<ApiResponseTypes.bytes>(RouteGetFile, queryParams, undefined, 'GET', UserRoleEnum.Viewer, true, ApiResponseTypes.bytes, undefined);
    
    this.logger.verbose('file read completed', { fileId, mimeType: fetchResult.mimeType, size: fetchResult.bytes.length }); 
    return {
      mimeType: fetchResult.mimeType,
      bytes: fetchResult.bytes,
      lastModifiedUtc: fetchResult.lastModifiedUtc
    };
  };
}
