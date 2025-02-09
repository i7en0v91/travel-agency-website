import { AppException, AppExceptionCodeEnum, AvailableLocaleCodes, type IAppLogger, type Locale, type I18nResName } from '@golobe-demo/shared';
import get from 'lodash-es/get';
import flatten from 'lodash-es/flatten';
import toPairs from 'lodash-es/toPairs';
import isObject from 'lodash-es/isObject';
import difference from 'lodash-es/difference';
import uniq from 'lodash-es/uniq';
import type { IAppAssetsProvider, IInitializableOnStartup } from '../types';

export interface IServerI18n extends IInitializableOnStartup {
  getLocalizedResource(resName: I18nResName, locale: Locale): string;
}

export class ServerI18n implements IServerI18n {
  private logger: IAppLogger;
  private localizationMap: ReadonlyMap<Locale, NonNullable<unknown>>;
  private appAssetsProvider: IAppAssetsProvider;

  public static inject = ['appAssetsProvider', 'logger'] as const;
  constructor (appAssetsProvider: IAppAssetsProvider, logger: IAppLogger) {
    this.logger = logger;
    this.localizationMap = new Map<Locale, NonNullable<unknown>>();
    this.appAssetsProvider = appAssetsProvider;
  }

  initialize = async (): Promise<void> => {
    this.localizationMap = await this.createLocalizationMap();
  };

  getKeysRecusive = (currentList: [string[], any][], level: number): [string[], any][] => {
    if (level > 10) {
      this.logger.error('(ServerI18n) cannot access localization file, recursion limit reached');
      throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'internal server error', 'error-page');
    }

    if (currentList.every(x => !isObject(x[1]))) {
      return currentList.map(x => [x[0], '#']); // terminating leaf
    }

    const listAfterIteration = flatten(currentList.map(
      ([x, y]) => ((isObject(y) ? this.getKeysRecusive(toPairs(y).map(p => [[...x, p[0]], p[1]] as [string[], any]), level + 1) as [string[], any][] : [[x, y] as [string[], any]])) as [string[], any][]
    ));
    return this.getKeysRecusive(listAfterIteration, level + 1);
  };

  getKeys = (obj?: NonNullable<unknown> | undefined): string[] => {
    if (!obj) {
      return [];
    }

    return this.getKeysRecusive(toPairs(obj).map(p => [[p[0]], p[1]]), 0).map((x) => { return ((flatten(x[0]) as string[])).join(':'); });
  };

  getLocalizedResource = (resName: I18nResName, locale: Locale): string => {
    this.logger.debug(`(ServerI18n) access resource: locale=${locale}, resName=${resName}`);
    const entries = this.localizationMap.get(locale);
    if (!entries) {
      this.logger.warn(`(ServerI18n) resource was not found: locale=${locale}, resName=${resName}`);
      return '';
    }
    const result = get(entries, resName);
    this.logger.debug(`(ServerI18n) resource accessed: locale=${locale}, resName=${resName}, result=${result}`);
    return result;
  };

  loadLocalization = async (locale: Locale): Promise<NonNullable<unknown>> => {
    this.logger.verbose(`(ServerI18n) initializing localization map: locale=${locale}`);
    const result = await this.appAssetsProvider.getLocalization(locale);
    this.logger.verbose(`(ServerI18n) localization map initialization completed, locale=${locale}`);
    return result;
  };

  createLocalizationMap = async (): Promise<ReadonlyMap<Locale, NonNullable<unknown>>> => {
    this.logger.info('(ServerI18n) initializing localization map');

    let numEntries: number | undefined;
    const resultMap = new Map<Locale, NonNullable<unknown>>([]);
    for (let i = 0; i < AvailableLocaleCodes.length; i++) {
      const locale = <Locale>AvailableLocaleCodes[i];
      const entries = await this.loadLocalization(locale);
      resultMap.set(locale, entries);
      const localeEntries = entries ? this.getKeys(entries).length : 0;
      if (!numEntries) {
        numEntries = localeEntries;
      } else if (numEntries !== localeEntries) {
        const intialKeys = this.getKeys(resultMap.get(<Locale>AvailableLocaleCodes[0]));
        const actualKeys = this.getKeys(resultMap.get(locale));
        const diffKeys = uniq([...difference(intialKeys, actualKeys), ...difference(actualKeys, intialKeys)]);
        const allKeys = uniq([...intialKeys, ...actualKeys]);
        this.logger.warn(`(ServerI18n) number of entries in ${locale} file does not match initial: actual=${localeEntries}, initial=${numEntries}, diffKeys=${JSON.stringify(diffKeys)}, allKeys=[${allKeys}]`);
      }
    }

    this.logger.info(`(ServerI18n) localization map initialization completed, numEntries=${numEntries}`);
    return resultMap;
  };
}
