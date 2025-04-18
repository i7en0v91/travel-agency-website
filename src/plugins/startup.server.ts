import { type AppPage, AllHtmlPages, EntityIdPages, lookupParentDirectory, type Locale, AvailableLocaleCodes, getOgImageFileName, AppConfig, type IAppLogger } from '@golobe-demo/shared';
import { access } from 'fs/promises';
import once from 'lodash-es/once';
import { join } from 'pathe';
import installLoggingHooks from './logging-hooks';
import toPairs from 'lodash-es/toPairs';
import type { NitroRouteConfig } from 'nitropack';
import { getCommonServices } from '../helpers/service-accessors';

const CommonLogProps = { component: 'StartupServer' };

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
  const publicAssetsDir = await lookupParentDirectory('.', 'public', async (path: string) => { await access(path); return true; });
  if (!publicAssetsDir) {
    logger.error('OG image check failed - cannot locate public directory!');
    throw new Error('OG image check failed - cannot locate public directory!');
  }

  const ogImageDir = join(publicAssetsDir, 'img', 'og');
  const imgPages: AppPage[] = AllHtmlPages.filter(p => !EntityIdPages.includes(p as AppPage));
  for (let i = 0; i < imgPages.length; i++) {
    for (let j = 0; j < AvailableLocaleCodes.length; j++) {
      const imgPath = join(ogImageDir, getOgImageFileName(imgPages[i], AvailableLocaleCodes[j] as Locale));
      try {
        await access(imgPath);
      } catch (err: any) {
        logger.error(`og image was not found`, err, { page: imgPath });
        throw new Error('OG image check failed');
      }
    }
  }

  logger.info('OG images check completed');
}

const initApp = once(async () => {
  const logger = getCommonServices().getLogger().addContextProps(CommonLogProps);
  try {
    logger.always(`APP STARTING...`, { mode: import.meta.env.MODE}); // use error level to be sure it is logged no matter which logging level is in config
    await checkOgImageConfiguration(logger);
  } catch (e) {
    logger.error('app initialization failed', e);
    throw e;
  }
});

const logRouteRulesOnce = once((routeRules: [string, NitroRouteConfig][]) => { 
  const logger = getCommonServices().getLogger().addContextProps(CommonLogProps);
  // remove notion of 'error' from message
  const filteredRoutes = routeRules.map(rr => `[${rr[0]}: ${JSON.stringify(rr[1])}]`).filter(t => !t.includes('error'));
  logger.info(`Route rules config`, { routes: filteredRoutes });
});

export default defineNuxtPlugin({
  parallel: false,
  dependsOn: ['error-page-handler.server'],
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
