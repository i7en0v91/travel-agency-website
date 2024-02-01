export enum LogLevelEnum {
  'debug' = 10,
  'verbose' = 20,
  'info' = 30,
  'warn' = 40,
  'error' = 50
}
export type LogLevel = keyof typeof LogLevelEnum;

export enum UserNotificationLevel {
  INFO,
  WARN,
  ERROR
}

export enum ThemeEnum {
  LIGHT = 'light',
  DARK = 'dark'
}
export const AvailableThemeCodes = Object.keys(ThemeEnum).map(x => x.toLowerCase());
export type Theme = Lowercase<keyof typeof ThemeEnum>;

export enum LocaleEnum {
  EN = 'en',
  RU = 'ru',
  FR = 'fr'
}
export const DefaultLocale = 'en';
export const AvailableLocaleCodes = Object.keys(LocaleEnum).map(x => x.toLowerCase());
export type Locale = Lowercase<keyof typeof LocaleEnum>;

export class NuxtDataKeys {
  public static readonly UserNotifications = 'UserNotifications';
  public static readonly BrowserSession = 'BrowserSession';
  public static readonly ImageSrcSizes = 'ImageSrcSizes';
  public static readonly EntityCacheItems = 'EntityCacheItems';
}

export class SessionConstants {
  public static readonly ThemeKey = 'theme';
  public static readonly LocaleKey = 'locale';
}

export class CookieNames {
  public static readonly AuthSessionToken = 'next-auth.session-token';
  public static readonly AuthCallbackUrl = 'next-auth.callback-url';
  public static readonly AuthCsrfToken = 'next-auth.csrf-token';
  public static readonly SessionId = 'golobe-sessionId';
  public static readonly I18nLocale = 'i18n_redirected';
  public static readonly CookieAndPolicyConsent = 'cookie_and_privacy_policies';
}

export class WebApiRoutes {
  public static readonly Prefix = '/api';

  public static readonly Logging = `${this.Prefix}/log`;
  public static readonly Authentication = `${this.Prefix}/auth`;
  public static readonly SessionManagement = `${this.Prefix}/session`;
  public static readonly Image = `${this.Prefix}/img`;
  public static readonly ImageDetails = `${this.Prefix}/img/details`;
  public static readonly ImageList = `${this.Prefix}/img/list`;
  public static readonly SignUp = `${this.Prefix}/account/signup`;
  public static readonly SignUpComplete = `${this.Prefix}/account/signup-complete`;
  public static readonly PasswordRecovery = `${this.Prefix}/account/recover-password`;
  public static readonly PasswordRecoveryComplete = `${this.Prefix}/account/recover-password-complete`;
  public static readonly EmailVerifyComplete = `${this.Prefix}/account/email-verify-complete`;
  public static readonly NewsletterSubscribe = `${this.Prefix}/newsletter-subscribe`;
  public static readonly UserAccount = `${this.Prefix}/user/account`;
  public static readonly UserImageUpload = `${this.Prefix}/user/upload-image`;
  public static readonly CitiesSearch = `${this.Prefix}/cities/search`;
  public static readonly PopularCitiesList = `${this.Prefix}/popular-cities`;
  public static readonly PopularCityTravelDetails = `${this.Prefix}/popular-cities/travel-details`;
  public static readonly CompanyReviewsList = `${this.Prefix}/company-reviews`;
  public static readonly EntityCache = `${this.Prefix}/entity-cache`;

  public static readonly ImageCacheLatency = 5 * 60; // maxAge HTTP caching option
  public static readonly OneDayCacheLatency = 24 * 60 * 60; // maxAge HTTP caching option
  public static readonly OneHourCacheLatency = 60 * 60; // maxAge HTTP caching option
}

export class DbConcurrencyVersions {
  public static readonly DraftVersion = -1;
  public static readonly InitialVersion = 0;
}

export const DEV_ENV_MODE = 'development';

export const TabIndicesUpdateDefaultTimeout = 100;
export const CssVarPrefix = 'glb';
export const CroppingImageDataKey = 'current-cropping-image-data';
export const CroppingImageFormat = 'image/webp';
export const TooltipHideTimeout = 2000;
export const DefaultUserCoverSlug = 'default-user-cover';
export const DefaultUserAvatarSlug = 'default-user-avatar';
export const MainTitleSlug = 'main-title';
export const FlightsTitleSlug = 'flights-title';
export const StaysTitleSlug = 'stays-title';

export const SecretValueMask = '********';
export const MaxListPropertyElementsCount = 256;
export class UIControlKeys {
  static readonly UserAccountOptionButtonAccount = 'accountOptBtnGrp-Account';
  static readonly UserAccountOptionButtonHistory = 'accountOptBtnGrp-History';
  static readonly UserAccountOptionButtonPayments = 'accountOptBtnGrp-Payments';
};

export const FlightMinPassengers = 1;
export const FlightMaxPassengers = 8;
export const StaysMaxRoomsCount = 4;
export const StaysMaxGuestsCount = 10;

export const WorldMapCityLabelFlipX = 0.85;
export const DefaultEmailTheme = <Theme>'light';
