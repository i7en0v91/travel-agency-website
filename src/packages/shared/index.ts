import AppConfig from './appconfig';
import { isTestEnv } from './utils';

export * from './constants';
export * from './utils';
export * from './validation';
export * from './types';
export * from './pages';
export * from './strings';
export * from './datetime';
export { maskLog, buildParamsLogData, wrapLogDataArg, getAppExceptionCustomLogLevel, parseLevelFromNuxtLog, checkNeedSuppressServerMsg, checkNeedSuppressVueMsg } from './applogger';
export { getI18nResName1, getI18nResName2, getI18nResName3, patchUrlWithLocale, getLocaleFromUrl, RuPluralizationRule, localizePath } from './i18n';
export { type AppExceptionAppearance, AppExceptionCodeEnum, AppException, lookupAppExceptionCode, getErrorAppExceptionCode, UntypedJsException, wrapExceptionIfNeeded, flattenError, mapAppExceptionToHttpStatus, getUsrMsgResName } from './exceptions';
export { default as AppConfig, HostUrl, SQLiteDbName, type IAcsysOptions, type IAcsysUserOptions } from './appconfig';

export const CachedResultsInAppServicesEnabled = !isTestEnv() && !!AppConfig.caching.intervalSeconds;