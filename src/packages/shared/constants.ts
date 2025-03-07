import type { Locale, Theme, FlightClass, TripType } from './types';

export enum LogLevelEnum {
  'debug' = 10,
  'verbose' = 20,
  'info' = 30,
  'warn' = 40,
  'error' = 50,
  'never' = 100
}
export const LogAlwaysLevel = 'always';
export const PrimitiveDataValuePropName = 'val';

export enum CmsType {
  acsys = 'acsys'
}

export const RestApiPrefix = 'api';
export const RestAppPrefix = `${RestApiPrefix}/app`;
export const RestApiLogging = `${RestAppPrefix}/log`;
export const RestApiAuth = `${RestApiPrefix}/auth`;

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
export const DefaultTheme: Theme = 'light';

export enum LocaleEnum {
  EN = 'en',
  RU = 'ru',
  FR = 'fr'
}
export const DefaultLocale = 'en';
export const AvailableLocaleCodes = Object.keys(LocaleEnum).map(x => x.toLowerCase() as Locale);

export const AdminUserEmail = 'admin@golobe.demo';

export const DataKeyWorldMapData = 'WorldMapData';
export const DataKeySearchFlightOffers = 'SearchFlightOffers';
export const DataKeySearchStayOffers = 'SearchStayOffers';

export const SessionThemeKey = 'theme';
export const SessionLocaleKey = 'locale';
export const SessionStaySearchHistory = 'stay-search-history';

export const HeaderSetCookie = 'set-cookie';
export const HeaderCookies = 'cookie';
export const HeaderAuthorization = 'Authorization';
export const HeaderContentType = 'Content-Type';
export const HeaderHost = 'Host';
export const HeaderUserAgent = 'user-agent';
export const HeaderCacheControl = 'cache-control';
export const HeaderEtag = 'etag';
export const HeaderDate = 'date';
export const HeaderLastModified = 'last-modified';
export const HeaderLocation = 'location';
export const HeaderAppVersion = 'x-golobe-app-version';

export declare enum PageCacheVaryOptionsEnum {
  /**
   * Url's pathname and it's query will be used for computing cache keys related to page. A full
   * list of possible query values must be specified. If request contains any other non-specified 
   * parameter, it will be ignored. In addition to configured variants list, enumeration is 
   * performed over locale, {@link QueryInternalRequestParam} and other system parameters.
   * This mode is suitable for pages with static og images and simple caching logic as system will
   * remove only cache keys with predefined base and pattern names. E.g. if the page generates 
   * OgImage dynamically (which involves caching on multiple stages) than another
   * {@link QueryPageTimestampParam} mode must be used instead
   */
  PathAndPredefinedVariants = 'PathAndPredefinedVariants',

  /**
   * Ignores entity's id and query arguments, only path and locale (and other system parameters like 
   * {@link QueryInternalRequestParam} query flag). Query hashes are not involved in cache key searching. 
   * Thus, in this mode system clears all rendered page variants at once. Also it won't touch 
   * OgImage's cache - only static images are allowed.
   * This mode should be used when page query may contain arbitrary query values.
   */
  VaryByIdAndSystemParamsOnly = 'VaryByIdAndSystemParamsOnly',

  /**
   * Caching policy is defined by entity's last-modified time. System tracks page change
   * timestamp and redirects user agent to url with "...&t={timestamp}..." added to query (if not present).
   * In this mode there are no manual key calculations and stale page versions 
   * with old timestamps MAY remain in cache (though, some html-related cache invalidation still exists). 
   * Should be used when page requires complex caching-related activities to render itself, so that it's 
   * easier to vary page version via query parameter than meanully find and remove it from cache. 
   * It's probably not desirable to add & redirect to "...&t={timestamp}..." for main index page, but
   * is acceptable for offers/flights e.t.c identity pages
   */
  UseEntityChangeTimestamp = 'UseEntityChangeTimestamp'
}
export const UninitializedPageTimestampValue = 0 as const;
export const QueryInternalRequestParam = 'i'; // ...&i=1...
export const QueryPageTimestampParam = 't'; // ...&t=1717585420729...
export const QueryPagePreviewModeParam = 'drafts'; // ...&drafts=true...
export const QueryDraftRequestPathParam = 'reqPath';

export const PreviewModeParamEnabledValue = 'true';

export const CookieAuthSessionToken = 'next-auth.session-token';
export const CookieAuthCallbackUrl = 'next-auth.callback-url';
export const CookieAuthCsrfToken = 'next-auth.csrf-token';
export const CookieI18nLocale = 'i18n_redirected';
export const CookieSession = 'golobe.session';
export const CookiePolicyConsent = 'golobe.cookie_and_privacy_policies';
export const CookieLoginOrigin = 'golobe.login_origin';

/**
 * KB: Relative ordering is important, change carefully according to service's mutual dependencies
 */
export enum EntityChangeSubscribersOrder {
  ImageCategoryLogic = 5,
  ImageProvider = 7,
  AirlineCompanyLogic = 9,
  AirplaneLogic = 10,
  HtmlPageCleaner = 100
};

export const MaxStayReviewLength = 8000;

export const I18LocalesDirName = 'locales';
export const LoadingStubFileName = 'data-seeding-stub.html';

export const OgImageExt = 'png';
export const OgImagePathSegment = '__og-image__/image/';

export const NuxtIslandPathSegment = '__nuxt_island/';
export const NuxtImagePathSegment = '_ipx/';

export const DbVersionDraft = -1;
export const DbVersionInitial = 0;
export const HtmlPageTimestampTable = 'HtmlPageTimestamp';
export const HtmlPageTimestampColumnName = 'timestamp';
export const IdColumnName = 'id';
export const ModifiedTimeColumnName = 'modifiedUtc';
export const CreatedTimeColumnName = 'createdUtc';

export const DEV_ENV_MODE = 'development';
export const TEST_USER_PASSWORD = 'p@Ssw0rD!';
export const CREDENTIALS_TESTUSER_PROFILE = {
  firstName: 'CTest',
  lastName: 'CUser',
  email: 'credentialstestuser@localhost.test'
};

export const MimeTypeWebp = 'image/webp';

export const DefaultUserCoverSlug = 'default-user-cover';
export const DefaultUserAvatarSlug = 'default-user-avatar';
export const MainTitleSlug = 'main-title';
export const FlightsTitleSlug = 'flights-title';
export const StaysTitleSlug = 'stays-title';

export const MaxTokenConsumeAttempts = 3;
export const SecretValueMask = '********';
export const MaxListPropertyElementsCount = 256;

export const FlightMinPassengers = 1;
export const FlightMaxPassengers = 8;
export const DefaultFlightClass: FlightClass ='economy';
export const DefaultFlightTripType: TripType = 'oneway';
export const StaysMinRoomsCount = 1;
export const StaysMaxRoomsCount = 4;
export const StaysMinGuestsCount = 1;
export const StaysMaxGuestsCount = 10;

export const DefaultEmailTheme = <Theme>'light';

export const CurrentUserGeoLocation = { lon: 0.0, lat: 0.0 };

export const DefaultStayReviewScore = 0;

export const SearchOffersPriceRange = { min: 0, max: 25000 };
export const SearchOffersPrimeOfferIterator = 9721;
/**
 * Maximum number of (departCity; arriveCity) variant pairs in case one of depart or arrive destination was not specified.
 * Don't change it as it will break offer's links to owning users on existing database.
 */
export const MaxOfferGenerationCityPairCount = 25;
/**
 * Maximum number of generated flight offers for specified depart/arrive city and flight date.
 * Don't change it as it will break offer's links to owning users on existing database.
 */
export const MaxOfferGenerationRouteFlightsCount = 10;
/**
 * Maximum number of nearest airline companies used in flight generation algorithm
 */
export const MaxOfferGenerationRouteCompaniesCount = 10;
/**
 * Allowed depart/return date adjustment in days for searched offers when "My Dates Are Flexible" flag is set
 */
export const FlexibleDatesRangeDays = 2;
/**
 * Limit to prevent out of memory exception when generating offers in memory in case something goes wrong in algorithm
 * Approx ranges for worst case: departDate * returnDate * (fromCity, toCity) * numFlightsPerRoute
 */
export const MaxOfferGenerationMemoryBufferItems = (2 * FlexibleDatesRangeDays + 1) * ((2 * FlexibleDatesRangeDays + 1)) * MaxOfferGenerationCityPairCount * MaxOfferGenerationRouteFlightsCount;
/**
 * Minimum increment in minutes between two adjusted flights
 * Must be divisor of 60
 */
export const FlightTimeOfDayIntervalMinutes = 15;

export const NumMinutesInDay = 1440;
export const MaxSearchHistorySize = 8;

export const DefaultFlightOffersSorting = 'score';
export const FlightsAirlineCompanyFilterId = 'FlightOffersAirlineCompanyFilterId';
export const FlightsDepartureTimeFilterId = 'FlightsDepartureTimeFilterId';
export const FlightsTripTypeFilterId = 'FlightOffersTripTypeFilterId';
export const FlightsRatingFilterId = 'FlightsRatingFilterId';
export const FlightsPriceFilterId = 'FlightsPriceFilterId';
// Search flight offers - trip options
export const FlightsTripTypeFilterFlexibleDatesItemId = 'FlightsTripTypeFilterFlexibleDatesItemId';
export const CheckInOutDateUrlFormat = 'YYYY-MM-DD';

export const DefaultStayOffersSorting = 'score';
export const StaysPriceFilterId = 'StaysPriceFilterId';
export const StaysRatingFilterId = 'StaysRatingFilterId';
export const StaysFreebiesFilterId = 'StaysFreebiesFilterId';
export const StaysFreebiesFilterItemId = (itemLabel: string) => `StaysFreebiesFilterItemId-${itemLabel}`;
export const StaysAmenitiesFilterId = 'StaysAmenitiesFilterId';
export const StaysAmenitiesFilterItemId = (itemLabel: string) => `StaysAmenitiesFilterItemId-${itemLabel}`;

export enum SignUpResultEnum {
  SUCCESS = 'SUCCESS',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  AUTOVERIFIED = 'AUTOVERIFIED'
}

export enum SignUpCompleteResultEnum {
  SUCCESS = 'SUCCESS',
  ALREADY_CONSUMED = 'ALREADY_CONSUMED',
  LINK_INVALID = 'LINK_INVALID',
  LINK_EXPIRED = 'LINK_EXPIRED'
}

export enum RecoverPasswordResultEnum {
  SUCCESS = 'SUCCESS',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED'
}

export enum RecoverPasswordCompleteResultEnum {
  SUCCESS = 'SUCCESS',
  ALREADY_CONSUMED = 'ALREADY_CONSUMED',
  LINK_INVALID = 'LINK_INVALID',
  LINK_EXPIRED = 'LINK_EXPIRED'
}

export enum AppPage {
  Index = 'Index',
  Account = 'Account',
  Favourites = 'Favourites',
  EmailVerifyComplete = 'EmailVerifyComplete',
  FindFlights = 'FindFlights',
  FindStays = 'FindStays',
  FlightDetails = 'FlightDetails',
  BookFlight = 'BookFlight',
  Flights = 'Flights',
  ForgotPasswordComplete = 'ForgotPasswordComplete',
  ForgotPasswordSet = 'ForgotPasswordSet',
  ForgotPasswordVerify = 'ForgotPasswordVerify',
  ForgotPassword = 'ForgotPassword',
  Login = 'Login',
  Privacy = 'Privacy',
  SignupComplete = 'SignupComplete',
  SignupVerify = 'SignupVerify',
  Signup = 'Signup',
  Stays = 'Stays',
  StayDetails = 'StayDetails',
  BookStay = 'BookStay',
  BookingDetails = 'BookingDetails'
};
export enum SystemPage {
  Drafts = 'Drafts'
};

export const AllHtmlPages = Object.values(AppPage);
export const EntityIdPages: AppPage[] = [AppPage.FlightDetails, AppPage.BookFlight, AppPage.StayDetails, AppPage.BookStay, AppPage.BookingDetails];

export const HtmlPagePaths: ReadonlyMap<AppPage, string> = new Map<AppPage, string>([
  [AppPage.Index ,  ''],  
  [AppPage.Account ,  'account'],  
  [AppPage.Favourites ,  'favourites'],  
  [AppPage.EmailVerifyComplete ,  'email-verify-complete'],  
  [AppPage.FindFlights ,  'find-flights'],  
  [AppPage.FindStays ,  'find-stays'],  
  [AppPage.FlightDetails ,  'flight-details'],  
  [AppPage.BookFlight ,  'flight-book'],  
  [AppPage.Flights ,  'flights'],  
  [AppPage.ForgotPasswordComplete ,  'forgot-password-complete'],  
  [AppPage.ForgotPasswordSet ,  'forgot-password-set'],  
  [AppPage.ForgotPasswordVerify ,  'forgot-password-verify'],  
  [AppPage.ForgotPassword ,  'forgot-password'],  
  [AppPage.Login ,  'login'],  
  [AppPage.Privacy ,  'privacy'],  
  [AppPage.SignupComplete ,  'signup-complete'],  
  [AppPage.SignupVerify ,  'signup-verify'],  
  [AppPage.Signup ,  'signup'],  
  [AppPage.Stays ,  'stays'],  
  [AppPage.StayDetails ,  'stay-details'],  
  [AppPage.BookStay ,  'stay-book'],  
  [AppPage.BookingDetails ,  'booking']
]);

export enum FlightClassEnum {
  Economy = 'economy',
  Comfort = 'comfort',
  Business = 'business'
};
export const AvailableFlightClasses: FlightClass[] = Object.keys(FlightClassEnum).map(x => x.toLowerCase() as FlightClass);

export enum FlightOffersSortFactorEnum {
  Price,
  Score,
  Duration,
  TimeToDeparture,
  Rating
};
export const AvailableFlightOffersSortFactor = Object.keys(FlightOffersSortFactorEnum).map(x => x.toLowerCase());

export enum AirplaneImageEnum {
  Main = 'main',
  Window = 'window',
  Cabin = 'cabin',
  Common = 'common'
}
export const AvailableAirplaneImageKind = [...Object.values(AirplaneImageEnum).map(x => x.toLowerCase()), ...AvailableFlightClasses];

export enum StayServiceLevelEnum {
  Base = 'Base',
  CityView1 = 'CityView1',
  CityView2 = 'CityView2',
  CityView3 = 'CityView3'
};
export const AvailableStayServiceLevel = Object.values(StayServiceLevelEnum).map(x => x.valueOf());

export enum StayOffersSortFactorEnum {
  Price = 'price',
  Score = 'score',
  Rating = 'rating'
}
export const AvailableStayOffersSortFactor = Object.keys(StayOffersSortFactorEnum).map(x => x.toLowerCase());

export enum ImageCategory {
  SampleData = 'SampleData',
  UserAvatar = 'UserAvatar',
  UserCover = 'UserCover',
  MainTitle = 'MainTitle',
  PageTitle = 'PageTitle',
  CityCard = 'CityCard',
  TravelBlock = 'TravelBlock',
  CompanyReview = 'CompanyReview',
  AirlineLogo = 'AirlineLogo',
  Airplane = 'Airplane',
  AirplaneFeature = 'AirplaneFeature',
  Hotel = 'Hotel',
  HotelRoom = 'HotelRoom',
  AuthFormsImage = 'AuthFormsImage'
}
export const ImageAuthRequiredCategories = [ImageCategory.UserCover];
export const ImagePublicSlugs = [DefaultUserCoverSlug, DefaultUserAvatarSlug];
export const AvailableImageCategories = Object.values(ImageCategory).map(x => x.valueOf() as keyof typeof ImageCategory);

export enum AuthProvider {
  Email = 'EMAIL',
  Google = 'GOOGLE',
  GitHub = 'GITHUB',
  TestLocal = 'TESTLOCAL'
}

export enum CacheEntityTypeEnum {
  City = 'City'
};

export enum StayDescriptionParagraphEnum {
  Title = 'Title',
  Main = 'Main',
  Footer = 'Footer',
  FeatureCaption = 'FeatureCaption',
  FeatureText = 'FeatureText'
};
export const AvailableStayDescriptionParagraphTypes = Object.values(StayDescriptionParagraphEnum).map(x => x.valueOf());

export enum TokenKind {
  EmailVerify = 'EmailVerify',
  PasswordRecovery = 'PasswordRecovery',
  RegisterAccount = 'RegisterAccount'
};
export const AvailableTokenKinds = Object.values(TokenKind).map(v => v.valueOf());

export enum EmailTemplateEnum {
  EmailVerify = 'EmailVerify',
  PasswordRecovery = 'PasswordRecovery',
  RegisterAccount = 'RegisterAccount'
};
export const AvailableEmailTemplates = Object.values(EmailTemplateEnum).map(v => v.valueOf());

export const KeyCodeEsc = 'Escape';

// Id value for objects which have been not saved to DB
export const TemporaryEntityId = "TempID";
export const EntityIdRadix = 20;
/**
 * Radix {@link EntityIdRadix}
 */
export const EntityIdTestRegEx = /^[a-j0-9]{12,24}$/;

export const PdfFontRegularFile = 'regular.ttf';
export const PdfFontMediumFile = 'medium.ttf';
export const PdfFontSemiboldFile = 'semibold.ttf';

export const PdfFontSizeScaleBase = 0.75;
export const PdfFontPrimarySize = 14 * PdfFontSizeScaleBase;
export const PdfFontParagraphTitleSize = 20 * PdfFontSizeScaleBase;
export const PdfFontMainTitleSize = 26 * PdfFontSizeScaleBase;

export const PdfDocMargins = {
  top: 15,
  left: 25,
  bottom: 30,
  right: 25
};

/** A4 paper size */
export const PdfPaperWidth: number = 595.28;
export const PdfPaperHeight: number = 841.89;

export const PdfImgWidth = PdfPaperWidth;
export const PdfBulletSize = 2;