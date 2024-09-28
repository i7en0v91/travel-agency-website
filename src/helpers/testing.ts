import { type IAppLogger } from '@golobe-demo/shared';
import { type IAuthUserDto } from '../server/api-definitions';
import { EOL } from 'os';
import { appendFileSync } from 'fs';
import { consola } from 'consola';
import { resolve } from 'pathe';

const LogFilePath = resolve('./testrun.log');
export const ScreenshotDir = '.nuxt/screenshots';

export const TEST_SERVER_PORT = 43321;

export const OAUTH_SECRET = 'dummy';
export const OAUTH_TOKEN_TYPE = 'Bearer';

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

let fileLogger: IAppLogger | undefined;
function createFileLogger (prefix: string) : IAppLogger {
  if (!fileLogger) {
    let lowerWarnsToInfo = false;
    fileLogger = {
      lowerWarnsWithoutErrorLevel: (useInfoLevel: boolean) => {
        lowerWarnsToInfo = useInfoLevel;
      },
      debug: function (msg: string, data?: any): void {
        appendFileSync(LogFilePath, `[${prefix}] DEBUG ${msg} ${data ? `, data=${JSON.stringify(data)}` : ''}${EOL}`);
      },
      verbose: function (msg: string, data?: object | undefined): void {
        appendFileSync(LogFilePath, `[${prefix}] VERBOSE ${msg} ${data ? `, data=${JSON.stringify(data)}` : ''}${EOL}`);
      },
      info: function (msg: string, data?: object | undefined): void {
        appendFileSync(LogFilePath, `[${prefix}] INFO ${msg} ${data ? `, data=${JSON.stringify(data)}` : ''}${EOL}`);
      },
      warn: function (msg: string, err?: any, data?: object | undefined): void {
        const level = (lowerWarnsToInfo && !err) ? 'INFO' : 'WARN';
        appendFileSync(LogFilePath, `[${prefix}] ${level} ${msg}, err=${JSON.stringify(err)} ${data ? `, data=${JSON.stringify(data)}` : ''}${EOL}`);
      },
      error: function (msg: string, err?: any, data?: object | undefined): void {
        appendFileSync(LogFilePath, `[${prefix}] ERROR ${msg}, err=${JSON.stringify(err)} ${data ? `, data=${JSON.stringify(data)}` : ''}${EOL}`);
      },
      always: function (msg: string, data?: object | undefined): void {
        appendFileSync(LogFilePath, `[${prefix}] INFO ${msg} ${data ? `, data=${JSON.stringify(data)}` : ''}${EOL}`);
      }
    };
  }
  return fileLogger;
}

let consoleLogger: IAppLogger | undefined;
function createConsoleLogger (prefix: string) : IAppLogger {
  if (!consoleLogger) {
    let lowerWarnsToInfo = false;
    const log = consola.log;
    consoleLogger = {
      lowerWarnsWithoutErrorLevel: (useInfoLevel: boolean) => {
        lowerWarnsToInfo = useInfoLevel;
      },
      debug: function (msg: string, data?: any): void {
        log(consola.debug(`[${prefix}] DEBUG ${msg}`), data);
      },
      verbose: function (msg: string, data?: object | undefined): void {
        log(consola.verbose(`[${prefix}] VERBOSE ${msg}`), data);
      },
      info: function (msg: string, data?: object | undefined): void {
        log(consola.info(`[${prefix}] INFO ${msg}`), data);
      },
      warn: function (msg: string, err?: any, data?: object | undefined): void {
        if(lowerWarnsToInfo && !err) {
          consola.info(`[${prefix}] INFO ${msg}, err=${JSON.stringify(err)}`, data);
        } else {
          consola.warn(`[${prefix}] WARN ${msg}, err=${JSON.stringify(err)}`, data);
        }        
      },
      error: function (msg: string, err?: any, data?: object | undefined): void {
        log(consola.error(`[${prefix}] ERROR ${msg}, err=${JSON.stringify(err)}`), data);
      },
      always: function (msg: string, data?: object | undefined): void {
        log(consola.info(`[${prefix}] ALWAYS ${msg}`), data);
      }
    };
  }
  return consoleLogger;
}

export function createLogger (prefix: string, preferFile?: boolean) : IAppLogger {
  preferFile ??= true;
  if (!!(globalThis as any).window && !preferFile) {
    return createConsoleLogger(prefix);
  } else {
    return createFileLogger(prefix);
  }
}
