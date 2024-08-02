import { CookiePolicyConsent, CookieI18nLocale } from './../../shared/constants';
import { AppPage, SystemPage, getPagePath } from './../../shared/page-query-params';

const excludedRoutesCommon = [
  '/ru',
  '/ru/*',
  '/fr',
  '/fr/*',
  `/${getPagePath(AppPage.FlightDetails)}/*`,
  `/${getPagePath(AppPage.StayDetails)}/*`,
  `/${getPagePath(AppPage.BookFlight)}/*`,
  `/${getPagePath(AppPage.BookStay)}/*`,
  `/${getPagePath(AppPage.BookingDetails)}/*`,
  `/${getPagePath(SystemPage.Drafts)}`
];

// KB: to obtain route IDs - run quickstart mode - it will spawn a DB - navigate to respective pages & copy id from browser's navbar
const AuthenticatedModeUrls = [
  `/${getPagePath(AppPage.Account)}`,
  `/${getPagePath(AppPage.Favourites)}`,
  `/${getPagePath(AppPage.FlightDetails)}/11395gjigf9dbe9fia976`,
  `/${getPagePath(AppPage.BookFlight)}/11395gjigf9dbe9fia976`,
  `/${getPagePath(AppPage.StayDetails)}/45j92f2i2i3b9jjgcch5`,
  `/${getPagePath(AppPage.BookStay)}/45j92f2i2i3b9jjgcch5`,
  `/${getPagePath(AppPage.BookingDetails)}/12e89bh64e5h133gaef0h`
];
// KB: to obtain auth cookies values - run quickstart mode - perform login with test oauth provider & copy them from browser's dev tool
const AuthenticatedModeCookies = [
  {
    name: 'next-auth.csrf-token',
    value: '8d80b9d14be0bee8965e9c4948b15c5c2eed6da72b3e644d7a980f046a946fc6%7C65113622667ea543539d780be7bf559c279d6a2b51b11a4a47cca7371e8033f6',
    domain: 'localhost',
    path: '/',
    httpOnly: false as any,
    secure: false as any,
    sameSite: 'Lax'
  },
  {
    name: 'next-auth.callback-url',
    value: 'http%3A%2F%2Flocalhost%3A3000%2F',
    domain: 'localhost',
    path: '/',
    httpOnly: false as any,
    secure: false as any,
    sameSite: 'Lax'
  },
  {
    name: 'next-auth.session-token',
    value: 'eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..g-eRTo74472HzaiT.6PRLypB6ALiPQGTDkQJ23AuWGAsPs9DijSD8MA2M22XUT4Li6zdnxnxD_REqxtCtkE8WDLB8m39BcNJPYUCW1Vqe7t1qOyaaTdxZPjeFgIFkCMzKM1oWIKSumVEuCth9-sUMYQSzulczlwXsK1JEVYI1O2H6PxvRmMDbi_I2gn3pdk-u5eMo2fU.thJ7ug1pIcfRgaHgTg_u9Q',
    domain: 'localhost',
    path: '/',
    httpOnly: false,
    secure: false,
    sameSite: 'Lax'
  },
  {
    name: CookieI18nLocale,
    value: 'en',
    domain: 'localhost',
    path: '/',
    httpOnly: false,
    secure: false,
    sameSite: 'Lax'
  },
  {
    name: CookiePolicyConsent,
    value: 'consent-given',
    domain: 'localhost',
    path: '/',
    httpOnly: false,
    secure: false,
    sameSite: 'Lax'
  }
];

export default {
  site: 'http://localhost:3000',
  chrome: {
    useSystem: false
  },
  urls: process.env.UNLIGHTHOUSE_MODE === 'authenticated' ? AuthenticatedModeUrls : undefined,
  scanner: {
    samples: 1,
    // use desktop to scan
    device: 'desktop',
    // enable the throttling mode
    throttle: true,
    ...(process.env.UNLIGHTHOUSE_MODE === 'authenticated'
      ? {
          include: AuthenticatedModeUrls // scan only this URLs
        }
      : {
          exclude: [...excludedRoutesCommon,
            `/${getPagePath(AppPage.Account)}`,
            `/${getPagePath(AppPage.Favourites)}`
          ]
        })
  },
  cookies: process.env.UNLIGHTHOUSE_MODE === 'authenticated' ? AuthenticatedModeCookies : []
};
