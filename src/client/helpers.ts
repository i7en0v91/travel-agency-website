import { type Theme } from '../shared/constants';

export function getCurrentThemeSettings () {
  return (document.documentElement.dataset.theme as Theme);
};

export function setCurrentThemeSettings (value: Theme) {
  document.documentElement.dataset.theme = value;
};
