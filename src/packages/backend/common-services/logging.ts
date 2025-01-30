import { AppConfig } from '@golobe-demo/shared';
import { AppWinstonLoggerBase } from '@golobe-demo/shared/winston';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'pathe';
import deepmerge from 'lodash-es/merge';
import DailyRotateFile from 'winston-daily-rotate-file';

const ServerLoggingOptions = deepmerge(
  {},
  AppConfig.logging.common,
  AppConfig.logging.server
);

export class ServerLogger extends AppWinstonLoggerBase<typeof ServerLoggingOptions> {
  constructor() {
    super(ServerLoggingOptions);
  }

  override getLogDestinations(): { local: boolean; outside: boolean; } {
    return {
      local: false,
      outside: true // log level filtering will be performed by winston logger
    };
  }

  override getTransports() {
    return [new (DailyRotateFile)({
      filename: ServerLoggingOptions.destination,
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: ServerLoggingOptions.maxFileSize
    })];
  };

  public createLogger() {
    ensureLogDir(ServerLoggingOptions.destination);
    return super.createLogger();
  }
}

function ensureLogDir (filePath: string) {
  const fileDir = dirname(filePath);
  if (!existsSync(fileDir)) {
    mkdirSync(fileDir, { recursive: true });
  }
}