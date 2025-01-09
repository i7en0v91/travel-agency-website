import { AppPage, MimeTypeWebp } from '@golobe-demo/shared';

export enum DeviceSizeEnum {
  XS = 'XS',
  SM = 'SM',
  MD = 'MD',
  LG = 'LG',
  XL = 'XL',
  XXL = 'XXL'
};
  
export const MinSupportedWidth = 375; // subscribe mailbox control determines
export const MaxSupportedWidth = 1800;

/** breakpoints for adaptive layout in pixels*/
export const DeviceSizeBreakpointsMap: ReadonlyMap<DeviceSizeEnum, number> = 
  new Map<DeviceSizeEnum, number>([
    [DeviceSizeEnum.XS, MinSupportedWidth],
    [DeviceSizeEnum.SM, 550],
    [DeviceSizeEnum.MD, 872],
    [DeviceSizeEnum.LG, 1040],
    [DeviceSizeEnum.XL, 1376],
    [DeviceSizeEnum.XXL, 1536]
  ]);
  
export const CroppingImageDataKey = 'current-cropping-image-data';
export const CroppingImageFormat = MimeTypeWebp;
export const CropperHeightViewportRatio = 0.4;
export const TooltipHideTimeout = 2000;
// TODO: currently it's a quick workaround to fit matched sentences into result box. Better should be dynamically computed based on viewport & font sizes
export const SiteSearchMaxMatchLength: { [P in keyof typeof DeviceSizeEnum]: number } = {
  XS: 35,
  SM: 45,
  MD: 45,
  LG: 60,
  XL: 60,
  XXL: 60
};
export const HashNavigationPageTimeout = 3000;

export const UserAccount = 'account';
export const UserHistory = 'history';
export const UserPayments = 'payments';
export const UserAccountTabGroup = 'UserAccount-TabControl';
export const UserAccountTabAccount = `${UserAccountTabGroup}-${UserAccount}`;
export const UserAccountTabHistory = `${UserAccountTabGroup}-${UserHistory}`;
export const UserAccountTabPayments = `${UserAccountTabGroup}-${UserPayments}`;

export const SearchFlightOffersDisplayOptions = 'searchFlightOffers-DisplayOptions';
export const SearchStayOffersDisplayOptions = 'searchStayOffers-DisplayOptions';

export const FavouritesTabGroup = 'tabFavouritesGrp';
export const FavouritesTabFlights = `${FavouritesTabGroup}-Flights`;
export const FavouritesTabStays = `${FavouritesTabGroup}-Stays`;

export const HistoryTabGroup = 'tabHistoryGrp';
export const HistoryTabFlights = `${HistoryTabGroup}-Flights`;
export const HistoryTabStays = `${HistoryTabGroup}-Stays`;

export const SearchOffersFilterTabGroupId = 'search-offers-filter-panel-gid';

export const WorldMapCityLabelFlipX = 0.85;
export const TravelDetailsHtmlAnchor = 'travelDetails';
export const StayReviewEditorHtmlAnchor = 'stayReviewEditor';
export const StayReviewSectionHtmlAnchor = 'stayReviewSection';

export const LocatorClasses = {
  UserAccountPage: 'user-account-page',
  CookieBannerBtn: 'cookie-banner-accept',
  AuthUserMenu: 'nav-user-menu',
  AuthUserMenuPopup: 'nav-user-menu-popup',
  SignInEmail: 'form input[name=\'email\']',
  SignInPassword: 'form input[name=\'password\']',
  SubmitBtn: 'form button[type=\'submit\']',
  TestLocalOAuthBtn: 'oauth-btn-testlocal',
  SearchOffersFlightParams: 'searchoffers-flightparams',
  LocaleToggler: 'locale-toggler',
  NavLogo: 'nav-logo',
  BookingDetails: 'booking-details-page' // see BookingDetailsDivSelector for electron
};

export const ContentPages = {
  pagesWithMdc: [AppPage.Index, AppPage.Privacy, AppPage.Flights, AppPage.Stays],
  fromRoutesRequiringMount: [AppPage.Login, AppPage.EmailVerifyComplete, AppPage.ForgotPassword, AppPage.ForgotPasswordComplete, AppPage.ForgotPasswordSet, AppPage.ForgotPasswordVerify, AppPage.Signup, AppPage.SignupComplete, AppPage.SignupVerify]
};