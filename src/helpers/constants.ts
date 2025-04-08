import { MimeTypeWebp } from '@golobe-demo/shared';
import type { ControlKey } from './components';

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
export const TooltipHideTimeout = 2000;
export const HashNavigationPageTimeout = 3000;
export const StoreOperationTimeout = 30000;

export const FindFlightsPageCtrlKey: ControlKey = ['Page', 'FindFlights'];
export const FindStaysPageCtrlKey: ControlKey = ['Page', 'FindStays'];
export const UserAccountTabAccount = 'Account';
export const UserAccountTabHistory = 'History';
export const UserAccountTabPayments = 'Payments';
export const UserAccountPageCtrlKey: ControlKey = ['Page', 'Account'];
export const UserAccountOptionButtonGroup: ControlKey = [...UserAccountPageCtrlKey, 'OptionBtnGroup'];
export const UserAccountOptionButtonAccount: ControlKey = [...UserAccountOptionButtonGroup, 'Account', 'Option'];
export const UserAccountOptionButtonHistory: ControlKey = [...UserAccountOptionButtonGroup, 'History', 'Option'];
export const UserAccountOptionButtonPayments: ControlKey = [...UserAccountOptionButtonGroup, 'Payments', 'Option'];
export type TimeRangeFilter = 'upcoming' | 'passed';
export const DefaultTimeRangeFilter: TimeRangeFilter = 'upcoming';

export const SearchOffersFilterTabGroupId = 'search-offers-filter-panel-gid';
enum SearchStaysOptionButtonEnum { Hotels = 'Hotels', Motels = 'Motels', Resorts = 'Resorts' };
export type SearchStaysOptionButtonKind = keyof typeof SearchStaysOptionButtonEnum;
export const SearchStaysOptionButtons: SearchStaysOptionButtonKind[] = [
  SearchStaysOptionButtonEnum.Hotels, 
  SearchStaysOptionButtonEnum.Motels, 
  SearchStaysOptionButtonEnum.Resorts
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