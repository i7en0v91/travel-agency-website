import { AppName } from '@golobe-demo/shared';
import { type BrowserWindow, dialog, Notification, type MessageBoxSyncOptions, type MessageBoxOptions } from 'electron';
import type { ElectronMainLogger } from './logging';
import type { IRendererClientBridge } from './../interfaces';
import { consola } from 'consola';

/**
 * Displays native message box with default button ("OK")
 * @param type Indicates type of notification. 
 * If fatal - then modal error box is displayed with subsequent process termination.
 * Otherwise a non-blocking window after closing which user can continue working with app
 */
export async function showNotification(type: 'info' | 'warning' | 'error' | 'fatal', msg: string, title: string | undefined, logger: ElectronMainLogger, win?: BrowserWindow): Promise<void> {
  if(type === 'fatal' || type === 'error') {   
    try {
      if(type === 'fatal') {
        consola.error(`FATAL error occured, process WILL terminate, msg=${msg}`);
      }
      logger.verbose('showing error or fatal notification', { type, win: !!win });

      const msgBoxOptions: MessageBoxSyncOptions = {
        message: msg,
        type: 'error',
        title
      };
      if(win) {
        dialog.showMessageBoxSync(win, msgBoxOptions);
      } else {
        dialog.showMessageBoxSync(msgBoxOptions);
      }
    } finally {
      if(type === 'fatal') {
        process.exit(1);
      }
    }
  } else {
    try {
      logger.verbose('showing notification', { type, win: !!win });
      if(type === 'warning' || !Notification.isSupported()) {
        const msgBoxOptions: MessageBoxSyncOptions = {
          message: msg,
          title,
          type
        };
        if(win) {
          dialog.showMessageBox(win, msgBoxOptions);
        } else {
          dialog.showMessageBox(msgBoxOptions);
        }
      } else {
        new Notification({ title: AppName, body: msg }).show();
      }
    } catch(err: any) {
      logger.warn('exception occured while showing notification', err, { type, win: !!win });
    }
  }
}

/**
 * Shows default exception dialog with localized message and title
 */
export function showExceptionDialog(type: 'warning' | 'error', bridge: IRendererClientBridge, logger: ElectronMainLogger) {
  try {
    bridge.showExceptionDialog(type);
  } catch(err: any) {
    consola.error('failed to show exception dialog');
    logger.warn('', err, type);
  }
}

/**
 * Prompts user with native confirm box dialog and returns result (selected button)
 */
export async function showConfirmBox<TButton>(msg: string, title: string, buttons: TButton[], logger: ElectronMainLogger, win?: BrowserWindow): Promise<TButton | undefined> {
  logger.verbose('showing confirm box', { msg, title, buttons });
  const CancelId = -1;
  const msgBoxOptions: MessageBoxOptions = {
    message: msg,
    type: 'question',
    title,
    buttons: buttons.map(b => (b as any).toString()),
    cancelId: CancelId
  };
  let resultIndex: number = CancelId;
  if(win) {
    resultIndex = (await dialog.showMessageBox(win, msgBoxOptions)).response;
  } else {
    resultIndex = (await dialog.showMessageBox(msgBoxOptions)).response;
  }
  let result: TButton | undefined;
  if(resultIndex > CancelId && resultIndex < buttons.length) {
    result = buttons[resultIndex];
  }
  logger.verbose('show confirm box', { result: result ?? 'canceled', msg, title, buttons });
  return result;
}