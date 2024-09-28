import { type IFileData, type IFileInfo, getCurrentTimeUtc, AppException, AppExceptionCodeEnum, type EntityId, type Timestamp, type IAppLogger } from '@golobe-demo/shared';
import { type IFileLogic } from './../types';
import { UserRoleEnum, type IAcsysClientProvider, type IAcsysClientStandard, type IAcsysClientViewer } from './client/interfaces';
import { FileUniqParamsSepToken, FileUniqParamsSepChar } from './client/constants';
import { murmurHash } from 'ohash';

export class FileLogic implements IFileLogic {
  private readonly logger: IAppLogger;
  private readonly acsysClientProvider: IAcsysClientProvider;

  public static inject = ['acsysClientProvider', 'logger'] as const;
  constructor (acsysClientProvider: IAcsysClientProvider, logger: IAppLogger) {
    this.logger = logger;
    this.acsysClientProvider = acsysClientProvider;
  }

  /**
   * Adds user individual tokens to original file name to prevent file name collisions for uploads from different users & correct timestamp persistence
   */
  patchOriginalNameWithUniqueMetadata = (originalName: string | undefined, mimeType: string | undefined, userId: EntityId | undefined, fileHash: string, lastModifiedUtc: Date | undefined): string => {
    this.logger.debug(`(FileLogic-Acsys) patching original file name, originalName=${originalName}, mimeType=${mimeType}, userId=${userId ?? ''}, fileHash=${fileHash}, lastModified=${lastModifiedUtc?.toISOString() ?? ''}`);

    let timestamp = lastModifiedUtc?.getTime();
    if(timestamp) {
      timestamp = (timestamp - (timestamp % 1000)) / 1000;
    }

    let baseName = '';
    let ext = '';
    const extIndex = originalName?.lastIndexOf('.') ?? -1;
    if(extIndex >= 0) {
      if(originalName!.length > (extIndex + 1)) {
        ext = originalName!.substring(extIndex + 1, originalName!.length);
      }
      if(extIndex > 0) {
        baseName = originalName!.substring(0, extIndex);
      }
    } else if(originalName) {
      baseName = originalName;
    }
    const result = `${baseName ?? ''}${FileUniqParamsSepChar}${FileUniqParamsSepToken}${FileUniqParamsSepChar}${userId ?? ''}${FileUniqParamsSepChar}${fileHash}${FileUniqParamsSepChar}${timestamp?.toString() ?? ''}${ext ? `.${ext}` : ''}`;
    
    this.logger.debug(`(FileLogic-Acsys) file name after patch, originalName=${originalName}, mimeType=${mimeType}, userId=${userId ?? ''}, fileHash=${fileHash}, lastModified=${lastModifiedUtc?.toISOString() ?? ''}, result=${result}`);
    return result;
  };

  extractMetadataFromPatchedName = (fileNameFromAcsys: string | undefined): { originalName: string, lastModifiedUtc: Date | undefined } => {
    this.logger.debug(`(FileLogic-Acsys) extracting metadata from patched file name, patchedOriginalName=${fileNameFromAcsys}`);

    let originalName = '';
    let timestamp: number | undefined;
    if(fileNameFromAcsys) {
      const splitStr = `${FileUniqParamsSepChar}${FileUniqParamsSepToken}${FileUniqParamsSepChar}`;
      const prmsIdx = fileNameFromAcsys.indexOf(splitStr);
      if(prmsIdx > 0) {
        const parts = fileNameFromAcsys.split(splitStr);
        originalName = parts[0];

        const paramTokens = parts[1].split(FileUniqParamsSepChar);
        let lastToken = paramTokens[paramTokens.length - 1];
        if(lastToken.includes('.')) {
          lastToken = lastToken.split('.')[0];
        }
        
        try {
          timestamp = parseInt(lastToken);
        } catch(err: any) {
          this.logger.warn(`(FileLogic-Acsys) failed to parse timestamp from file metadata, patchedOriginalName=${fileNameFromAcsys}, timestampToken=${lastToken}`, err);
        }
        if(!timestamp) {
          this.logger.warn(`(FileLogic-Acsys) failed to parse timestamp from file metadata, patchedOriginalName=${fileNameFromAcsys}, timestampToken=${lastToken}`);
        }
      } else {
        originalName = fileNameFromAcsys;
      }
    }

    this.logger.debug(`(FileLogic-Acsys) original file name extracted, patchedOriginalName=${fileNameFromAcsys}, result=${originalName}, timestamp=${timestamp ?? ''}`);
    return { originalName, lastModifiedUtc: timestamp ? new Date(timestamp * 1000) : undefined };
  };

  getWriteClient = (): IAcsysClientStandard => {
    return this.acsysClientProvider.getClient(UserRoleEnum.Standard);
  };

  getReadClient = (): IAcsysClientViewer => {
    return this.acsysClientProvider.getClient(UserRoleEnum.Viewer);
  };

  findFiles = async (ids: EntityId[]): Promise<IFileInfo[]> => {
    this.logger.debug(`(FileLogic-Acsys) finding file info, ids=[${ids.join('; ')}]`);
    if(!ids.length) {
      this.logger.debug(`(FileLogic-Acsys) file info - empty response, ids=[${ids.join('; ')}]`);
      return [];
    }

    const acsysClient = this.getReadClient();
    const filesResponse = await acsysClient.getFileInfos(ids);
    if (ids.length !== filesResponse.length) {
      const idsLookup = new Set<EntityId>(filesResponse.map(f => f.id));
      const notFoundIds = ids.filter(id => !idsLookup.has(id));
      this.logger.warn(`(FileLogic-Acsys) file infos not found: ids=[${notFoundIds.join(', ')}]`);
      throw new AppException(
        AppExceptionCodeEnum.OBJECT_NOT_FOUND,
        'File not found',
        'error-stub');
    }

    const result: IFileInfo[] = [];
    for(let i = 0; i < filesResponse.length; i++) {
      const fileData = filesResponse[i];
      const metadata = this.extractMetadataFromPatchedName(fileData.id);
      result.push({
        id: fileData.id,
        isDeleted: false,
        modifiedUtc: metadata.lastModifiedUtc ?? fileData.lastModifiedUtc, // Acsys (v1.0.1) - getFileInfos does not give hh:mm:ss resolution
        mime: fileData.mimeType,
        originalName: metadata.originalName
      });
    }
    
    this.logger.debug(`(FileLogic-Acsys) file info found, ids=[${ids.join('; ')}]`, result);
    return result;
  };

  getFileData = async (id: EntityId): Promise<IFileInfo & { bytes: Buffer }> => {
    this.logger.debug(`(FileLogic-Acsys) loading file bytes, id=${id}`);
    const acsysClient = this.getReadClient();
    const fileData = await acsysClient.readFile(id);
    const metadata = this.extractMetadataFromPatchedName(id);
    const result: IFileInfo & { bytes: Buffer } = {
      id,
      isDeleted: false,
      modifiedUtc: metadata.lastModifiedUtc ?? fileData.lastModifiedUtc,
      mime: fileData.mimeType,
      originalName: metadata.originalName,
      bytes: fileData.bytes
    };

    this.logger.debug(`(FileLogic-Acsys) file bytes loaded, id=${id}, fileName=${result.originalName}, mime=${result.mime}, size=${result.bytes.length}`);
    return result;
  };

  createFile = async (data: IFileData, userId: EntityId | undefined): Promise<{ id: EntityId, timestamp: Timestamp }> => {
    this.logger.debug(`(FileLogic-Acsys) creating file, fileName=${data.originalName}, mime=${data.mimeType}, userId=${userId}, length=${data.bytes.length}`);

    const currentTimestampUtc = getCurrentTimeUtc().getTime();
    const lastModifiedUtc = new Date(currentTimestampUtc - (currentTimestampUtc % 1000));

    const acsysClient = this.getWriteClient();
    const fileHash = murmurHash(data.bytes);
    const acsys_id = this.patchOriginalNameWithUniqueMetadata(data.originalName, data.mimeType, userId, fileHash.toString(), lastModifiedUtc);
    await acsysClient.uploadFile(acsys_id, data.mimeType, data.bytes);
    this.logger.debug(`(FileLogic-Acsys) file created, fileId=${acsys_id}, fileName=${data.originalName}, mime=${data.mimeType}, userId=${userId}, length=${data.bytes.length}, modifiedUtc=${lastModifiedUtc.toISOString()}`);  

    return {
      id: acsys_id,
      timestamp: lastModifiedUtc.getTime()
    };
  };

  updateFile = async (id: EntityId, data: IFileData, userId: EntityId | undefined, recoverDeleted: boolean | undefined): Promise<{ id: EntityId, timestamp: Timestamp }> => {
    this.logger.debug(`(FileLogic-Acsys) updating file, id=${id}, fileName=${data.originalName}, mime=${data.mimeType}, userId=${userId}, length=${data.bytes?.length?.toString() ?? '[empty]'}, recover=${recoverDeleted ?? false}`);

    const result = await this.createFile(data, userId);

    this.logger.debug(`(FileLogic-Acsys) file updated, id=${id}, newIf=${result.id}, fileName=${data.originalName}, mime=${data.mimeType}, userId=${userId}, length=${data.bytes?.length?.toString() ?? '[empty]'}, recover=${recoverDeleted ?? false}`);
    return {
      id: result.id,
      timestamp: result.timestamp
    };
  };
}
