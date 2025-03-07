import { AppException, AppExceptionCodeEnum, type IAcsysUserOptions, type IAppLogger, type EntityId } from '@golobe-demo/shared';
import type { IAcsysClientStandard } from './interfaces';
import { RouteUploadFile } from './constants';
import { ApiResponseTypes, UserRoleEnum } from './interfaces';
import { AcsysClientViewer } from './acsys-client-viewer';

export class AcsysClientStandard extends AcsysClientViewer implements IAcsysClientStandard {
  public static override inject = ['logger'] as const;
  constructor (baseUrl: string, userOptions: IAcsysUserOptions, logger: IAppLogger, roleKind?: UserRoleEnum) {
    super(baseUrl, userOptions, logger, roleKind ?? UserRoleEnum.Standard);
  }

  uploadFile = async (fileId: EntityId, mimeType: string, bytes: Buffer): Promise<void> => {
    this.logger.verbose('uploading file', { fileId, mimeType, size: bytes.length }); 

    const fileData = new FormData();

    const file = new Blob([bytes], { type: mimeType });
    fileData.append('file',  file, fileId);
    fileData.append('destination', '');

    const fetchResult = await this.fetch<ApiResponseTypes.text, string>(RouteUploadFile, undefined, fileData, 'POST', UserRoleEnum.Standard, true, ApiResponseTypes.text, undefined);
    const isSuccess = fetchResult.toLowerCase() === 'true';
    if(!isSuccess) {
      this.logger.warn('failed to upload file', undefined, { fileId, mimeType, size: bytes.length, response: fetchResult });
      throw new AppException(AppExceptionCodeEnum.ACSYS_INTEGRATION_ERROR, 'failed to upload file', 'error-stub');
    }

    this.logger.verbose('file uploaded', { fileId, mimeType, size: bytes.length }); 
  };
}
