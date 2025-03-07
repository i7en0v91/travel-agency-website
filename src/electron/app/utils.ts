import { net } from 'electron';
import { DefaultLocale, AppConfig, delay } from '@golobe-demo/shared';
import type { ElectronMainLogger } from './logging';
import { consola } from 'consola';

export async function pingServer(timeoutMs: number, logger: ElectronMainLogger): Promise<boolean> {
  let openPromiseEnded = false;
  let openPromise: Promise<boolean>;
  let openMainPageRequest: Electron.ClientRequest;
  try {
    logger.debug('pinging server');
    
    openMainPageRequest = net.request({
      url: AppConfig.siteUrl,
      method: 'GET',
      cache: 'no-cache',
      useSessionCookies: true
    });
    
    openPromise = new Promise((resolve, reject) => {
      openMainPageRequest.on('abort', () =>{ 
        logger.debug('pinging server - not ready (abort');
        openPromiseEnded = true;
        reject('abort');
      });
      openMainPageRequest.on('close', () =>{ 
        logger.debug('pinging server - not ready (close');
        openPromiseEnded = true;
        reject('close');
      });
      openMainPageRequest.on('error', (err) =>{ 
        logger.verbose('pinging server - not ready', { exception: err.name, msg: err.message });
        openPromiseEnded = true;
        reject('error');
      });
      openMainPageRequest.on('redirect', () =>{ 
        logger.verbose('pinging server - ready (redirect');
        openPromiseEnded = true;
        resolve(true);
      });
      openMainPageRequest.on('response', (resp) =>{ 
        if(resp.statusCode < 400) {
          logger.verbose('pinging server - ready', { status: resp.statusCode });
          openPromiseEnded = true;
          resolve(true);
        } else if(resp.statusCode < 500) {
          logger.warn('pinging server - ready, unexpected HTTP', undefined, { status: resp.statusCode });
          consola.warn(`starting app - unexpected HTTP status from server: status=${resp.statusCode}, text=${resp.statusMessage}`);
          openPromiseEnded = true;
          resolve(true);
        } else {
          logger.error('pinging server - error', undefined, { status: resp.statusCode, text: resp.statusMessage });
          consola.error(`cannot start app - error code from server: status=${resp.statusCode}, text=${resp.statusMessage}`);
          openPromiseEnded = true;
          reject('error');
        }
      });  
  
      openMainPageRequest.end();
    });
  } catch(err: any) {
    logger.verbose('pinging server failed', { exception: err.name, msg: err.message });
    return false;
  }

  try {
    await Promise.any([openPromise!, delay(timeoutMs)]);
    if(openPromiseEnded) {
      logger.verbose('pinging server completed - ready');
      return true;
    }

    logger.error('timeout waiting for server ready');
    consola.error('cannot start app - timeout waiting for server ready');
    return false;
  } catch(err: any) {
    logger.verbose('pinging server failed with exception', { exception: err.name, msg: err.message });
    return false; 
  }
}

let clientDataCleared = false;
export async function clearClientData(session: Electron.Session, logger: ElectronMainLogger): Promise<void> {
  try {
    if(!clientDataCleared) {
      logger.info('clearing client data');
      await session.clearCache();
      await session.clearAuthCache();
      await session.clearStorageData();
      await session.clearData();
      logger.verbose('client data was cleared');
      clientDataCleared = true;
    }
  } catch(err: any) {
    logger.warn('failed to clear client data', err);
  }
}

export function getAppLocale(app: Electron.App, logger: ElectronMainLogger): string {
  try {
    logger.debug('get locale');
    const appLocale = app.getLocale();
    logger.debug('get locale', { result: appLocale });
    return appLocale;
  } catch(err: any) {
    logger.warn('failed to get locale', err);
    return DefaultLocale;
  }
}