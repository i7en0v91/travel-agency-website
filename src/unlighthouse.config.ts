import { defineConfig } from '@unlighthouse/core';
import { CookieNames, PagePath } from './shared/constants';

const excludedRoutesCommon = [
  '/ru',
  '/ru/*',
  '/fr',
  '/fr/*'
];

export default defineConfig({
  site: 'http://localhost:3000',
  chrome: {
    useSystem: false
  },
  urls: [
    `/${PagePath.StayDetails}/21` // scan only one page
  ],
  scanner: {
    samples: 1,
    // use desktop to scan
    device: 'desktop',
    // enable the throttling mode
    throttle: true,
    ...(process.env.UNLIGHTHOUSE_MODE === 'authenticated'
      ? {
          exclude: [...excludedRoutesCommon,
            `/${PagePath.ForgotPasswordComplete}`,
            `/${PagePath.ForgotPasswordSet}`,
            `/${PagePath.ForgotPasswordVerify}`,
            `/${PagePath.ForgotPassword}`,
            `/${PagePath.Login}`,
            `/${PagePath.SignupComplete}`,
            `/${PagePath.SignupVerify}`,
            `/${PagePath.Signup}`
          ]
        }
      : {
        /*
          exclude: [...excludedRoutesCommon,
            `/${PagePath.EmailVerifyComplete}`,
            `/${PagePath.Account}`
          ]
          */
          include: [
            `/${PagePath.StayDetails}/21` // scan only one page
          ]
        })
  },
  cookies: process.env.UNLIGHTHOUSE_MODE === 'authenticated'
    ? [
        {
          name: 'next-auth.csrf-token',
          value: '9e36dd94c2190b50cc2f67f747d8ed01da81bcb9c1958f8efdbc8d4fca2a17e7%7Ce552a5c0a67ddf429a93369a98211766ea2c81c38cde7fc4ac014565554f1906',
          domain: 'localhost',
          path: '/',
          httpOnly: false as any,
          secure: false as any,
          sameSite: 'Lax'
        },
        {
          name: 'next-auth.callback-url',
          value: 'http%3A%2F%2Flocalhost%3A3000%2Faccount',
          domain: 'localhost',
          path: '/',
          httpOnly: false as any,
          secure: false as any,
          sameSite: 'Lax'
        },
        {
          name: 'next-auth.session-token',
          value: 'eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..jX9HgaTcJcv6-FaH.8zbNJJt8jjKYmgfBRbeeKxsv0dJ7LVajAXDQnGugfoiUhRucdJXRwBSTxIDBxLtecwYGZ_R-JKR3lOK-E5ep0sIOVo0Bm2BwC6kU96S6CaaOxVjXF5GaZBW0JLS4JXpeug._TmpPVxVExvMp9yIYZya3A',
          domain: 'localhost',
          path: '/',
          httpOnly: false,
          secure: false,
          sameSite: 'Lax'
        },
        {
          name: CookieNames.I18nLocale,
          value: 'en',
          domain: 'localhost',
          path: '/',
          httpOnly: false,
          secure: false,
          sameSite: 'Lax'
        }
      ]
    : []
});
