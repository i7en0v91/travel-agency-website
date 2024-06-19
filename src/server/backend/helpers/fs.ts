import fs from 'fs';
import { type IAppLogger } from '../../../server/backend/app-facade/interfaces';
import { resolve, join, dirname, sep } from 'pathe';
import { AppConfig } from './../app-facade/implementation';

export function ensureImageCacheDir (logger: IAppLogger): string {
  logger.info(`ensuring images cache directory: dir=${AppConfig.images.cacheFsDir}`);
  const cacheDir = resolve(AppConfig.images.cacheFsDir);
  if (!fs.existsSync(cacheDir)) {
    logger.info(`creating images cache directory ${cacheDir}`);
    fs.mkdirSync(cacheDir, { recursive: true });
  }
  logger.verbose('image cache directory ensured');
  return cacheDir;
}

function resolveEtcFilePath (fileName: string) : string | undefined {
  const MaxLevel = 20;
  let curDir = process.cwd();
  for (let i = 0; i < MaxLevel; i++) {
    const probe = join(curDir, AppConfig.etcDirName, fileName);
    if (fs.existsSync(probe)) {
      return probe;
    }
    curDir = dirname(curDir);
    if (curDir.indexOf(sep) === curDir.lastIndexOf(sep)) {
      return undefined;
    }
  }
  return undefined;
}

export { resolveEtcFilePath };
