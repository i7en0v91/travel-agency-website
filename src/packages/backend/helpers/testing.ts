import type { IAppLogger } from '@golobe-demo/shared';
import { EOL } from 'os';
import { appendFileSync } from 'fs';
import { resolve } from 'pathe';

const LogFilePath = resolve('./testrun.log');

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

export function createLogger (prefix: string) : IAppLogger {
  return createFileLogger(prefix);
}
