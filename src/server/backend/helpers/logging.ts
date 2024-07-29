import fs from 'fs';
import { dirname } from 'pathe';
import traverse from 'traverse';
import deepmerge from 'lodash-es/merge';

import type { Logger as WinstonLogger } from 'winston';
import { createLogger as createWinstonLogger, format as WinstonFormat } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

/*
import AppConfig from '../../../appconfig';
import { type IAppLogger, wrapLogDataArg, getAppExceptionCustomLogLevel, getErrorAppExceptionCode } from '../../../shared/applogger';
import { flattenError } from '../../../shared/exceptions';
*/

import { type IAppLogger } from '../app-facade/interfaces';
import { flattenError, AppConfig, wrapLogDataArg, getAppExceptionCustomLogLevel, getErrorAppExceptionCode } from '../app-facade/implementation';

const { combine, timestamp, json } = WinstonFormat;

export class ServerLogger implements IAppLogger {
  winstonLogger: WinstonLogger;
  lowerWarnsLevel = false;

  constructor () {
    this.winstonLogger = createLogger();
  }

  lowerWarnsWithoutErrorLevel (useInfoLevel: boolean): void {
    this.lowerWarnsLevel = useInfoLevel;
  }

  debug (msg: string, data?: any) {
    if (data) {
      this.winstonLogger.debug(deepmerge(wrapLogDataArg(data), { debug: msg }));
    } else {
      this.winstonLogger.debug(msg);
    }
  }

  verbose (msg: string, data?: any) {
    if (data) {
      this.winstonLogger.verbose(deepmerge(wrapLogDataArg(data), { verbose: msg }));
    } else {
      this.winstonLogger.verbose(msg);
    }
  }

  info (msg: string, data?: any) {
    if (data) {
      this.winstonLogger.info(deepmerge(wrapLogDataArg(data), { info: msg }));
    } else {
      this.winstonLogger.info(msg);
    }
  }

  warn (msg: string, err?: any, data?: any) {
    if (!err && !data) {
      if (this.lowerWarnsLevel && !err) {
        this.winstonLogger.info(msg);
      } else {
        this.winstonLogger.warn(msg);
      }
    } else {
      const customLogLevel = getAppExceptionCustomLogLevel(getErrorAppExceptionCode(err));
      const errPoco = (err && err instanceof Error) ? flattenError(err) : err;
      const msgObj = {};
      if (customLogLevel) {
        (msgObj as any)[customLogLevel] = msg;
      } else {
        (msgObj as any).warn = msg;
      }
      const logData = deepmerge(wrapLogDataArg(data), msgObj, errPoco || {});
      if (customLogLevel) {
        this.winstonLogger.log(customLogLevel.toLowerCase(), logData);
      } else if (this.lowerWarnsLevel && !err) {
        this.winstonLogger.info(logData);
      } else {
        this.winstonLogger.warn(logData);
      }
    }
  }

  error (msg: string, err?: any, data?: any) {
    if (!err && !data) {
      this.winstonLogger.error(msg);
    } else {
      const customLogLevel = getAppExceptionCustomLogLevel(getErrorAppExceptionCode(err));
      const errPoco = (err && err instanceof Error) ? flattenError(err) : err;
      const msgObj = {};
      if (customLogLevel) {
        (msgObj as any)[customLogLevel] = msg;
      } else {
        (msgObj as any).error = msg;
      }
      const logData = deepmerge(wrapLogDataArg(data), msgObj, errPoco || {});
      if (customLogLevel) {
        this.winstonLogger.log(customLogLevel.toLowerCase(), logData);
      } else {
        this.winstonLogger.error(logData);
      }
    }
  }

  always (msg: string, data?: any): void {
    if (data) {
      this.winstonLogger.log('always', deepmerge(wrapLogDataArg(data), { info: msg }));
    } else {
      this.winstonLogger.log('always', msg);
    }
  }
}

function ensureLogDir (filePath: string) {
  const fileDir = dirname(filePath);
  if (!fs.existsSync(fileDir)) {
    fs.mkdirSync(fileDir, { recursive: true });
  }
}

function getRedactFormat (sensitiveKeys: string[]) {
  return WinstonFormat((info) => {
    const result = traverse(info).forEach(function redactor () {
      if (this.key && sensitiveKeys.includes(this.key)) {
        this.update('[REDACTED]');
      }
    });

    const levelSym = Symbol.for('level');
    const splatSym = Symbol.for('splat');

    result[levelSym] = info[(levelSym as unknown) as string];
    result[splatSym] = info[(splatSym as unknown) as string];

    return result;
  });
}

function createLogger () {
  const loggingOptions = deepmerge(
    {},
    AppConfig.logging.common,
    AppConfig.logging?.server || {}
  );
  ensureLogDir(loggingOptions.destination);

  const redactFormat = getRedactFormat(loggingOptions.redact)();

  const timezoned = () => {
    return new Date().toLocaleString(loggingOptions.region, {
      timeZone: loggingOptions.timeZone,
      hour12: false
    });
  };

  const result: WinstonLogger = createWinstonLogger({
    level: loggingOptions.level,
    levels: {
      always: 0,
      error: 1,
      warn: 2,
      info: 3,
      http: 4,
      verbose: 5,
      debug: 6,
      silly: 7
    },
    format: combine(
      timestamp({ format: timezoned }),
      redactFormat,
      json()
    ),
    transports: [
      new (DailyRotateFile)({
        filename: loggingOptions.destination,
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: AppConfig.logging.server.maxFileSize
      })
    ]
  });
  return result;
}
