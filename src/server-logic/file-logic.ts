import { PrismaClient } from '@prisma/client';
import dayjs from 'dayjs';
import { DbConcurrencyVersions } from '../shared/constants';
import { type IAppLogger } from '../shared/applogger';
import { type EntityId, type Timestamp, type IFileData, type IFileInfo, type IFileLogic } from '../shared/interfaces';
import { AppException, AppExceptionCodeEnum } from '../shared/exceptions';

export class FileLogic implements IFileLogic {
  private readonly logger: IAppLogger;
  private readonly dbRepository: PrismaClient;

  public static inject = ['dbRepository', 'logger'] as const;
  constructor (dbRepository: PrismaClient, logger: IAppLogger) {
    this.logger = logger;
    this.dbRepository = dbRepository;
  }

  findFile = async (id: EntityId): Promise<IFileInfo> => {
    this.logger.verbose(`(FileLogic) finding file info, id=${id}`);

    const queryResult = await this.dbRepository.file.findUnique({
      where: {
        id,
        isDeleted: false
      },
      select: {
        id: true,
        createdUtc: true,
        modifiedUtc: true,
        mime: true,
        originalName: true
      }
    });
    if (!queryResult) {
      this.logger.warn(`(FileLogic) file info not found found: id=${id}`);
      throw new AppException(
        AppExceptionCodeEnum.OBJECT_NOT_FOUND,
        'File not found',
        'error-stub');
    }

    const result: IFileInfo = {
      id: queryResult.id,
      createdUtc: queryResult.createdUtc,
      modifiedUtc: queryResult.modifiedUtc,
      mime: queryResult.mime ?? undefined,
      originalName: queryResult.originalName ?? undefined,
      isDeleted: false
    };

    this.logger.verbose(`(FileLogic) file info loaded, id=${id}`, result);
    return result;
  };

  getFileBytes = async (id: EntityId): Promise<Buffer> => {
    this.logger.verbose(`(FileLogic) loading file bytes, id=${id}`);

    const queryResult = await this.dbRepository.file.findUnique({
      where: {
        id,
        isDeleted: false
      },
      select: { bytes: true }
    });
    if (!queryResult) {
      this.logger.warn(`(FileLogic) file not found found: id=${id}`);
      throw new AppException(
        AppExceptionCodeEnum.OBJECT_NOT_FOUND,
        'File not found',
        'error-stub');
    }

    const bytes = queryResult.bytes;
    this.logger.verbose(`(FileLogic) file bytes loaded, id=${id}, size=${bytes.byteLength}`);
    return bytes;
  };

  createFile = async (data: IFileData): Promise<{ id: EntityId, timestamp: Timestamp }> => {
    this.logger.verbose(`(FileLogic) creating file, ownerId=${data.ownerId}, fileName=${data.originalName}, mime=${data.mimeType}, length=${data.bytes.length}`);

    const entity = (await this.dbRepository.file.create({
      data: {
        bytes: data.bytes,
        version: DbConcurrencyVersions.InitialVersion,
        isDeleted: false,
        originalName: data.originalName,
        ownerId: data.ownerId,
        mime: data.mimeType
      },
      select: {
        id: true,
        modifiedUtc: true
      }
    }));

    this.logger.verbose(`(FileLogic) file created, id=${entity.id}, ownerId=${data.ownerId}, fileName=${data.originalName}, mime=${data.mimeType}, length=${data.bytes.length}`);
    return { id: entity.id, timestamp: entity.modifiedUtc.getTime() };
  };

  updateFile = async (id: EntityId, data: Partial<IFileData>, recoverDeleted?: boolean | undefined): Promise<{ timestamp: Timestamp }> => {
    this.logger.verbose(`(FileLogic) updating file, id=${id}, ownerId=${data.ownerId}, fileName=${data.originalName}, mime=${data.mimeType}, length=${data.bytes?.length?.toString() ?? '[empty]'}, recover=${recoverDeleted ?? false}`);
    recoverDeleted ??= false;

    const modifiedUtc = dayjs().utc().toDate();
    const queryFilter = recoverDeleted ? { id, isDeleted: false } : { id };
    const updated = (await this.dbRepository.file.updateMany({
      where: queryFilter,
      data: {
        bytes: data.bytes,
        modifiedUtc,
        mime: data.mimeType,
        ownerId: data.ownerId,
        originalName: data.originalName,
        isDeleted: false,
        version: { increment: 1 }
      }
    })).count > 0;

    if (!updated) {
      this.logger.warn(`(FileLogic) cannot update file because it is not found: id=${id}, ownerId=${data.ownerId}, fileName=${data.originalName}, mime=${data.mimeType}, length=${data.bytes?.length?.toString() ?? '[empty]'}, recover=${recoverDeleted ?? false}`);
      throw new AppException(
        AppExceptionCodeEnum.OBJECT_NOT_FOUND,
        'Cannot update file as it is not found',
        'error-stub');
    }

    this.logger.verbose(`(FileLogic) file updated, id=${id}, ownerId=${data.ownerId}, fileName=${data.originalName}, mime=${data.mimeType}, length=${data.bytes?.length?.toString() ?? '[empty]'}, recover=${recoverDeleted ?? false}`);
    return { timestamp: modifiedUtc.getTime() };
  };
}
