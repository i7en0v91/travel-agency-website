import type { Theme } from '@golobe-demo/shared';
import type { ElectronMainLogger } from './logging';
import { showExceptionDialog } from './dialogs';
import { nativeTheme } from 'electron';
import type { IRendererClientBridge } from '../interfaces';

export function updateNativeTheme(theme: Theme, bridge: IRendererClientBridge, logger: ElectronMainLogger) {
  try {
    logger.verbose('update native', theme);
    nativeTheme.themeSource = theme;
    logger.debug('native theme updated', theme);
  } catch(err: any) {
    logger.warn('exception while updating native theme', err);
    showExceptionDialog('warning', bridge, logger);
  }
}

export function setRendererTheme(theme: Theme, bridge: IRendererClientBridge, logger: ElectronMainLogger) {
  try {
    logger.verbose('set', theme);
    bridge.setTheme(theme);
    logger.debug('theme set', theme);
  } catch(err: any) {
    logger.warn('exception while setting theme', err);
    showExceptionDialog('warning', bridge, logger);
  }
}