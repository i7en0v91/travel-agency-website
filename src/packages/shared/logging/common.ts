import repeat from 'lodash-es/repeat';
import zip from 'lodash-es/zip';
import range from 'lodash-es/range';
import fromPairs from 'lodash-es/fromPairs';
import type { LogObject } from 'consola';
import AppConfig from './../appconfig';
import type { LogLevel } from './../types';

/** Log message will be suppressed only if all specified filters combined by AND mathches their input strings */
export interface ILogSuppressionRule {
  messageFitler?: RegExp, // event-related text (message & error text) filter
}

export interface ILogVueSuppressionRule extends ILogSuppressionRule  {
  componentNameFilter?: RegExp // event-related vue component name filter
}

export interface IAppLogger {
  addContextProps(props: Record<string, any>): IAppLogger;

  lowerWarnsWithoutErrorLevel(useInfoLevel: boolean): void;

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

export function checkNeedSuppressServerMsg (msg?: string, err?: any): boolean {
  const serverSuppressRules = AppConfig.logging.suppress.server;
  for (let i = 0; i < serverSuppressRules.length; i++) {
    const rule = serverSuppressRules[i];
    if(testLogSuppressionRule(rule, msg, err)) {
      return true;
    }
  }

  return false;
}

export function checkNeedSuppressVueMsg (msg?: string, trace?: string, err?: any): boolean {
  const vueSuppressRules = AppConfig.logging.suppress.vue;

  for (let i = 0; i < vueSuppressRules.length; i++) {
    const rule = vueSuppressRules[i];
    if(!testLogSuppressionRule(rule, msg, err)) {
      continue;
    }

    if (rule.componentNameFilter) {
      let matchesComponent = false;
      if (trace) {
        matchesComponent = (trace.match(rule.componentNameFilter)?.length ?? 0) > 0;
      }
      if (!matchesComponent && err) {
        matchesComponent = (JSON.stringify(err).match(rule.componentNameFilter)?.length ?? 0) > 0;
      }
      if (matchesComponent) {
        return true;
      }
    }
  }

  return false;
}

function testLogSuppressionRule(rule: ILogSuppressionRule, msg?: string, err?: any): boolean {
  if (rule.messageFitler) {
    let matchesMsg = false;
    if (msg) {
      matchesMsg = (msg.match(rule.messageFitler)?.length ?? 0) > 0;
    }
    if (!matchesMsg && err) {
      matchesMsg = (JSON.stringify(err).match(rule.messageFitler)?.length ?? 0) > 0;
    }
    if (!matchesMsg) {
      return false;
    }
  } else {
    return false;
  }
  return true;
}