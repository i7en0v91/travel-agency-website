import isString from 'lodash-es/isString';
import isNumber from 'lodash-es/isNumber';
import { stringifyClone } from './../utils';
import AppConfig from './../appconfig';
import { type AppExceptionCode, flattenError, getErrorAppExceptionCode, wrapExceptionIfNeeded } from './../exceptions';
import type { LogLevel } from './../types';
import { LogLevelEnum, LogAlwaysLevel } from './../constants';
import deepmerge from 'lodash-es/merge';
import type { IAppLogger } from './common';
import { consola } from 'consola';

export abstract class AppLoggerBase<TOptions extends typeof AppConfig.logging.common> implements IAppLogger {
  lowerWarnsLevel = false;
  options: TOptions;

  constructor (options: TOptions) {
    this.options = options;
  }

  abstract getLogDestinations(level: LogLevelEnum): { local: boolean, outside: boolean };
  abstract logOutside(logData: { level: LogLevel | (typeof LogAlwaysLevel) }): void;

  lowerWarnsWithoutErrorLevel (useInfoLevel: boolean): void {
    this.lowerWarnsLevel = useInfoLevel;
  }

  debug (msg: string, data?: any) {
    const { local, outside } = this.getLogDestinations(LogLevelEnum.debug);

    if(local) {
      consola.log(`DEBUG [${new Date().toISOString()}] ${msg} ${data ? ('data=[' + JSON.stringify(data) + ']') : ''}`);
    }

    if(outside) {
      let logData = { level: this.level2str('debug'), msg } as any;
      if (data) {
        logData = deepmerge(this.wrapLogDataArg(data), logData);
      }
      this.logOutside(logData);
    }
  }

  verbose (msg: string, data?: any) {
    const { local, outside } = this.getLogDestinations(LogLevelEnum.verbose);

    if(local) {
      consola.log(`VERBOSE [${new Date().toISOString()}] ${msg} ${data ? ('data=[' + JSON.stringify(data) + ']') : ''}`);
    }

    if(outside) {
      let logData = { level: this.level2str('verbose'), msg } as any;
      if (data) {
        logData = deepmerge(this.wrapLogDataArg(data), logData);
      }
      this.logOutside(logData);
    }
  }

  info (msg: string, data?: any) {
    const { local, outside } = this.getLogDestinations(LogLevelEnum.info);

    if(local) {
      consola.log(`INFO [${new Date().toISOString()}] ${msg} ${data ? ('data=[' + JSON.stringify(data) + ']') : ''}`);
    }

    if(outside)  {
      let logData = { level: this.level2str('info'), msg } as any;
      if (data) {
        logData = deepmerge(this.wrapLogDataArg(data), logData);
      }
      this.logOutside(logData);
    }
  }

  warn (msg: string, err?: any, data?: any) {
    let usedLoglevel: LogLevel = (this.lowerWarnsLevel && !err) ? 'info' : 'warn';
    const customLogLevel = err ? this.getAppExceptionCustomLogLevel(getErrorAppExceptionCode(err)) : undefined;
    if (customLogLevel) {
      usedLoglevel = customLogLevel;
    }

    const { local, outside } = this.getLogDestinations(LogLevelEnum[usedLoglevel]);
    if(!local && !outside) {
      return;
    }

    let logData = { level: usedLoglevel, msg } as any;
    if (err || data) {
      const errPoco = err ? flattenError(wrapExceptionIfNeeded(err)) : {};
      logData = deepmerge(this.wrapLogDataArg(data), logData, errPoco);
    }

    if(local) {
      this.logProblemsToConsoleIfNeeded(logData, err);
    }

    if(outside) {
      this.logOutside(logData);
    }
  }

  error (msg: string, err?: any, data?: any) {
    let usedLoglevel: LogLevel = 'error';
    const customLogLevel = err ? this.getAppExceptionCustomLogLevel(getErrorAppExceptionCode(err)) : undefined;
    if (customLogLevel) {
      usedLoglevel = customLogLevel;
    }

    const { local, outside } = this.getLogDestinations(LogLevelEnum[usedLoglevel]);
    if(!local && !outside) {
      return;
    }

    let logData = { level: usedLoglevel, msg } as any;
    if (err || data) {
      const errPoco = err ? flattenError(wrapExceptionIfNeeded(err)) : {};
      logData = deepmerge(this.wrapLogDataArg(data), logData, errPoco);
    }

    if(local) {
      this.logProblemsToConsoleIfNeeded(logData, err);
    }

    if(outside) {
      this.logOutside(logData);
    }
  }

  always (msg: string, data?: any): void {
    const { local, outside } = this.getLogDestinations(LogLevelEnum.error);

    if(local) {
      consola.log(`ALWAYS [${new Date().toISOString()}] ${msg} ${data ? ('data=[' + JSON.stringify(data) + ']') : ''}`);
    }
    
    if(outside) {
      let logData = { level: LogAlwaysLevel, msg } as any;
      if (data) {
        logData = deepmerge(this.wrapLogDataArg(data), logData);
      }
      this.logOutside(logData);
    }
  }

  level2str (level: LogLevel) : string {
    return level.toString();
  }

  wrapLogDataArg (data?: any): object {
    if (!data) {
      return {};
    }
  
    if (isString(data) || isNumber(data)) {
      return { val: data };
    }
    return stringifyClone(data || {});
  }
  
  getAppExceptionCustomLogLevel (appExceptionCode: AppExceptionCode | undefined): LogLevel | undefined {
    if (!appExceptionCode) {
      return undefined;
    }
    return (AppConfig.logging.common.appExceptionLogLevels.find(r => r.appExceptionCode === appExceptionCode))?.logLevel;
  }

  logProblemsToConsoleIfNeeded (logData: { level: LogLevel, msg: string }, err: any) {
    // if(isElectronBuild()) {
    //   return;
    // }

    if (logData.level === 'warn') {
      consola.warn(`WARN ${logData.msg}`, err);
    } else if (logData.level === 'error') {
      consola.error(`ERROR ${logData.msg}`, err);
    } else {
      consola.info(`INFO ${logData.msg}`, err);
    }
  }
}