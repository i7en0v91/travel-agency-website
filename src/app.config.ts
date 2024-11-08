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

const inputUi: UI['input'] = {
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
      outline: 'bg-white dark:bg-gray-900 ring-1 focus-visible:ring-3 ring-gray-500 dark:ring-gray-400 focus-visible:ring-gray-500 dark:focus-visible:ring-gray-400',
    },
    gray: {
      outline: 'text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900 ring-1 focus-visible:ring-3 ring-gray-500 dark:ring-gray-400 focus-visible:ring-gray-500 dark:focus-visible:ring-gray-400'
    }
  }
};

export default defineAppConfig({
  ui: <UI>{
    strategy: 'merge',
    primary: 'mintgreen',
    gray: 'cool',
    container: {
      base: 'mx-auto',
      padding: '!p-0 my-0 mx-auto',
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
    tabs: {
      list: {
        background: 'bg-transparent dark:bg-transparent',
        height: 'h-16',
        padding: '!pb-4 !pt-3',
        marker: {
          wrapper: '!top-[unset] !bottom-[1px] !h-[2px]',
          base: 'w-full !h-[2px]',
          background: 'bg-primary-500 dark:bg-primary-400',
          rounded: 'rounded-none',
          shadow: 'shadow-none'
        },
        tab: {
          size: 'text-sm sm:text-base',
          font: 'font-semibold',
          active: 'text-gray-900 dark:text-white',
          inactive: 'text-gray-500 dark:text-gray-400',
          padding: 'px-2 py-4',
          icon: 'w-4 h-4 sm:w-6 sm:h-6'
        } 
      }
    },
    button: {
      base: 'text-sm sm:text-base',
      rounded: 'rounded'
    },
    formGroup: {
      label: {
        base: 'text-gray-600 dark:text-gray-300 font-normal'
      },
      size: {
        '2xs': 'text-xs',
        xs: 'text-xs',
        sm: 'text-sm sm:text-base',
        md: 'text-sm sm:text-base',
        lg: 'text-sm sm:text-base',
        xl: 'text-base',
      }
    },
    input: inputUi,
    inputMenu: {
      //ring: 'ring-gray-500 dark:ring-gray-400 shadow-none',
      option: {
        color: 'dark:text-white',
        active: 'bg-primary-200 dark:bg-gray-700',
      }
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
    select: { 
      ...inputUi, 
      base: '!cursor-pointer'
    },
    selectMenu: {
      //ring: 'ring-gray-500 dark:ring-gray-400 shadow-none',
      option: {
        color: 'dark:text-white',
        active: 'bg-primary-200 dark:bg-gray-700',
      }
    },
    popover: {
      //ring: 'ring-1 ring-gray-400 dark:ring-gray-400 shadow-none', 
      //background: 'bg-white dark:!bg-gray-800'
    },
    divider: {
      label: 'text-sm sm:text-base font-normal'
    }
  }
});
