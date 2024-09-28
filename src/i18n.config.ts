import { RuPluralizationRule } from '@golobe-demo/shared';

const currencyOptions = {
  style: 'currency' as const,
  currency: 'USD' as const,
  maximumFractionDigits: 0,
  signDisplay: 'never' as const,
  currencyDisplay: 'symbol' as const
};

export default defineI18nConfig(() => ({
  legacy: false,
  locale: 'en',
  pluralRules: {
    ru: RuPluralizationRule
  },
  numberFormats: {
    en: {
      currency: currencyOptions
    },
    ru: {
      currency: currencyOptions
    },
    fr: {
      currency: currencyOptions
    }
  },
  datetimeFormats: {
    en: {
      numeric: {
        year: 'numeric', month: 'numeric', day: 'numeric'
      },
      short: {
        year: 'numeric', month: 'short', day: 'numeric'
      },
      day: {
        month: 'short', day: 'numeric', weekday: 'short'
      },
      daytime: {
        year: undefined, month: undefined, day: undefined, hour12: true, hour: '2-digit', minute: '2-digit'
      }
    },
    ru: {
      numeric: {
        year: 'numeric', month: 'numeric', day: 'numeric'
      },
      short: {
        year: 'numeric', month: 'short', day: 'numeric'
      },
      day: {
        month: 'short', day: 'numeric', weekday: 'short'
      },
      daytime: {
        year: undefined, month: undefined, day: undefined, hour12: true, hour: '2-digit', minute: '2-digit'
      }
    },
    fr: {
      numeric: {
        year: 'numeric', month: 'numeric', day: 'numeric'
      },
      short: {
        year: 'numeric', month: 'short', day: 'numeric'
      },
      day: {
        month: 'short', day: 'numeric', weekday: 'short'
      },
      daytime: {
        year: undefined, month: undefined, day: undefined, hour12: true, hour: '2-digit', minute: '2-digit'
      }
    }
  }
}));
