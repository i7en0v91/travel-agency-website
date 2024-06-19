import type { IBlobStream } from 'blob-stream';
import { type IAppLogger } from './applogger';

export function readBlobStream (stream: IBlobStream, logger?: IAppLogger): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    stream.on('error', (err?: any) => {
      logger?.warn('exception occured while reading stream', err);
      reject(err);
    });

    stream.on('finish', async (): Promise<void> => {
      try {
        const blob = stream.toBlob();
        if (!blob) {
          logger?.warn('got empty blob when finishing stream reading');
          reject(new Error('result blob is empty'));
          return;
        }
        const arrayBuffer = await blob.arrayBuffer();
        if (!arrayBuffer) {
          logger?.warn('got empty array buffer when finishing stream reading');
          reject(new Error('result array buffer is empty'));
          return;
        }
        resolve(Buffer.from(arrayBuffer));
      } catch (err: any) {
        logger?.warn('unexpected exception occured while reading blob stream', err);
        reject(new Error('unexpected exception occured while reading stream'));
      }
    });
  });
}
