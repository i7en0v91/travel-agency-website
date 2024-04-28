import repeat from 'lodash-es/repeat';
import zip from 'lodash-es/zip';
import range from 'lodash-es/range';
import fromPairs from 'lodash-es/fromPairs';
import isString from 'lodash-es/isString';
import isNumber from 'lodash-es/isNumber';
import cloneDeep from 'lodash-es/cloneDeep';
import type { LogObject } from 'consola';
import AppConfig from '../appconfig';
import { type AppExceptionCode, AppException, lookupAppExceptionCode } from './../shared/exceptions';
import type { LogLevel } from './../shared/constants';

/** Log message will be suppressed only if all specified filters combined by AND mathches their input strings */
export interface ILogSuppressionRule {
  messageFitler?: RegExp, // event-related text (message & error text) filter
  componentNameFilter?: RegExp // event-related vue component name filter
}

export interface IAppLogger {
  lowerWarnsWithoutErrorLevel(useInfoLevel: boolean): void

  debug(msg: string, data?: any) : void;

  verbose(msg: string, data?: any) : void;

  info(msg: string, data?: any) : void;

  warn(msg: string, err?: any, data?: any): void;

  error(msg: string, err?: any, data?: any) : void;

  always(msg: string, data?: any) : void;
}

export function maskLog (v?: string): string | undefined {
  if (!v) {
    return v;
  }

  const charsVisible = AppConfig.logging.common.maskedNumCharsVisible;
  if (v.length <= 2 * charsVisible) {
    return repeat('*', v.length);
  }

  return `${v.substring(0, charsVisible)}${repeat('*', v.length - 2 * charsVisible)}${v.substring(v.length - charsVisible, v.length)}`;
}

export function buildParamsLogData (...params: any[]): any {
  if (!params || params.length === 0) {
    return undefined;
  }

  const numberedArguments: [string, string][] = zip(range(1, params.length + 1), params)
    .map((t) => { return [t[0]!.toString(), JSON.stringify(t[1])]; });
  return fromPairs(numberedArguments);
}

export function wrapLogDataArg (data?: any): object {
  if (!data) {
    return {};
  }

  if (isString(data) || isNumber(data)) {
    return { val: data };
  }
  return cloneDeep(data || {});
}

export function getErrorAppExceptionCode (err?: any): AppExceptionCode | undefined {
  if (!AppException.isAppException(err)) {
    return lookupAppExceptionCode(err?.cause?.data?.code);
  }

  const appExceptionCode = (err as AppException)?.code;
  if (!appExceptionCode) {
    return undefined;
  }

  return lookupAppExceptionCode(appExceptionCode);
}

export function getAppExceptionCustomLogLevel (appExceptionCode: AppExceptionCode | undefined): LogLevel | undefined {
  if (!appExceptionCode) {
    return undefined;
  }
  return (AppConfig.logging.common.appExceptionLogLevels.find(r => r.appExceptionCode === appExceptionCode))?.logLevel;
}

export function parseLevelFromNuxtLog (logItem: LogObject): LogLevel {
  switch (logItem.level) {
    case 0:
      return 'error';
    case 1:
      return 'warn';
    case 2:
    case 3:
      return 'info';
    case 4:
      return 'verbose';
    case 5:
    case 999:
      return 'debug';
    case -999:
      return 'debug';
  }

  switch (logItem.type) {
    case 'trace':
    case 'verbose':
      return 'verbose';
    case 'debug':
      return 'debug';
    case 'info':
    case 'log':
    case 'ready':
    case 'start':
    case 'success':
    case 'box':
      return 'info';
    case 'warn':
      return 'warn';
    case 'error':
    case 'fail':
    case 'fatal':
      return 'error';
    default:
      return 'verbose';
  }
}
