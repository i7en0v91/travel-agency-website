import type { Theme } from '@golobe-demo/shared';
import type { ElectronMainLogger } from './logging';
import { showExceptionDialog } from './dialogs';
import { nativeTheme } from 'electron';
import type { IRendererClientBridge } from '../interfaces';

export function updateNativeTheme(theme: Theme, bridge: IRendererClientBridge, logger: ElectronMainLogger) {
  try {
    logger.verbose(`(Theme) update native theme=${theme}`);
    nativeTheme.themeSource = theme;
    logger.debug(`(Theme) native theme updated, theme=${theme}`);
  } catch(err: any) {
    logger.warn('(Theme) exception while updating native theme', err);
    showExceptionDialog('warning', bridge, logger);
  }
}

export function setRendererTheme(theme: Theme, bridge: IRendererClientBridge, logger: ElectronMainLogger) {
  try {
    logger.verbose(`(Theme) set theme=${theme}`);
    bridge.setTheme(theme);
    logger.debug(`(Theme) theme set, theme=${theme}`);
  } catch(err: any) {
    logger.warn('(Theme) exception while setting theme', err);
    showExceptionDialog('warning', bridge, logger);
  }
}