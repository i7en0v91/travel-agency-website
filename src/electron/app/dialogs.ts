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
        consola.error(`FATAL error occured, msg=${msg}, process WILL terminate`);
      }
      logger.verbose(`(Dialogs) showing notification, type=${type}, msg=[${msg}], win=${!!win}`);

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
      logger.verbose(`(Dialogs) showing notification, type=${type}, msg=[${msg}], win=${!!win}`);
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
      logger.warn(`(Dialogs) exception occured while showing notification, type=${type}, msg=[${msg}], win=${!!win}`, err);
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
    const msg = 'failed to show exception dialog';
    consola.error(msg);
    logger.warn(`(Dialogs) ${msg}, type=${type}`, err);
  }
}

/**
 * Prompts user with native confirm box dialog and returns result (selected button)
 */
export async function showConfirmBox<TButton>(msg: string, title: string, buttons: TButton[], logger: ElectronMainLogger, win?: BrowserWindow): Promise<TButton | undefined> {
  logger.verbose(`(Dialogs) showing confirm box, msg=[${msg}], title=[${title}], buttons=[${buttons.join(', ')}]`);
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
  logger.verbose(`(Dialogs) show confirm box result=${result ?? 'canceled'}, msg=[${msg}], title=[${title}], buttons=[${buttons.join(', ')}]`);
  return result;
}