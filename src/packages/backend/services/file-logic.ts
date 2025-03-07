import { type IFileData, type IFileInfo, AppException, AppExceptionCodeEnum, DbVersionInitial, newUniqueId, type EntityId, type Timestamp, type IAppLogger } from '@golobe-demo/shared';
import type { IFileLogic } from './../types';
import type { PrismaClient } from '@prisma/client';
import dayjs from 'dayjs';

export class FileLogic implements IFileLogic {
  private readonly logger: IAppLogger;
  private readonly dbRepository: PrismaClient;

  public static inject = ['dbRepository', 'logger'] as const;
  constructor (dbRepository: PrismaClient, logger: IAppLogger) {
    this.logger = logger.addContextProps({ component: 'FileLogic' });
    this.dbRepository = dbRepository;
  }

  findFiles = async (ids: EntityId[]): Promise<IFileInfo[]> => {
    this.logger.debug('finding file infos', ids);

    const queryResult = await this.dbRepository.file.findMany({
      where: {
        id: { 
          in: ids
        },
        isDeleted: false
      },
      select: {
        id: true,
        modifiedUtc: true,
        mime: true,
        originalName: true
      }
    });
    if (ids.length !== queryResult.length) {
      const idsLookup = new Set<EntityId>(queryResult.map(f => f.id));
      const notFoundIds = ids.filter(id => !idsLookup.has(id));
      this.logger.warn('file infos not found', undefined, { ids: notFoundIds });
      throw new AppException(
        AppExceptionCodeEnum.OBJECT_NOT_FOUND,
        'File not found',
        'error-stub');
    }

    const result: IFileInfo[] = queryResult.map(queryItem => {
      return {
        id: queryItem.id,
        modifiedUtc: queryItem.modifiedUtc,
        mime: queryItem.mime,
        originalName: queryItem.originalName ?? undefined,
        isDeleted: false
      };
    });

    this.logger.debug('file infos found', ids);
    return result;
  };

  getFileData = async (id: EntityId): Promise<IFileInfo & { bytes: Buffer }> => {
    this.logger.verbose('loading file bytes', id);

    const queryResult = await this.dbRepository.file.findUnique({
      where: {
        id,
        isDeleted: false
      },
      select: { 
        id: true,
        bytes: true,
        mime: true,
        modifiedUtc: true,
        originalName: true
      }
    });
    if (!queryResult) {
      this.logger.warn('file not found found', undefined, id);
      throw new AppException(
        AppExceptionCodeEnum.OBJECT_NOT_FOUND,
        'File not found',
        'error-stub');
    }

    const bytes = queryResult.bytes;
    this.logger.verbose('file bytes loaded', { id, size: bytes.byteLength });
    const result = {
      id: queryResult.id,
      modifiedUtc: queryResult.modifiedUtc,
      mime: queryResult.mime,
      originalName: queryResult.originalName ?? undefined,
      isDeleted: false,
      bytes: Buffer.from(bytes),
    };
    return result;
  };

  createFile = async (data: IFileData, userId: EntityId | undefined): Promise<{ id: EntityId, timestamp: Timestamp }> => {
    this.logger.verbose('creating file', { fileName: data.originalName, mime: data.mimeType, userId, length: data.bytes.length });

    const entity = (await this.dbRepository.file.create({
      data: {
        id: newUniqueId(),
        bytes: data.bytes,
        version: DbVersionInitial,
        isDeleted: false,
        originalName: data.originalName,
        mime: data.mimeType
      },
      select: {
        id: true,
        modifiedUtc: true
      }
    }));

    this.logger.verbose('file created', { id: entity.id, fileName: data.originalName, mime: data.mimeType, length: data.bytes.length });
    return { id: entity.id, timestamp: entity.modifiedUtc.getTime() };
  };

  updateFile = async (id: EntityId, data: IFileData, userId: EntityId | undefined, recoverDeleted: boolean | undefined): Promise<{ id: EntityId, timestamp: Timestamp }> => {
    this.logger.verbose('updating file', { id, fileName: data.originalName, mime: data.mimeType, userId, length: data.bytes?.length?.toString() ?? '[empty]', recover: recoverDeleted ?? false });
    recoverDeleted ??= false;

    const modifiedUtc = dayjs().utc().toDate();
    const queryFilter = recoverDeleted ? { id, isDeleted: false } : { id };
    const updated = (await this.dbRepository.file.updateMany({
      where: queryFilter,
      data: {
        bytes: data.bytes,
        modifiedUtc,
        mime: data.mimeType,
        originalName: data.originalName,
        isDeleted: false,
        version: { increment: 1 }
      }
    })).count > 0;

    if (!updated) {
      const lengthSummary = data.bytes?.length?.toString() ?? '[empty]';
      this.logger.warn('cannot update file because it is not found', undefined, { id, fileName: data.originalName, mime: data.mimeType, userId, length: lengthSummary, recover: recoverDeleted ?? false });
      throw new AppException(
        AppExceptionCodeEnum.OBJECT_NOT_FOUND,
        'Cannot update file as it is not found',
        'error-stub');
    }

    this.logger.verbose('file updated', { id, fileName: data.originalName, mime: data.mimeType, userId, length: data.bytes?.length?.toString() ?? '[empty]', recover: recoverDeleted ?? false });
    return { id, timestamp: modifiedUtc.getTime() };
  };
}
