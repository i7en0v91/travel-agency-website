import AppConfig from './appconfig';
import { isTestEnv } from './environment';

export * from './constants';
export * from './utils';
export * from './validation';
export * from './types';
export * from './pages';
export * from './strings';
export * from './datetime';
export * from './domain';
export * from './fs';
export * from './environment';
export * from './timer';
export * from './i18n';
export { type IAppLogger, maskLog, buildParamsLogData, parseLevelFromNuxtLog, checkNeedSuppressServerMsg, checkNeedSuppressVueMsg } from './logging/common';
export { AppLoggerBase } from './logging/base-logger';
export { type AppExceptionAppearance, AppExceptionCodeEnum, AppException, lookupAppExceptionCode, getErrorAppExceptionCode, UntypedJsException, wrapExceptionIfNeeded, mapAppExceptionToHttpStatus, getUsrMsgResName } from './exceptions';
export { default as AppConfig, AppName, HostUrl, SQLiteDbName, type IAcsysOptions, type IAcsysUserOptions } from './appconfig';

export const CachedResultsInAppServicesEnabled = !isTestEnv() && !!AppConfig.caching.intervalSeconds;