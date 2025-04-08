import type { ControlKey } from './components';
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
export const StoreOperationTimeout = 30000;

export const FindFlightsPageCtrlKey: ControlKey = ['Page', 'FindFlights'];
export const FindStaysPageCtrlKey: ControlKey = ['Page', 'FindStays'];
export const UserAccount = 'Account';
export const UserHistory = 'History';
export const UserPayments = 'Payments';
export const UserAccountPageCtrlKey: ControlKey = ['Page', 'Account'];
export const UserAccountTabGroup: ControlKey = [...UserAccountPageCtrlKey, 'TabGroup'];
export const UserAccountTabAccount: ControlKey = [...UserAccountTabGroup, 'Account', 'Tab'];
export const UserAccountTabHistory: ControlKey = [...UserAccountTabGroup, 'History', 'Tab'];
export const UserAccountTabPayments: ControlKey = [...UserAccountTabGroup, 'Payments', 'Tab'];

export const HistoryTabGroup: ControlKey = [...UserAccountTabHistory, 'TabGroup'];
export const HistoryTabFlights: ControlKey = [...HistoryTabGroup, 'Flights', 'Tab'];
export const HistoryTabStays: ControlKey = [...HistoryTabGroup, 'Stays', 'Tab'];
export type TimeRangeFilter = 'upcoming' | 'passed';
export const DefaultTimeRangeFilter: TimeRangeFilter = 'upcoming';

export const SearchOffersFilterTabGroupId = 'search-offers-filter-panel-gid';
enum SearchStaysOptionButtonEnum { hotels = 'hotels', motels = 'motels', resorts = 'resorts' };
export type SearchStaysOptionButtonKind = keyof typeof SearchStaysOptionButtonEnum;
export const SearchStaysOptionButtons: SearchStaysOptionButtonKind[] = [
  SearchStaysOptionButtonEnum.hotels, 
  SearchStaysOptionButtonEnum.motels, 
  SearchStaysOptionButtonEnum.resorts
];

export const WorldMapCityLabelFlipX = 0.85;
export const TravelDetailsHtmlAnchor = 'travelDetails';
export const LOADING_STATE = Symbol.for('store-loading');
export enum StoreKindEnum {
  SystemConfiguration = 'system-configuration',
  UserNotification = 'user-notification',
  ControlValues = 'control-values',
  EntityCache = 'entity-cache',
  SearchOffers = 'search-offers',
  UserAccount = 'user-account',
  StayReviews = 'stay-reviews',
  TravelDetails = 'travel-details'
}

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