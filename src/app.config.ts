// KB: temporary - not needed, but helps with IDE IntelliSense 
import type * as config from './node_modules/@nuxt/ui/dist/runtime/ui.config/index.js';
import type  { Strategy, DeepPartial } from './node_modules/@nuxt/ui/dist/runtime/types/index.js';

type UI = {
  primary?: string;
  gray?: string;
  colors?: string[];
  strategy?: Strategy;
  [key: string]: any;
} & DeepPartial<typeof config, string>;

export default defineAppConfig({
  ui: <UI>{
    strategy: 'merge',
    primary: 'mintgreen',
    gray: 'cool',
    container: {
      base: 'mx-auto',
      padding: 'px-4 sm:px-6 lg:px-8',
      constrained: 'max-w-maxpgw'
    },
    notification: {
      title: 'text-sm sm:text-base text-gray-500 dark:text-gray-300',
      description: 'text-sm sm:text-base text-gray-500 dark:text-gray-300',
      icon: {
        color: 'text-{color}-500 dark:text-{color}-300',
      }
    },
    horizontalNavigation: {
      base: 'sm:text-base font-semibold focus-visible:ring-primary-500 dark:focus-visible:ring-primary-400',
      label: 'sm:text-base',
      icon: {
        base: 'sm:w-6 sm:h-6',
        active: 'text-gray-900',
        inactive: 'text-gray-900'
      },
      inactive: 'text-gray-900'
    },
    verticalNavigation: {
      base: 'sm:text-base font-semibold focus-visible:before:ring-primary-500 dark:focus-visible:before:ring-primary-400',
      ring: 'focus-visible:ring-primary-500 dark:focus-visible:ring-primary-400',
      label: 'sm:text-base',
      icon: {
        base: 'sm:w-6 sm:h-6',
        active: 'text-gray-900',
        inactive: 'text-gray-900'
      },
      inactive: 'text-gray-900'
    },
    button: {
      base: 'text-sm sm:text-base',
      rounded: 'rounded'
    },
    formGroup: {
      label: {
        base: 'font-normal'
      }
    },
    input: {
      rounded: 'rounded',
      size: {
        '2xs': 'text-xs',
        xs: 'text-xs',
        sm: 'text-sm sm:text-base',
        md: 'text-sm sm:text-base',
        lg: 'text-sm sm:text-base',
        xl: 'text-base',
      },
      padding: {
        '2xs': 'px-2 py-2',
        xs: 'px-3.5 py-3.5',
        sm: 'px-3.5 py-3.5',
        md: 'px-4 py-4',
        lg: 'px-4.5 py-4.5',
        xl: 'px-4.5 py-4.5',
      },
      color: {
        white: {
          outline: 'ring-2 focus:ring-3',
        },
        gray: {
          outline: 'ring-2 focus:ring-3',
        },
      },
    },
    dropdown: {
      divide: 'divide-gray-900 divide-dashed px-2',
      padding: 'p-2',
      item: {
        size: 'text-sm sm:text-base',
        inactive: 'text-gray-900',
        icon: {
          active: 'text-gray-900',
          inactive: 'text-gray-900'
        }
      }
    },
    divider: {
      label: 'text-sm sm:text-base font-normal'
    }
  }
});
