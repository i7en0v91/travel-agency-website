import { DEV_ENV_MODE } from './constants';

export function isTestEnv (): boolean {
  return (!!import.meta.env?.VITE_VITEST && 
    (import.meta.env?.VITE_VITEST === true || import.meta.env?.VITE_VITEST === 'true')
  ) || !!process.env?.VITEST || !!process.env?.VITE_VITEST || process.env?.NODE_ENV === 'test';
}

export function isDevEnv (): boolean {
  return import.meta.env?.MODE === DEV_ENV_MODE || process.env?.NODE_ENV === DEV_ENV_MODE;
}

export function isDevOrTestEnv (): boolean {
  return isDevEnv() || isTestEnv();
}

export function isQuickStartEnv (): boolean {
  return (!!import.meta.env?.VITE_QUICKSTART && 
    (import.meta.env?.VITE_QUICKSTART === true || import.meta.env?.VITE_QUICKSTART==='true' || import.meta.env?.VITE_QUICKSTART==='1')
  ) || !!process.env?.VITE_QUICKSTART;
}

export function isPublishEnv (): boolean {
  return !!process.env.PUBLISH;
}