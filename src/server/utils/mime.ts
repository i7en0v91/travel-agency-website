import Mime from 'mime';
import { AppException, AppExceptionCodeEnum } from '../../shared/exceptions';
import { type IAppLogger } from './../../shared/applogger';;

export function detectMimeType(fileName: string, logger: IAppLogger): string {
  const mime = Mime.getType(fileName);
  if(!mime) {
    logger.warn(`failed to detect mime type, fileName=${fileName}`);
    throw new AppException(AppExceptionCodeEnum.BAD_REQUEST, 'Cannot detect MIME type', 'error-stub');
  }
  return mime;
}