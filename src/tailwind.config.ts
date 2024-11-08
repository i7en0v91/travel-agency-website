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
        'minpgw': `${MinSupportedWidth}px`,
        'worldmapw': '916px', // min world map canvas element width
        'worldmaph': 'calc(916px*505/1230+5px)' // min world map element height
      },
      aspectRatio: {
        'worldmap': '1230 / 505', // world map model aspect ratio
        'traveldetails': '318 / 200'
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
        'citylinks': 'repeat(auto-fill, minmax(28.25rem, 1fr))',
        'footernav': 'repeat(auto-fill, minmax(16.875rem, 1fr))',
        'travelxs': '1fr',
        'travelsmd': 'minmax(250px, 2fr) 3fr',
        'travelmd': '1fr 1fr',
        'travelxl': '8fr 7fr 7fr',
        'propertygrid': '1fr auto'
      },
      gridTemplateRows: {
        'travelxs': 'repeat(5, auto)',
        'travelsmd': 'repeat(4, min-content)',
        'travelmd': 'repeat(3, auto)',
        'travelxl': 'repeat(2, auto)'
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
      '2xl': `${DeviceSizeBreakpointsMap.get(DeviceSizeEnum.XXL)}px`,
      'travelsmd': '760px'
    }
  },
  safelist: [
    'duration-1000', 
    'motion-reduce:duration-0', 
    'motion-reduce:transition-none'
  ]
};