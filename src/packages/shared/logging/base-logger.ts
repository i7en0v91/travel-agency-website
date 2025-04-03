import isString from 'lodash-es/isString';
import isNumber from 'lodash-es/isNumber';
import AppConfig from './../appconfig';
import { type AppExceptionCode, flattenError, getErrorAppExceptionCode, wrapExceptionIfNeeded } from './../exceptions';
import type { LogLevel } from './../types';
import { toShortForm, type ControlKey } from './../utils';
import { PrimitiveDataValuePropName, LogLevelEnum, LogAlwaysLevel } from './../constants';
import deepmerge from 'lodash-es/merge';
import type { IAppLogger } from './common';
import { consola } from 'consola';
import cloneDeep from 'lodash-es/cloneDeep';
import forIn from 'lodash-es/forIn';
import bind from 'lodash-es/bind';
import omit from 'lodash-es/omit';
import traverse from 'traverse';
import isArray from 'lodash-es/isArray';
import set from 'lodash-es/set';

type LogData = { 
  msg: string,
  level: LogLevel | (typeof LogAlwaysLevel) 
};

function isPrimitiveData(data?: any): boolean {
  return !!data && (isString(data) || isNumber(data));
}

function createContextPropsWrapper(props: Record<string, any>, parent: IAppLogger): IAppLogger {
  const mergeProps = (data?: any): any => deepmerge(
    isPrimitiveData(data) ? set({}, PrimitiveDataValuePropName, data) : (cloneDeep(data) ?? {}), 
    props
  );

  const result: IAppLogger = {
    addContextProps(props2: Record<string, any>): IAppLogger {
      return createContextPropsWrapper(props2, result);
    },

    lowerWarnsWithoutErrorLevel(useInfoLevel: boolean): void {
      parent.lowerWarnsWithoutErrorLevel(useInfoLevel);
    },

    debug(msg: string, data?: any): void {
      parent.debug(msg, mergeProps(data));
    },

    verbose(msg: string, data?: any): void {
      parent.verbose(msg, mergeProps(data));
    },

    info(msg: string, data?: any): void {
      parent.info(msg, mergeProps(data));
    },

    warn(msg: string, err?: any, data?: any): void {
      parent.warn(msg, err, mergeProps(data));
    },

    error(msg: string, err?: any, data?: any): void {
      parent.error(msg, err, mergeProps(data));
    },

    always(msg: string, data?: any) : void {
      parent.always(msg, mergeProps(data));
    }
  };
  
  forIn(result, (_, key, object) => {
    if(typeof (object as any)[key] === 'function') {
      (object as any)[key] = bind((object as any)[key], object);
    }
  });

  return result;
}

export abstract class AppLoggerBase<TOptions extends typeof AppConfig.logging.common> implements IAppLogger {
  lowerWarnsLevel = false;
  props: Record<string, any> = {};
  
  protected options: TOptions;

  constructor (options: TOptions) {
    this.options = options;
  }

  abstract getLogDestinations(level: LogLevelEnum): { local: boolean, outside: boolean };
  abstract logOutside(logData: LogData): void;

  private convertLogArgsToLocalMsg(logData: LogData): string {
    if('ctrlKey' in logData) {
      (logData as any).ctrlKeyShort = toShortForm(logData.ctrlKey as ControlKey);
      (logData as any).ctrlKey = (logData.ctrlKey as ControlKey).join(':');
    }
    return `${logData.level.toUpperCase()} [${new Date().toISOString()}] ${logData.msg} ${logData ? ('data=[' + JSON.stringify(omit(logData, 'msg', 'level')) + ']') : ''}`;
  }

  private logLocal(logData: LogData, err?: any): void {
    const formattedMsg = this.convertLogArgsToLocalMsg(logData);
    switch(logData.level) {
      case 'debug':
        consola.log(formattedMsg);
        break;
      case 'verbose':
        consola.log(formattedMsg);
        break;
      case 'info':
        consola.info(formattedMsg);
        break;
      case 'warn':
        consola.warn(formattedMsg, err);
        break;
      case 'error':
        consola.error(formattedMsg, err);
        break;
      default:
        consola.info(formattedMsg);
    }
  }  

  addContextProps(props: Record<string, any>): IAppLogger {
    return createContextPropsWrapper(props, this);
  }

  lowerWarnsWithoutErrorLevel (useInfoLevel: boolean): void {
    this.lowerWarnsLevel = useInfoLevel;
  }

  debug (msg: string, data?: any) {
    const { local, outside } = this.getLogDestinations(LogLevelEnum.debug);

    let logData = { level: this.level2str('debug'), msg } as any;
    if (data) {
      logData = deepmerge(this.wrapLogDataArg(data), logData);
    }

    if(local) {
      this.logLocal(logData);
    }
    if(outside) { 
      this.logOutside(logData);
    }
  }

  verbose (msg: string, data?: any) {
    const { local, outside } = this.getLogDestinations(LogLevelEnum.verbose);

    let logData = { level: this.level2str('verbose'), msg } as any;
    if (data) {
      logData = deepmerge(this.wrapLogDataArg(data), logData);
    }

    if(local) {
      this.logLocal(logData);
    }
    if(outside) {
      
      this.logOutside(logData);
    }
  }

  info (msg: string, data?: any) {
    const { local, outside } = this.getLogDestinations(LogLevelEnum.info);

    let logData = { level: this.level2str('info'), msg } as any;
    if (data) {
      logData = deepmerge(this.wrapLogDataArg(data), logData);
    }

    if(local) {
      this.logLocal(logData);
    }
    if(outside)  {
      
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
      this.logLocal(logData, err);
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
      this.logLocal(logData, err);
    }
    if(outside) {
      this.logOutside(logData);
    }
  }

  always (msg: string, data?: any): void {
    const { local, outside } = this.getLogDestinations(LogLevelEnum.error);
    
    let logData = { level: LogAlwaysLevel, msg } as any;
    if (data) {
      logData = deepmerge(this.wrapLogDataArg(data), logData);
    }

    if(local) {
      this.logLocal(logData);
    }
    if(outside) { 
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
  
    if (isPrimitiveData(data)) {
      return set({}, PrimitiveDataValuePropName, data);
    }

    const result = cloneDeep(data || {});
    const maxLength = this.options.maxArrayLoggingLength;
    return traverse(result).forEach(function redactor (this: any) {
      if (this.key && this.value && isArray(this.value) && this.value.length > maxLength) {
        this.update(this.value.length);
      }
    });
  }
  
  getAppExceptionCustomLogLevel (appExceptionCode: AppExceptionCode | undefined): LogLevel | undefined {
    if (!appExceptionCode) {
      return undefined;
    }
    return (AppConfig.logging.common.appExceptionLogLevels.find(r => r.appExceptionCode === appExceptionCode))?.logLevel;
  }
}