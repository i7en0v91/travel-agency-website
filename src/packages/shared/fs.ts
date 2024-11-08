import { join, dirname, sep } from 'pathe';

/**
 * Searches for directory named {@param dirName} starting from {@param startPath} and 
 * moving up to parent directories (one by one) until specified {@param dirName} directory 
 * is found inside one of parent directories.
 * @param startPath Initial path from where to start
 * @param dirName Name of directory to search for
 * @param existsProbeFn directory existence probe callback. @example async (path: string) => { await access(path); return true; }
 * @param level amount of levels navigated, for internal use
 * @returns Path containing requested directory, or {@constant undefined} if not found
 */
export async function lookupParentDirectory (startPath: string, dirName: string, existsProbeFn: (probePath: string) => Promise<boolean>, level = 0): Promise<string | undefined> {
  if (level > 20) {
    return undefined;
  }
  const probe = join(startPath, dirName);
  try {
    if (await existsProbeFn(probe)) {
      return probe;
    }
  } catch(err: any) {
    // possible access exception
    console.assert(!!err); // to mute lint @typescript-eslint/no-unused-vars warning
  }

  const parentDir = dirname(startPath);
  if (parentDir.indexOf(sep) === parentDir.lastIndexOf(sep)) {
    return undefined;
  }

  return lookupParentDirectory(parentDir, dirName, existsProbeFn, level + 1);
}
