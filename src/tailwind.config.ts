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
      zIndex: {
        'pgcontent': '10',
        'navbar': '60',
        'modalform': '70',
        'cookies': '100'
      },
      spacing: {
        'maxpgw': `${MaxSupportedWidth}px`,
        'minpgw': `${MinSupportedWidth}px`,
        'worldmapw': '916px', // min world map canvas element width 
        'worldmaph': 'calc(916px*505/1230+5px)', // min world map element height
        'traveldtlsh': '41rem', // maximum size of travel details texting block for large devices
        // rems - approximate estimation of footer's height upper bound
        'mincontvhxs': 'calc(max(0px, 100vh - 88rem))', 
        'mincontvhlg': 'calc(max(0px, 100vh - 66rem))',
        'mincontvhxxl': 'calc(max(0px, 100vh - 46rem))',
      },
      aspectRatio: {
        'worldmap': '1230 / 505', // world map model aspect ratio
        'traveldetails': '318 / 200',
        'barcode': '248 / 81'
      },
      fontFamily: {
        /* KB: Preflight sets the 'sans' font family on the html element by default.
         Ignoring serif & monospace as they are not used in page stylings */
        'sans': ['"Montserrat"', ...defaultTheme.fontFamily.sans],
        'ticket': ['"Spectral SC"', ...defaultTheme.fontFamily.serif]
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
        'propertygrid': '1fr auto',
        'offerslistxs': '1fr',
        'offerslistmd': 'minmax(290px, 1fr) 2fr',
        'offerslistxl': 'minmax(290px, 1fr) 3fr',
        'bookingpricingxs': '1fr',
        'bookingpricingsm': 'auto 1fr',
        'searchflights': 'auto 1fr',
        'searchflightswide': '160px 1fr',
        'searchflightsdates': 'repeat(4, max-content)',
        'searchstaysportrait': '1fr auto',
        'searchstayslandscape': '320px 1fr auto',
        'paymentcards': 'repeat(auto-fill, minmax(24rem, max-content))',
        'offersummary': '1fr auto',
        'stayphotosxs': '1fr',
        'stayphotosmd': 'repeat(2, 1fr)',
        'stayphotosxl': '2fr 1fr 1fr',
        'stayroomsxs': 'auto 1fr',
        'stayroomssm': 'auto 1fr max-content',
        'stayamenitiessm': 'repeat(auto-fill, minmax(20rem, 1fr))',
        'airplanephotosxs': 'repeat(auto-fill, minmax(90px, 1fr))',
        'airplanephotossm': 'repeat(auto-fill, minmax(120px, 1fr))',
        'flightofferfeatures': 'repeat(auto-fill, minmax(1.5rem, 1fr))',
        'offerbookingxs': '1fr',
        'offerbookinglg': '3fr 2fr',
        'ticketxs': '1fr',
        'ticketsm': 'auto 1fr',
        'ticketxl': 'auto 3fr minmax(250px, 2fr)',
        'ticketdetails': 'repeat(auto-fill, minmax(11rem, 1fr))',
        'userticketxs': '1fr',
        'userticketlg': '1fr auto',
        'userticketentriesxs': 'repeat(3, min-content) 1fr',
        'userticketentries2xl': 'repeat(4, min-content) 1fr',
      },
      gridTemplateRows: {
        'travelxs': 'repeat(5, auto)',
        'travelsmd': 'repeat(4, min-content)',
        'travelmd': 'repeat(3, auto)',
        'travelxl': 'repeat(2, auto)',
        'offerslistxs': 'repeat(3, auto)',
        'offerslistmd': '1fr auto',
        'bookingpricingxs': 'repeat(3, auto)',
        'bookingpricingsm': 'repeat(2, auto)',
        'searchflights': 'repeat(2, auto)',
        'searchflightswide': 'auto 1fr',
        'searchstaysportrait': 'repeat(4, auto)',
        'searchstayslandscape': 'auto 1fr auto',
        'offersummaryxs': 'repeat(3, auto)',
        'offersummarysm': 'repeat(2, auto)',
        'stayphotosxs': 'repeat(5, auto)',
        'stayphotosmd': 'repeat(3, auto)',
        'stayphotosxl': 'repeat(2, auto)',
        'airplanephotosxs': 'repeat(2, auto)',
        'airplanephotosmd': 'auto',
        'offerbookingxs': 'repeat(3, auto)',
        'offerbookinglg': 'repeat(2, auto)',
        'ticketxs': 'repeat(5, auto)',
        'ticketsm': 'auto 1fr auto auto',
        'ticketxl': 'auto 1fr auto',
        'userticketxs': 'repeat(2, auto)',
        'userticketlg': 'auto',
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