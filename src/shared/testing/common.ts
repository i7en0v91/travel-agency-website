import { EOL } from 'os';
import { appendFileSync } from 'fs';
import chalk from 'chalk';
import { type IAuthUserDto } from '../../server/dto';
import { type IAppLogger } from '../applogger';

export const LogFilePath = '.nuxt/testrun.log';
export const ScreenshotDir = '.nuxt/screenshots';

export const TEST_SERVER_PORT = 43321;

export const OAUTH_SECRET = 'dummy';
export const OAUTH_TOKEN_TYPE = 'Bearer';

export const TEST_USER_PASSWORD = 'p@Ssw0rD!';

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

export const CREDENTIALS_TESTUSER_PROFILE = {
  firstName: 'CTest',
  lastName: 'CUser',
  email: 'credentialstestuser@localhost.test'
};

export async function delay (milliseconds: number) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  await new Promise<void>((resolve, reject) => { setTimeout(() => resolve(), milliseconds); });
}

/**
 * Spin waits until specified condition is TRUE
 * @param condition predicate to check
 * @param timeoutSecs maximum number of seconds to wait for {@link condition} to become TRUE
 * @returns TRUE if condition has been met until timeout; FALSE otherwise
 */
export async function spinWait (condition: () => Promise<boolean>, timeoutSecs: number): Promise<boolean> {
  const startWait = process.uptime();
  let conditionMet = await condition();
  if (conditionMet) {
    return true;
  }

  while (!conditionMet) {
    const elapsedSecs = process.uptime() - startWait;
    if (elapsedSecs > timeoutSecs) {
      return false;
    }

    await delay(1000);
    conditionMet = await condition();
  }

  return true;
}

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
      }
    };
  }
  return fileLogger;
}

let consoleLogger: IAppLogger | undefined;
function createConsoleLogger (prefix: string) : IAppLogger {
  if (!consoleLogger) {
    let lowerWarnsToInfo = false;
    const log = console.log;
    consoleLogger = {
      lowerWarnsWithoutErrorLevel: (useInfoLevel: boolean) => {
        lowerWarnsToInfo = useInfoLevel;
      },
      debug: function (msg: string, data?: any): void {
        log(chalk.white(`[${prefix}] DEBUG ${msg}`), data);
      },
      verbose: function (msg: string, data?: object | undefined): void {
        log(chalk.white(`[${prefix}] VERBOSE ${msg}`), data);
      },
      info: function (msg: string, data?: object | undefined): void {
        log(chalk.green(`[${prefix}] INFO ${msg}`), data);
      },
      warn: function (msg: string, err?: any, data?: object | undefined): void {
        const level = (lowerWarnsToInfo && !err) ? 'INFO' : 'WARN';
        log(chalk.yellow(`[${prefix}] ${level} ${msg}, err=${JSON.stringify(err)}`), data);
      },
      error: function (msg: string, err?: any, data?: object | undefined): void {
        log(chalk.red(`[${prefix}] ERROR ${msg}, err=${JSON.stringify(err)}`), data);
      }
    };
  }
  return consoleLogger;

  /*
  return {
    debug: function (msg: string, data?: any): void {
      log(`[${prefix}] ${msg}`, data);
    },
    verbose: function (msg: string, data?: object | undefined): void {
      log(`[${prefix}] ${msg}`, data);
    },
    info: function (msg: string, data?: object | undefined): void {
      log(`[${prefix}] ${msg}`, data);
    },
    warn: function (msg: string, err?: any, data?: object | undefined): void {
      log(`[${prefix}] ${msg}, err=${JSON.stringify(err)}`, data);
    },
    error: function (msg: string, err?: any, data?: object | undefined): void {
      log(`[${prefix}] ${msg}, err=${JSON.stringify(err)}`, data);
    }
  }
  */
}

export function createLogger (prefix: string) : IAppLogger {
  if ((globalThis as any).window) {
    return createConsoleLogger(prefix);
  } else {
    return createFileLogger(prefix);
  }
}
