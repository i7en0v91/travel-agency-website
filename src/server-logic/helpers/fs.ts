import fs from 'fs';
import { join, dirname, sep } from 'pathe';
import AppConfig from '../../appconfig';

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
