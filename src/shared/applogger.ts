import repeat from 'lodash-es/repeat';
import zip from 'lodash-es/zip';
import range from 'lodash-es/range';
import fromPairs from 'lodash-es/fromPairs';
import isString from 'lodash-es/isString';
import isNumber from 'lodash-es/isNumber';
import cloneDeep from 'lodash-es/cloneDeep';
import AppConfig from '../appconfig';
import { AppException, AppExceptionCodeEnum } from './../shared/exceptions';
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

export function getErrorCustomLogLevel (err?: any): LogLevel | undefined {
  if (!AppException.isAppException(err)) {
    return undefined;
  }

  const appExceptionCode = (err as AppException)?.code;
  if (!appExceptionCode) {
    return undefined;
  }

  const errEnumLookup = Object.entries(AppExceptionCodeEnum).filter(e => e[1].valueOf() === appExceptionCode.valueOf()).map(e => e[0].toUpperCase());
  if (errEnumLookup.length === 0) {
    return undefined;
  }
  const errCode = errEnumLookup[0].toUpperCase();
  return (AppConfig.logging.common.appExceptionLogLevels.find(r => r.appExceptionCode === errCode))?.logLevel;
}
