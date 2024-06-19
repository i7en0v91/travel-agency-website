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

  getFileInfo = async (fileId: EntityId): Promise<{ mimeType: string; lastModifiedUtc: Date; }> => {
    this.logger.verbose(`(AcsysClientViewer) obtaining file info, fileId=${fileId}`); 

    const queryParams = {
      table: AcsysTableStorageItems,
      options: `{"where":[["${AcsysTableIdColumn}","=","${fileId}"]]}`
    };

    const fetchResult = await this.fetch<ApiResponseTypes.json, StorageItemResponseDto[]>(RouteReadData, queryParams, undefined, 'GET', UserRoleEnum.Viewer, true, ApiResponseTypes.json, undefined);
    if(fetchResult.length === 0) {
      this.logger.warn(`(AcsysClientViewer) file info not found, fileId=${fileId}`);
      throw new AppException(AppExceptionCodeEnum.OBJECT_NOT_FOUND, 'Acsys file info not found', 'error-stub');
    }
    const uniqueItems = uniqBy(fetchResult, (i) => i.acsys_id);
    if(uniqueItems.length > 1) {
      this.logger.warn(`(AcsysClientViewer) too much files found, fileId=${fileId}, all ids=[${(uniqueItems.map(f => f.acsys_id)).join('; ')}]`);
      throw new AppException(AppExceptionCodeEnum.ACSYS_INTEGRATION_ERROR, 'Too much files found', 'error-stub');
    }

    const fetchedInfo = fetchResult[0];
    const result: { mimeType: string; lastModifiedUtc: Date; } = {
      lastModifiedUtc: dayjs(fetchedInfo.updated).toDate(),
      mimeType: fetchedInfo.content_type
    };

    this.logger.verbose(`(AcsysClientViewer) file info obtained, fileId=${fileId}, mime=${result.mimeType}, lastModifiedDay=${result.lastModifiedUtc.toISOString()}`); 
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
