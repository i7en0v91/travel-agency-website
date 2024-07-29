import { existsSync } from 'fs';
import { join, dirname, sep } from 'pathe';

export function resolveParentDirectory (startPath: string, dirName: string, level = 0): string | undefined {
  if (level > 20) {
    return undefined;
  }
  const probe = join(startPath, dirName);
  if (existsSync(probe)) {
    return probe;
  }

  const parentDir = dirname(startPath);
  if (parentDir.indexOf(sep) === parentDir.lastIndexOf(sep)) {
    return undefined;
  }
  return resolveParentDirectory(parentDir, dirName, level + 1);
}
