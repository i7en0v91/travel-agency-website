import { RuPluralizationRule } from './shared/i18n';

export default defineI18nConfig(() => ({
  legacy: false,
  locale: 'en',
  pluralRules: {
    ru: RuPluralizationRule
  },
  datetimeFormats: {
    en: {
      short: {
        year: 'numeric', month: 'short', day: 'numeric'
      }
    },
    ru: {
      short: {
        year: 'numeric', month: 'short', day: 'numeric'
      }
    },
    fr: {
      short: {
        year: 'numeric', month: 'short', day: 'numeric'
      }
    }
  }
}));
