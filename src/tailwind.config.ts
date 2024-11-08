import type { Config } from 'tailwindcss';
import defaultTheme from 'tailwindcss/defaultTheme';
import plugin from 'tailwindcss/plugin';
import { MinSupportedWidth, MaxSupportedWidth, DeviceSizeBreakpointsMap, DeviceSizeEnum } from './helpers/constants';

export default <Partial<Config>>{
  darkMode: ['selector', '[data-theme="dark"]'],
  plugins: [
    plugin(function({ addVariant }) {
      addVariant('landing', ':root *:has(.golobe-landing-page) &');
    })
  ],
  theme: {
    extend: {
      spacing: {
        'maxpgw': `${MaxSupportedWidth}px`,
        'minpgw': `${MinSupportedWidth}px`
      },
      fontFamily: {
        /* KB: Preflight sets the 'sans' font family on the html element by default.
         Ignoring serif & monospace as they are not used in page stylings */
        'sans': ['"Montserrat"', ...defaultTheme.fontFamily.sans]
      },
      colors: {
        mintgreen: {
          50: '#effaf6',
          100: '#d9f2e6',
          200: '#b5e5d2',
          300: '#8dd3bb',
          400: '#52b596',
          500: '#30997c',
          600: '#217a64',
          700: '#1a6251',
          800: '#174e42',
          900: '#144037',
          950: '#0a241f'
        }
      },
      gridTemplateColumns: {
        'cityxs': 'repeat(auto-fill, minmax(21.25rem, 1fr))',
        'citymd': 'repeat(auto-fill, minmax(23.125rem, 1fr))',
        'footernav': 'repeat(auto-fill, minmax(16.875rem, 1fr))'
      },
      borderRadius: {
        '4xl': '2rem'
      }
    },
    screens: {
      'xs': `${MinSupportedWidth}px`, // 'xs' should not be referenced anywhere in vue templates due to mobile-first approach
      'sm': `${DeviceSizeBreakpointsMap.get(DeviceSizeEnum.SM)}px`, 
      'md': `${DeviceSizeBreakpointsMap.get(DeviceSizeEnum.MD)}px`,
      'lg': `${DeviceSizeBreakpointsMap.get(DeviceSizeEnum.LG)}px`,
      'xl': `${DeviceSizeBreakpointsMap.get(DeviceSizeEnum.XL)}px`,
      '2xl': `${DeviceSizeBreakpointsMap.get(DeviceSizeEnum.XXL)}px`
    }
  }
};