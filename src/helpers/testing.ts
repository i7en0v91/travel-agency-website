import { type LogAlwaysLevel, AppConfig, AppLoggerBase, lookupParentDirectory, type IAppLogger, type LogLevel } from '@golobe-demo/shared';
import type { IAuthUserDto } from '../server/api-definitions';
import { EOL } from 'os';
import { appendFileSync } from 'fs';
import { cp, access, readdir, stat } from 'fs/promises';
import { join, resolve } from 'pathe';
import { type FSWatcher, watch } from 'chokidar';
import omit from 'lodash-es/omit';

const LogFilePath = resolve('./testrun.log');
export const ScreenshotDir = '.nuxt/screenshots';

export const TEST_SERVER_PORT = 43321;

export const OAUTH_SECRET = 'dummy';
export const OAUTH_TOKEN_TYPE = 'Bearer';

let lastTestRunDirPath: string | undefined;
let testFilesWatcher: FSWatcher | undefined;
let testFilesWatchCallbackIsRunning = false;

export interface ITestLocalProfile extends Record<string, any>, IAuthUserDto {
  id: string,
  sub: string,
  login: string,
  firstName: string,
  lastName: string,
  email: string
}

export const OAUTH_TESTUSER_PROFILE: ITestLocalProfile = {
  id: '', // will be filled when adding user to DB
  sub: '123321',
  login: 'testuserlogin',
  firstName: 'Test',
  lastName: 'User',
  email: 'localoauthuser@localhost.test'
};

class TestConsoleLogger extends AppLoggerBase<typeof AppConfig['logging']['common']> {
  override getLogDestinations(): { local: boolean; outside: boolean; } {
    return {
      local: true,
      outside: false
    };
  }
  override logOutside(): void {
    throw new Error('Method not implemented.');
  }
}

class TestFileLogger extends AppLoggerBase<typeof AppConfig['logging']['common']> {
  ts = () => new Date().toISOString();

  override getLogDestinations(): { local: boolean; outside: boolean; } {
    return {
      local: false,
      outside: true
    };
  }

  override logOutside(logData: { msg: string; level: LogLevel | (typeof LogAlwaysLevel); }): void {
    appendFileSync(LogFilePath, `${logData.level} ${this.ts()} ${logData.msg}, data=${JSON.stringify(omit(logData, 'msg', 'level'))}${EOL}`);
  }
}

function createFileLogger (testCase: string) : IAppLogger {
  const result = new TestFileLogger(AppConfig.logging.common);
  return result.addContextProps({ prefix: testCase });
}

function createConsoleLogger (testCase: string) : IAppLogger {
  const result = new TestConsoleLogger(AppConfig.logging.common);
  return result.addContextProps({ prefix: testCase });
}


export function createLogger (testCase: string, preferFile?: boolean) : IAppLogger {
  preferFile ??= true;
  if (!!(globalThis as any).window && !preferFile) {
    return createConsoleLogger(testCase);
  } else {
    return createFileLogger(testCase);
  }
}

async function getLastTestRunDirPath(logger: IAppLogger, forceRecompute: boolean = false): Promise<string | undefined> {
  if(!forceRecompute && lastTestRunDirPath) {
    logger.debug('using cached test run directory path', lastTestRunDirPath);
    return lastTestRunDirPath;
  }

  const testsDir = resolve('./.nuxt/test');
  logger.verbose('detecting last test run directory path', testsDir);
  const testDirEntries = (await readdir(testsDir, { withFileTypes: true })).filter(e => e.isDirectory());

  logger.debug('num test run', { numTestDirEntries: testDirEntries.length });
  if(!testDirEntries.length) {
    logger.warn('cannot detect last test run directory, tests dir is empty');
    return undefined;
  }

  let mostRecentlyCreatedDirPath = join(testsDir, testDirEntries[0].name);
  let mostRecentCtime = (await stat(mostRecentlyCreatedDirPath)).ctime;
  logger.debug('current most recent test', { dir: testDirEntries[0].name, ctime: mostRecentCtime.toISOString() });
  for(let i = 0; i < testDirEntries.length; i++) {
    const testDirEntry = testDirEntries[i];
    const dirPath = join(testsDir, testDirEntry.name);
    const dirStat = await stat(dirPath);
    if(dirStat.ctime.getTime() > mostRecentCtime.getTime()) {
      mostRecentlyCreatedDirPath = dirPath;
      mostRecentCtime = dirStat.ctime;
      logger.debug('new most recent test', { dir: testDirEntry.name, ctime: mostRecentCtime.toISOString() });
    }
  }

  lastTestRunDirPath = mostRecentlyCreatedDirPath;
  logger.verbose('detected last test run directory path', { dir: lastTestRunDirPath, ctime: mostRecentCtime.toISOString() });

  return mostRecentlyCreatedDirPath;
}

async function copySharpDependencies(testRunDir: string, nodeModulesDir: string, logger: IAppLogger): Promise<void> {
  logger.verbose('copying [sharp] dependencies');

  const sharpSrcDir = join(nodeModulesDir, 'sharp');
  const sharpTargetDir = join(testRunDir, 'node_modules', 'sharp');
    
  logger.debug('copying [sharp] dependencies', { src: sharpSrcDir, dst: sharpTargetDir });
  await cp(sharpSrcDir, sharpTargetDir, { recursive: true, force: false, errorOnExist: false });

  logger.verbose('[sharp] dependencies copied');
}

async function ensureTestFiles(logger: IAppLogger): Promise<void> {
  logger.info('checking test files readiness');

  const testRunDir = await getLastTestRunDirPath(logger, true);
  if(!testRunDir) {
    logger.verbose('cannot prepare test files, no test run directory - probably not yet created');
    return;
  }

  const nodeModulesDir = await lookupParentDirectory('.', 'node_modules', async (path: string) => { await access(path); return true; });
  if (!nodeModulesDir) {
    logger.error('cannot prepare test files - failed to locate node_modules directory');
    throw new Error('failed to prepare test files');
  }

  await copySharpDependencies(testRunDir, nodeModulesDir, logger);

  logger.info('test files ready');
}

async function testFilesWatchCallback(logger: IAppLogger): Promise<void> {
  if(testFilesWatchCallbackIsRunning) {
    return;
  }
  try {
    testFilesWatchCallbackIsRunning = true;
    logger.verbose('test files watcher callback triggered');
    await ensureTestFiles(logger);
    logger.verbose('test files watcher callback completed');
  } catch(err: any) {
    logger.error('exception occured while executing test files watcher callback', err);
  } finally {
    testFilesWatchCallbackIsRunning = false;
  }
}

export function startWatchingTestFiles(logger: IAppLogger) {
  if(testFilesWatcher) {
    logger.debug('ignoring watch test files call, already watching');
    return;
  }

  const testDirs = resolve(join('./', '.nuxt', 'test'));
  logger.info('creating test files watcher, tests', { dir: testDirs });
  testFilesWatcher = watch(testDirs, { depth: 4, ignoreInitial: false, interval: 500 });
  testFilesWatcher.on('addDir', () => testFilesWatchCallback(logger));
  testFilesWatcher.on('add', () => testFilesWatchCallback(logger));
  testFilesWatcher.on('change', () => testFilesWatchCallback(logger));
  logger.info('test files watcher created');
}

export async function stopWatchingTestFiles(logger: IAppLogger): Promise<void> {
  if(!testFilesWatcher) {
    logger.debug('ignoring stop watch test files call, not watching');
    return;
  }

  try {
    logger.verbose('stopping to watch test files');
    await testFilesWatcher.close();
    logger.verbose('watching test files stopped');
  } catch(err: any) {
    logger.warn('exception occured while stopping to watch test files', err);
  } finally {
    testFilesWatcher = undefined;  
  }
}