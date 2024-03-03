import { type LogLevel, type Locale, SearchOffersListConstants } from './shared/constants';
import { type ILogSuppressionRule } from './shared/applogger';
import { isDevOrTestEnv, isQuickStartEnv } from './shared/common';
import { type AppExceptionCode } from './shared/exceptions';

// url used for showing users browser-navigateable links to the website
const SiteUrl = process.env.PUBLISH ? 'https://golobe.demo' : 'http://localhost:3000';

export interface IAppConfig {
  logging: {
    common: {
      name: string,
      level: LogLevel,
      redact: string[],
      maskedNumCharsVisible: number,
      appExceptionLogLevels: { appExceptionCode: AppExceptionCode, logLevel: LogLevel }[]
    },
    server: {
      destination: string,
      maxFileSize: string,
      region: string,
      timeZone: string
    },
    client: {
      path: string
    },
    suppress: {
      vue : ILogSuppressionRule[]
    }
  },
  userNotifications: {
    maxItems: number,
    timeoutMs: number,
    filterDuplicates: boolean
  },
  userSession: {
    expirationDays: number
  },
  images: {
    sharpness: number,
    scaleStep: number,
    cacheFsDir: string
  },
  maxDbConcurrentUpdateAttemps: number,
  userPasswordPolicy: {
    minLength: number,
    uppercase: boolean,
    lowercase: boolean,
    number: boolean,
    specialChar: boolean
  },
  email?: {
    host: string,
    port: number,
    secure: boolean,
    from: string,
    appName: string,
    siteUrl: string
  } | undefined,
  maxUserEmailsCount: number,
  verificationTokenExpirationHours: number,
  autoInputDatesRangeDays: number,
  etcDirName: string,
  siteUrl: string,
  contactEmail: string,
  reCaptcha: {
    enabled: boolean,
    language: Locale,
    size: 'invisible' | 'normal'
  },
  maxUploadImageSizeMb: number,
  suggestionPopupDelayMs: number,
  sliderAutoplayPeriodMs: number,
  worldMap: {
    animationDurationMs: number,
    pointHighlightAnimationMs: number
  },
  fallIntoTravel: {
    autoplayPeriodMs: number,
    worldMapFocusedCityDelayMs: number,
    retryTimeoutMs: number
  },
  clientCache: {
    expirationsSeconds: {
      default: number
    }
  },
  searchOffers: {
    listPageSize: number,
    flexibleDatesRangeDays: number
  },
  enableHtmlTabIndex: boolean
}

const Config : IAppConfig = {
  logging: {
    common: {
      name: 'golobe',
      /** error, warn, info, verbose, debug */
      level: isDevOrTestEnv() ? 'debug' : 'warn',
      /** fields in JSON data logged which are masked for security or large payload footprint reasons */
      redact: [
        'req.headers.cookie',
        'req.headers.authorization',
        'password',
        'email',
        'firstName',
        'lastName',
        'emailAddress',
        'address.*',
        'details.user.*',
        'captchaToken',
        'accessToken',
        'refreshToken'
      ],
      maskedNumCharsVisible: 1, // number of first and last characters visible in masked string
      appExceptionLogLevels: [ // custom remapping of AppException's default WARN logging level
        { appExceptionCode: 'UNAUTHORIZED', logLevel: 'info' }
      ]
    },
    server: {
      /** log (rolling) file path */
      destination: './logs/golobe-%DATE%.log',
      maxFileSize: '1g',
      /** time zone for log record timestamps */
      region: 'en-US',
      timeZone: 'Etc/UTC'
    },
    client: {
      /** server endpoint for accepting log records sent from browser */
      path: '/api/log'
    },
    suppress: {
      vue: [
        /** suppressing passing inherited properties values */
        { messageFitler: /Extraneous non-props attributes .* were passed to component but could not be automatically inherited/g, componentNameFilter: /.*/ },
        /** suppressing VPopper hydration mistmatches - non critical, everything works */
        { messageFitler: /.*[h|H]ydration.*/g, componentNameFilter: /.*[p|P]opper.*/g },
        /** suppressing NuxtImg hydration mistmatches - non critical, everything works */
        { messageFitler: /.*[h|H]ydration.*/g, componentNameFilter: /.*NuxtImg.*/g },
        /** suppressing strange travel details visibility style hydration mistmatches - non critical, everything works */
        { messageFitler: /.*[h|H]ydration.*/g, componentNameFilter: /.*(TravelDetailsImage|TravelDetailsTexting).*/g }
      ]
    }
  },
  userNotifications: {
    maxItems: 5, // maximum number of simultaneously displayed notifications
    timeoutMs: 6000, // duration on one notification in millisenconds
    filterDuplicates: true // don't show notification if there is already another notification with the same text displayed
  },
  userSession: {
    expirationDays: 7 // expiration time for user session data
  },
  images: {
    /**
     * affects scaling degree of images before serving them to client.
     * The higher value gives more qualitative images, while lower values make them more blurry
     * */
    sharpness: 0.7,
    /** image scale degree step */
    scaleStep: 0.125,
    /** filesystem directory with cached versions of scaled images */
    cacheFsDir: './.img.cache/'
  },
  /** number of retries of db operations against entities in case concurrent update collisionis occur */
  maxDbConcurrentUpdateAttemps: 3,
  /** security requirements for user password */
  userPasswordPolicy: {
    minLength: 8, // minimum password length
    uppercase: true, // must contain one uppercase letter
    lowercase: true, // must contain one lowercase letter
    number: true, // must contain one number
    specialChar: true // must contain one special character
  },
  email: process.env.PUBLISH
    ? {
        host: 'localhost', // SMTP server host
        port: 587, // SMTP server port
        secure: true, // require SSL connection with SMTP server
        from: 'noreply@golobe.demo', // email address from which to send mails
        appName: 'Golobe', // website app name to be used in email templates
        siteUrl: SiteUrl
      }
    // eslint-disable-next-line multiline-ternary
    : ((!process.env.VITEST && !isQuickStartEnv()) ? {
        host: 'localhost',
        port: 1025,
        secure: false,
        from: 'localhost',
        appName: 'Golobe',
        siteUrl: 'http://localhost' // KB: dev Nuxt instance is running on :3000 port by default, but using 'http://localhost:3000' directly may result into e-mail rejects by SMTP server as spam
      } : undefined),
  maxUserEmailsCount: 5, // maximum number of specified emails per single user account
  verificationTokenExpirationHours: 24,
  autoInputDatesRangeDays: 7, // amount of days between start and end date which system uses to automatically calculate and set value in date picker before any user interaction (e.g. check-in and check-out dates)
  etcDirName: 'etc', // name of directory with configuration, support files e.t.c
  siteUrl: SiteUrl,
  contactEmail: 'support@golobe.demo', // contact email for website users
  reCaptcha: {
    enabled: !isQuickStartEnv(),
    language: 'en', // default language
    size: 'invisible' // also may be normal
  },
  maxUploadImageSizeMb: 2, // maximum allowed image size to upload
  suggestionPopupDelayMs: 1000, // delay in ms for suggestion popup to show after last user keypress
  sliderAutoplayPeriodMs: 5000, // default delay in ms for swiper's slide player
  worldMap: {
    animationDurationMs: 3000, // number of millisenconds for map appearing animation to complete
    pointHighlightAnimationMs: 400 // highlight duration in millisenconds for map point when it appears on the map
  },
  fallIntoTravel: { // options for fall into travel details block
    autoplayPeriodMs: 10000, // delay in ms for slide player
    worldMapFocusedCityDelayMs: 60000, // delay in ms for player to pause on city picked on world map
    retryTimeoutMs: 3000 // delay in ms to retry failed fetch request for travel details data
  },
  clientCache: { // client-side entity cache-related settings
    expirationsSeconds: { // cache item expiration in seconds, must not exceed "maxage" cache HTTP-header across involved entity types
      default: 1800 // default expiration for any entity type
    }
  },
  searchOffers: { // settings related to flight & stay offers search pages with filter & pagination
    listPageSize: 20, // pagination - number of offer items fetched from server in one request
    flexibleDatesRangeDays: SearchOffersListConstants.FlexibleDatesRangeDays // allowed depart/return date adjustment in days for searched offers when "My Dates Are Flexible" flag is set
  },
  enableHtmlTabIndex: true // if enabled, system will automatically compute and fill tabIndex property for all interactive html elements (including dropdowns, menus e.t.c). If disabled, tabIndex="-1" will be used
};

export default Config;
