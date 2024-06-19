import { access } from 'fs/promises';
import once from 'lodash-es/once';
import { join } from 'pathe';
import { type IAppLogger } from '../shared/applogger';
import { ServerLogger } from '../server-logic/helpers/logging';
import AppConfig from '../appconfig';
import installLoggingHooks from './logging-hooks';
import toPairs from 'lodash-es/toPairs';
import { getOgImageFileName } from '../shared/common';
import { type Locale, AvailableLocaleCodes } from '../shared/constants';
import { resolveParentDirectory } from '../shared/fs';
import type { NitroRouteConfig } from 'nitropack';
import { type HtmlPage, AllHtmlPages, EntityIdPages } from '../shared/page-query-params';

async function checkOgImageConfiguration (logger: IAppLogger): Promise<void> {
  if (!process.env.PUBLISH) {
    logger.verbose('skipping OG images check for non-publish environment');
    return;
  }

  if (!AppConfig.ogImage.enabled) {
    logger.error('OG image is disabled!');
    throw new Error('OG image is disabled!');
  }

  logger.verbose('starting OG images check');
  const publicAssetsDir = await resolveParentDirectory('.', 'public');
  if (!publicAssetsDir) {
    logger.error('OG image check failed - cannot locate public directory!');
    throw new Error('OG image check failed - cannot locate public directory!');
  }

  const ogImageDir = join(publicAssetsDir, 'img', 'og');
  const imgPages: HtmlPage[] = AllHtmlPages.filter(p => !EntityIdPages.includes(p as HtmlPage));
  for (let i = 0; i < imgPages.length; i++) {
    for (let j = 0; j < AvailableLocaleCodes.length; j++) {
      const imgPath = join(ogImageDir, getOgImageFileName(imgPages[i], AvailableLocaleCodes[j] as Locale));
      try {
        await access(imgPath);
      } catch (err: any) {
        logger.error(`og image was not found, page=${imgPath}`);
        throw new Error('OG image check failed');
      }
    }
  }

  logger.info('OG images check completed');
}

const initApp = once(async () => {
  const logger = new ServerLogger(); // container has not built yet
  try {
    logger.always(`APP STARTING... (${import.meta.env.MODE})`); // use error level to be sure it is logged no matter which logging level is in config
    //(globalThis as any).CommonServicesLocator = (globalThis as any).ServerServicesLocator = await buildBackendServicesLocator();
    if (AppConfig.email) {
      await ServerServicesLocator.getEmailSender().verifySetup();
    } else if (process.env.PUBLISH) {
      logger.error('Emailing is not configured!');
      throw new Error('Emailing is not configured!');
    } else {
      logger.info('skipping email infrastructure check as it is disabled');
    }
    ServerServicesLocator.getServerI18n().initialize();
    await checkOgImageConfiguration(logger);
    ServerServicesLocator.getHtmlPageCacheCleaner().initialize();
  } catch (e) {
    logger.error('app initialization failed', e);
    throw e;
  }
});

const logRouteRulesOnce = once((routeRules: [string, NitroRouteConfig][]) => { 
  const logger = CommonServicesLocator.getLogger();
  // remove notion of 'error' from message
  const filteredRoutes = routeRules.map(rr => `[${rr[0]}: ${JSON.stringify(rr[1])}]`).filter(t => !t.includes('error'));
  logger.info(`Route rules config: ${JSON.stringify(filteredRoutes)}`);
});

export default defineNuxtPlugin({
  parallel: false,
  dependsOn: ['data-seed.server'],
  async setup (nuxtApp) {
    await initApp();
    const rules = toPairs(nuxtApp.$config.nitro?.routeRules) ?? [];
    logRouteRulesOnce(rules);
  },
  hooks: {
    'app:created' () {
      const nuxtApp = useNuxtApp();
      installLoggingHooks(nuxtApp);
    }
  }
});
