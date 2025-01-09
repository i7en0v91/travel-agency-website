import { flattenError, AppConfig, wrapLogDataArg } from '@golobe-demo/shared';
import { existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'pathe';
import deepmerge from 'lodash-es/merge';
import { type Logger as WinstonLogger, createLogger as createWinstonLogger, format as WinstonFormat } from 'winston';
import traverse from 'traverse';
import DailyRotateFile from 'winston-daily-rotate-file';
import { consola } from 'consola';

const { combine, timestamp, json } = WinstonFormat;

export class ElectronMainLogger {
  winstonLogger: WinstonLogger;

  constructor () {
    this.winstonLogger = createLoggerSync(AppConfig.electron!.logging.mainFile);
  }

  getLogDir() {
    return dirname(resolve(AppConfig.electron!.logging.mainFile));
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
      this.winstonLogger.warn(msg);
    } else {
      const errPoco = (err && err instanceof Error) ? flattenError(err) : err;
      const msgObj = { warn: msg };
      const logData = deepmerge(wrapLogDataArg(data), msgObj, errPoco || {});
      this.winstonLogger.warn(logData);
    }
  }

  error (msg: string, err?: any, data?: any) {
    if (!err && !data) {
      this.winstonLogger.error(msg);
    } else {
      const errPoco = (err && err instanceof Error) ? flattenError(err) : err;
      const msgObj = { error: msg };
      const logData = deepmerge(wrapLogDataArg(data), msgObj, errPoco || {});
      this.winstonLogger.error(logData);
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

export function installLoggingHooks(app: Electron.App, logger: ElectronMainLogger) {
  logger.verbose('(Logging) installing logging hooks');

  app.on('session-created', () => {
    logger.verbose('(Logging) session created');
  });

  app.on('browser-window-created', () => {
    logger.verbose('(Logging) browser window created');
  });

  app.on('second-instance', () => {
    logger.info('(Logging) second instance');
  });

  app.on('quit', () => { 
    logger.info('(Logging) quit');
  });

  process.on('uncaughtException', (err) => { 
    const msg = 'FATAL error occured, process MAY terminate!';
    process.exitCode = 1;
    try {
      consola.error(msg, err);
      logger.error(`(Logging) ${msg}`, err);
    } catch(err: any) {
      //
    } finally {
      // process.exit(1); // don't force shutdown (optionally)
    }
  });
 
  process.on('uncaughtExceptionMonitor', (err: Error, origin: string) => { 
    logger.warn(`(Logging) exception occured, origin=${origin}`, err);
  });

  logger.debug('(Logging) logging hooks installed');
}

function ensureLogDirSync (filePath: string) {
  const fileDir = dirname(filePath);
  if (!existsSync(fileDir)) {
    mkdirSync(fileDir, { recursive: true });
  }
}

function getRedactFormat (sensitiveKeys: string[]) {
  return WinstonFormat((info) => {
    const result = traverse(info).forEach(function redactor (this: any) {
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

function createLoggerSync (file: string) {
  const loggingOptions = deepmerge(
    {},
    AppConfig.logging.common,
    AppConfig.logging.server,
    { 
      level: AppConfig.electron!.logging.mailLogLevelOverride, 
      destination: file 
    }
  );
  ensureLogDirSync(loggingOptions.destination);

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
        maxSize: loggingOptions.maxFileSize
      })
    ]
  });
  return result;
}
