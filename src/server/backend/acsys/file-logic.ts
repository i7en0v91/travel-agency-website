import { type EntityId, type Timestamp, type IFileData, type IFileInfo, type IFileLogic, type IAppLogger } from './../../backend/app-facade/interfaces';
import { getCurrentTimeUtc } from './../../backend/app-facade/implementation';
import { UserRoleEnum, type IAcsysClientProvider, type IAcsysClientStandard, type IAcsysClientViewer } from './client/interfaces';
import { FileUniqParamsSepToken, FileUniqParamsSepChar } from './client/constants';
import { murmurHash } from 'ohash';
import { type H3Event } from 'h3';

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
    this.logger.debug(`(FileLogic-Acsys) extracting metadata from patched filen name, patchedOriginalName=${fileNameFromAcsys}`);

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
          this.logger.warn(`(FileLogic-Acsys) failed to parse timestamp from file metadata, patchedOriginalName=${fileNameFromAcsys}, timestampToken=${lastToken}`);
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

  getWriteClient = (event: H3Event): IAcsysClientStandard => {
    return this.acsysClientProvider.getClient(UserRoleEnum.Standard, event);
  };

  getReadClient = (event: H3Event): IAcsysClientViewer => {
    return this.acsysClientProvider.getClient(UserRoleEnum.Viewer, event);
  };

  findFile = async (id: EntityId, event: H3Event): Promise<IFileInfo> => {
    this.logger.debug(`(FileLogic-Acsys) finding file info, id=${id}`);

    const acsysClient = this.getReadClient(event);
    const fileData = await acsysClient.getFileInfo(id);
    const metadata = this.extractMetadataFromPatchedName(id);
    const result: IFileInfo = {
      id,
      isDeleted: false,
      modifiedUtc: metadata.lastModifiedUtc ?? fileData.lastModifiedUtc, // Acsys (v1.0.1) - getFileInfo does not give hh:mm:ss resolution
      mime: fileData.mimeType,
      originalName: metadata.originalName
    };
    
    this.logger.debug(`(FileLogic-Acsys) file info found, id=${id}, fileName=${result.originalName}, mime=${result.mime}`);
    return result;
  };

  getFileData = async (id: EntityId, event: H3Event): Promise<IFileInfo & { bytes: Buffer }> => {
    this.logger.debug(`(FileLogic-Acsys) loading file bytes, id=${id}`);
    const acsysClient = this.getReadClient(event);
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

  createFile = async (data: IFileData, userId: EntityId | undefined, event: H3Event): Promise<{ id: EntityId, timestamp: Timestamp }> => {
    this.logger.debug(`(FileLogic-Acsys) creating file, fileName=${data.originalName}, mime=${data.mimeType}, userId=${userId}, length=${data.bytes.length}`);

    const currentTimestampUtc = getCurrentTimeUtc().getTime();
    const lastModifiedUtc = new Date(currentTimestampUtc - (currentTimestampUtc % 1000));

    const acsysClient = this.getWriteClient(event);
    const fileHash = murmurHash(data.bytes);
    const acsys_id = this.patchOriginalNameWithUniqueMetadata(data.originalName, data.mimeType, userId, fileHash.toString(), lastModifiedUtc);
    await acsysClient.uploadFile(acsys_id, data.mimeType, data.bytes);
    this.logger.debug(`(FileLogic-Acsys) file created, fileId=${acsys_id}, fileName=${data.originalName}, mime=${data.mimeType}, userId=${userId}, length=${data.bytes.length}, modifiedUtc=${lastModifiedUtc.toISOString()}`);  

    return {
      id: acsys_id,
      timestamp: lastModifiedUtc.getTime()
    };
  };

  updateFile = async (id: EntityId, data: IFileData, userId: EntityId | undefined, recoverDeleted: boolean | undefined, event: H3Event): Promise<{ id: EntityId, timestamp: Timestamp }> => {
    this.logger.debug(`(FileLogic-Acsys) updating file, id=${id}, fileName=${data.originalName}, mime=${data.mimeType}, userId=${userId}, length=${data.bytes?.length?.toString() ?? '[empty]'}, recover=${recoverDeleted ?? false}`);

    const result = await this.createFile(data, userId, event);

    this.logger.debug(`(FileLogic-Acsys) file updated, id=${id}, newIf=${result.id}, fileName=${data.originalName}, mime=${data.mimeType}, userId=${userId}, length=${data.bytes?.length?.toString() ?? '[empty]'}, recover=${recoverDeleted ?? false}`);
    return {
      id: result.id,
      timestamp: result.timestamp
    };
  };
}
