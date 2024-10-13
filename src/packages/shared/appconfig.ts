import { FlexibleDatesRangeDays, RestApiLogging } from './constants';
import { isDevEnv, isTestEnv, isPublishEnv, isQuickStartEnv } from './utils';
import type { LogLevel, Locale, I18nResName } from './types';
import { type ILogSuppressionRule, type ILogVueSuppressionRule } from './applogger';
import { type AppExceptionCode } from './exceptions';

export const HostUrl = isPublishEnv() ? 'golobe.demo' : 'localhost:3000';
// url used for showing users browser-navigateable links to the website
export const SiteUrl = isPublishEnv() ? `https://${HostUrl}` : `http://${HostUrl}`;

const HtmlPageCachingEnabled = isTestEnv() || isQuickStartEnv() || isPublishEnv();
const CachingIntervalSeconds = HtmlPageCachingEnabled ? 24 * 60 * 60 : 0;
export const SQLiteDbName = 'dbase.db';

export interface IAcsysUserOptions {
  email: string,
  name: string,
  password: string,
  autoFillCredsOnLoginPage: boolean
}
type StorageDriverType = 'local';

export interface IAcsysOptions {
  srcDir: string,
  execDir: string,
  filesDir: string,
  dbName: string,
  draftsEntityPrefix: string,
  storageDriver: StorageDriverType,
  port: number,
  startupTimeoutMs: number,
  projectName: string,
  users: {
    admin: IAcsysUserOptions,
    standard: IAcsysUserOptions,
    viewer: IAcsysUserOptions
  }
}

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
      vue : ILogVueSuppressionRule[],
      server : ILogSuppressionRule[]
    }
  },
  userNotifications: {
    maxItems: number,
    timeoutMs: number,
    filterDuplicates: boolean
  },
  userSession: {
    secure: boolean,
    expirationDays: number,
    encryptionKey: string
  },
  images: {
    sharpness: number,
    scaleStep: number,
    cacheFsDir: string
  },
  maxDbConcurrentUpdateAttemps: number,
  authCookiesResponseFilter: boolean,
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
  booking: {
    companyName: string,
    siteUrl: string
  },
  caching: {
    intervalSeconds: number | false,
    clientRuntime: {
      expirationsSeconds: {
        default: number
      }
    },
    invalidation: {
      intervalSeconds: number,
      maxChangedPagesForPurge: number,
      retries: {
        attemptsCount: number,
        intervalMs: number
      },
      batching: {
        modifiedEntitiesQueryBatch: number,
        relatedEntitiesQueryBatch: number,
        pageTimestampsUpdateBatch: number
      },
      ogImageCachePrefix: string
    },
    httpDefaults: string
  },
  searchOffers: {
    listPageSize: number,
    flexibleDatesRangeDays: number
  },
  enableHtmlTabIndex: boolean,
  ogImage: {
    enabled: boolean,
    screenSize: {
      width: number,
      height: number
    }
  },
  maps: {
    providerDisplayResName: I18nResName,
    mapControlComponentName: string
  } | false,
  versioning: {
    nuxt: string,
    appVersion: number
  },
  acsys: IAcsysOptions,
  dataSeeding: {
    customLoadingStub: boolean,
    dirs: {
      content: string,
      appData: string,
      publicRes: string
    }
  }
}

const Config : IAppConfig = {
  logging: {
    common: {
      name: 'golobe',
      /** error, warn, info, verbose, debug or never */
      level: (isTestEnv() || isDevEnv()) ? 'debug' : 'warn',
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
        { appExceptionCode: 'UNAUTHENTICATED', logLevel: 'info' },
        { appExceptionCode: 'CAPTCHA_VERIFICATION_FAILED', logLevel: 'info' },
        { appExceptionCode: 'FORBIDDEN', logLevel: 'info' },
        { appExceptionCode: 'EMAILING_DISABLED', logLevel: 'info' }
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
      path: `/${RestApiLogging}`
    },
    suppress: {
      vue: [
        /** suppressing passing inherited properties values */
        { messageFitler: /Extraneous non-props attributes .* were passed to component but could not be automatically inherited/gi, componentNameFilter: /.*/ },
        /** suppressing floating-vue^5.2.2 dispose exception (in webkit)
         * ({"error":"[CLIENT LOG]","level":"error","message":"Reflect.get requires the first argument be an object","msg":"(nuxtApp.vueApp.config.exceptionHandler) beforeUnmount hook","name":"TypeError",
         * "stack":"get@[native code]\nget@[native code]\nhide@http://localhost:3000/_nuxt/node_modules/.cache/vite/client/deps/floating-vue.js:1785:31
         * \ndispose@http://localhost:3000/_nuxt/node_modules/.cache/vite/client/deps/floating-vue.js:1803:91\nbeforeUnmount@http://localhost:3000/_nuxt/node_modules/.cache/vite/client/deps/floating-vue.js:1773:17\ncallWithErrorHandling)
         * */
        { messageFitler: /.*beforeUnmount hook.*/gi, componentNameFilter: /.*floating-vue.*/gi }
      ],
      server: [
        // not yet
      ]
    }
  },
  userNotifications: {
    maxItems: 5, // maximum number of simultaneously displayed notifications
    timeoutMs: 6000, // duration on one notification in millisenconds
    filterDuplicates: true // don't show notification if there is already another notification with the same text displayed
  },
  userSession: {
    secure: isPublishEnv(), // set session cookie only when secure connection
    expirationDays: 7, // expiration time for user session cookie
    encryptionKey: process.env.H3_SESSION_ENCRYPTION_KEY! // key with which to encrypt session data
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
  /** 
   * filters out auth-cookies from "set-cookie":"next.auth...." response headers for some non-auth endpoints 
   * to prevent restoring auth session on signing out while some of fetch requests still pending.
   * At the moment used in tests only as session refresh is not critical in test env
   * */
  authCookiesResponseFilter: isTestEnv(),
  /** security requirements for user password */
  userPasswordPolicy: {
    minLength: 8, // minimum password length
    uppercase: true, // must contain one uppercase letter
    lowercase: true, // must contain one lowercase letter
    number: true, // must contain one number
    specialChar: true // must contain one special character
  },
  email: isPublishEnv()
    ? {
        host: 'localhost', // SMTP server host
        port: 587, // SMTP server port
        secure: true, // require SSL connection with SMTP server
        from: 'noreply@golobe.demo', // email address from which to send mails
        appName: 'Golobe', // website app name to be used in email templates
        siteUrl: SiteUrl
      }
     
    : ((!isTestEnv() && !isQuickStartEnv()) ? {
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
  booking: { // text information used in booking Terms and Conditions
    companyName: 'Golobe', // company's display name
    siteUrl: SiteUrl // website with detailed information
  },
  caching: {
    intervalSeconds: HtmlPageCachingEnabled ? CachingIntervalSeconds : false, // maximum amount of time in seconds that rendered html page's data can be cached and re-served to client while re-redering in background. False - caching disabled
    clientRuntime: { // client-side entity cache-related settings
      expirationsSeconds: { // cache item expiration in seconds, must not exceed "maxage" cache HTTP-header across involved entity types
        default: 1800 // default expiration for any entity type
      }
    },    
    invalidation:  // rendered page cache invalidation options when html content has been changed e.g. from CMS
    {
      intervalSeconds: isTestEnv() ? 21 * 24 * 60 * 60 : 10 * 60, // invalidation timer task interval in seconds (almost disabled in tests as triggered via test endpoint)
      maxChangedPagesForPurge: 500, // maximum number of changed pages during interval upon exceeding which full cache purge will be performed (instead of removing pages by it's keys individually) - optimization
      retries: { // retry policy for a single page
        attemptsCount: 3, // number of attempts
        intervalMs: 1000 // interval between successive attempts in milliseconds
      },
      batching: { // parameters which affect memory consumption & DB query perfomance when constructing list of related entities to update page timestamps (for pages with timestamp-based caching options)
        modifiedEntitiesQueryBatch: isTestEnv() ? 50 : 1000, // maximum size of IDs list used in single request to DB for entity's last modification time
        relatedEntitiesQueryBatch: isTestEnv() ? 50 : 1000, // maximum size of IDs list used in single request to DB for related entities
        pageTimestampsUpdateBatch: isTestEnv() ? 10 : 500 // // maximum size of records used in single request to DB for creating/updating page timestamps
      },
      ogImageCachePrefix: 'cache:nuxt-og-image@3.0.0-rc.64' // prefix for og-image cache keys
    },
    httpDefaults: 'no-store, private' // default value for 'Cache-Control' response header if not filled by app server
  },
  searchOffers: { // settings related to flight & stay offers search pages with filter & pagination
    listPageSize: 20, // pagination - number of offer items fetched from server in one request
    flexibleDatesRangeDays: FlexibleDatesRangeDays // allowed depart/return date adjustment in days for searched offers when "My Dates Are Flexible" flag is set
  },
  enableHtmlTabIndex: false, // ignored in Nuxt-ui
  ogImage: {
    enabled: true, // if enabled, system will add og:image metadata tag to pages and setup (pre-)rendering logic
    screenSize: { // ogImage size (device width/height); 1200x630 is optimal image size for most social networks
      width: 1200,
      height: 630
    }
  },
  maps: (!isTestEnv() && !isQuickStartEnv())
    ? {
        providerDisplayResName: 'mapsProviderYandex', // i18n resource name of map's service provider
        mapControlComponentName: 'YandexMaps' // name of Vue component used to display interactive map
      }
    : false,
  versioning: {
    appVersion: 1_00_00, // application version passed from user's browser in HTTP request header when calling server API enpoints
    nuxt: '3.12.4' // additional option to control backward compatibility
  },
  acsys: {
    srcDir: './../externals/acsys', // directory containing Acsys sources 
    execDir: './packages/backend/.acsys', // working directory of Acsys host process
    filesDir: 'files', // Acsys files storage directory name
    dbName: SQLiteDbName, // SQLite database file name
    draftsEntityPrefix: 'AcsysDrafts', // name prefix for draft entity DB tables
    storageDriver: 'local', // content storage driver, local filesystem is used
    port: 9000, // Acsys host TCP port
    startupTimeoutMs: 15000, // timeout waiting for Acsys startup ping
    projectName: 'golobe', // project name
    users: { // Acsys user credentials for calling its REST API. Which account is chosen depends on access level required by method being invoked
      admin: { name: 'cms_admin', email: 'cms_admin@golobe.demo', password: process.env.ACSYS_ADMIN_USER_PASSWORD as string, autoFillCredsOnLoginPage: !isPublishEnv() },
      standard: { name: 'cms_standard', email: 'cms_standard@golobe.demo', password: process.env.ACSYS_STANDARD_USER_PASSWORD as string, autoFillCredsOnLoginPage: false },
      viewer: { name: 'cms_viewer', email: 'cms_viewer@golobe.demo', password: process.env.ACSYS_VIEWER_USER_PASSWORD as string, autoFillCredsOnLoginPage: isPublishEnv() }
    }
  },
  dataSeeding: { // initial seeding with demo data settings 
    customLoadingStub: isQuickStartEnv(), // whether to display loading page (from Nuxt templates) while seeding DB with data on first-time server app start
    dirs: { // directory names where to look for content
      content: 'content', // primary content folder
      appData: 'appdata', // app logic data folder
      publicRes: 'public' // public assets
    }
  }
};

export default Config;
