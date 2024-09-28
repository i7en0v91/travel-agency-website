import { flattenError, wrapExceptionIfNeeded, LogAlwaysLevel, LogLevelEnum, type LogLevel, isDevOrTestEnv, HeaderAppVersion, AppConfig, type IAppLogger, wrapLogDataArg, getAppExceptionCustomLogLevel, getErrorAppExceptionCode } from '@golobe-demo/shared';
import deepmerge from 'lodash-es/merge';
import { consola } from 'consola';

export class ClientLogger implements IAppLogger {
  logLevel: LogLevelEnum;
  lowerWarnsLevel = false;

  constructor () {
    this.logLevel = LogLevelEnum[AppConfig.logging.common.level as LogLevel];
    if (!this.logLevel) {
      this.logLevel = LogLevelEnum.warn;
      consola.error(`invalid level specified for logging subsystem: ${AppConfig.logging.common.level}`);
    }
  }

  lowerWarnsWithoutErrorLevel (useInfoLevel: boolean): void {
    this.lowerWarnsLevel = useInfoLevel;
  }

  debug (msg: string, data?: object | undefined): void {
    if (!this.checkPassLogLevel(LogLevelEnum.debug)) {
      return;
    }

    consola.log(`[${new Date().toISOString()}] ${msg} ${data ? ('data=[' + JSON.stringify(data) + ']') : ''}`);
  }

  verbose (msg: string, data?: any): void {
    if (!this.checkPassLogLevel(LogLevelEnum.verbose)) {
      return;
    }

    consola.log(`[${new Date().toISOString()}] ${msg} ${data ? ('data=[' + JSON.stringify(data) + ']') : ''}`);
  }

  info (msg: string, data?: any): void {
    if (!this.checkPassLogLevel(LogLevelEnum.info)) {
      return;
    }

    let logData = { level: this.level2str('info'), msg } as any;
    if (data) {
      logData = deepmerge(wrapLogDataArg(data), logData);
    }

    this.sendLogData(logData);

    consola.log(`[${new Date().toISOString()}] ${msg} ${data ? ('data=[' + JSON.stringify(data) + ']') : ''}`);
  }

  warn (msg: string, err?: any, data?: object): void {
    if (!this.checkPassLogLevel(LogLevelEnum.warn)) {
      return;
    }

    let loglevel: LogLevel = (this.lowerWarnsLevel && !err) ? 'info' : 'warn';
    const customLogLevel = err ? getAppExceptionCustomLogLevel(getErrorAppExceptionCode(err)) : undefined;
    if (customLogLevel) {
      loglevel = customLogLevel;
    }
    let logData = { level: this.level2str(loglevel), msg } as any;
    if (err || data) {
      const errPoco = err ? flattenError(wrapExceptionIfNeeded(err)) : {};
      logData = deepmerge(wrapLogDataArg(data), logData, errPoco);
    }
    this.logProblemsToConsoleIfNeeded(logData, err);

    this.sendLogData(logData);
  }

  error (msg: string, err?: any, data?: object): void {
    if (!this.checkPassLogLevel(LogLevelEnum.error)) {
      return;
    }

    let loglevel: LogLevel = 'error';
    const customLogLevel = err ? getAppExceptionCustomLogLevel(getErrorAppExceptionCode(err)) : undefined;
    if (customLogLevel) {
      loglevel = customLogLevel;
    }
    let logData = { level: this.level2str(loglevel), msg } as any;
    if (err || data) {
      const errPoco = err ? flattenError(wrapExceptionIfNeeded(err)) : {};
      logData = deepmerge(wrapLogDataArg(data), logData, errPoco);
    }
    this.logProblemsToConsoleIfNeeded(logData, err);

    this.sendLogData(logData);
  }

  always (msg: string, data?: any): void {
    let logData = { level: LogAlwaysLevel, msg } as any;
    if (data) {
      logData = deepmerge(wrapLogDataArg(data), logData);
    }

    this.sendLogData(logData);

    consola.log(`[${new Date().toISOString()}] ${msg} ${data ? ('data=[' + JSON.stringify(data) + ']') : ''}`);
  }

  logProblemsToConsoleIfNeeded (logData: { level: LogLevel, msg: string }, err: any) {
    if (isDevOrTestEnv()) {
      if (logData.level === 'warn') {
        consola.warn(logData.msg, err);
      } else if (logData.level === 'error') {
        consola.error(logData.msg, err);
      } else {
        consola.info(logData.msg, err);
      }
    }
  }

  level2str (level: LogLevel) : string {
    return level.toString();
  }

  checkPassLogLevel (level: LogLevelEnum) : boolean {
    return level.valueOf() >= this.logLevel.valueOf();
  }

  async sendLogData (logData: object) {
    try {
      await $fetch(AppConfig.logging.client.path,
        {
          method: 'POST',
          body: logData,
          cache: 'no-store',
          headers: [[HeaderAppVersion, AppConfig.versioning.appVersion.toString()]]
        });
    } catch(error: any) {
      consola.error('error occured while sending logs to server', error);
    }
  }
}
