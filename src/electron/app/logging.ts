import { type LogLevel, LogLevelEnum, AppConfig } from '@golobe-demo/shared';
import { AppWinstonLoggerBase } from '@golobe-demo/shared/winston';
import { existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'pathe';
import { consola } from 'consola';
import deepmerge from 'lodash-es/merge';
import DailyRotateFile from 'winston-daily-rotate-file';

const MailFileLoggingOptions = deepmerge(
  {},
  AppConfig.logging.common,
  AppConfig.logging.server,
  { 
    destination: AppConfig.electron!.logging.mainFile,
    level: AppConfig.electron!.logging.mainLogLevelOverride
  }
);

export class ElectronMainLogger extends AppWinstonLoggerBase<typeof MailFileLoggingOptions> {
  logLevel: LogLevelEnum;
  fileLogLevel: LogLevelEnum;

  constructor() {
    super(MailFileLoggingOptions);
    this.logLevel = LogLevelEnum[AppConfig.logging.common.level as LogLevel];
    this.fileLogLevel = LogLevelEnum[AppConfig.electron!.logging.mainLogLevelOverride as LogLevel];
  }

  getLogDir() {
    return dirname(resolve(AppConfig.electron!.logging.mainFile));
  }

  override getLogDestinations(level: LogLevelEnum): { local: boolean; outside: boolean; } {
    return {
      local: this.checkPassLogLevel(level),
      outside: this.checkNeedFileLogging(level)
    };
  }

  checkPassLogLevel (level: LogLevelEnum) : boolean {
    return level.valueOf() >= this.logLevel.valueOf();
  }

  checkNeedFileLogging (level: LogLevelEnum) : boolean {
    return level.valueOf() >= this.fileLogLevel.valueOf();
  }
  
  override getTransports() {
    return [new (DailyRotateFile)({
      filename: MailFileLoggingOptions.destination,
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: MailFileLoggingOptions.maxFileSize
    })];
  };

  ensureLogDir (filePath: string) {
    const fileDir = dirname(filePath);
    if (!existsSync(fileDir)) {
      mkdirSync(fileDir, { recursive: true });
    }
  }
  
  override createLogger() {
    this.ensureLogDir(MailFileLoggingOptions.destination);
    return super.createLogger();
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
      consola.warn(err);
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