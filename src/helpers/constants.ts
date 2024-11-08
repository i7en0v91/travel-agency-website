import { MimeTypeWebp } from '@golobe-demo/shared';

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

export const UserAccountTabAccount = 'account';
export const UserAccountTabHistory = 'history';
export const UserAccountTabPayments = 'payments';
export const UserAccountOptionButtonGroup = 'accountOptionButtonsGroup';
export const UserAccountOptionButtonAccount = `${UserAccountOptionButtonGroup}-${UserAccountTabAccount}`;
export const UserAccountOptionButtonHistory = `${UserAccountOptionButtonGroup}-${UserAccountTabHistory}`;
export const UserAccountOptionButtonPayments = `${UserAccountOptionButtonGroup}-${UserAccountTabPayments}`;

export const SearchFlightOffersDisplayOptions = 'searchFlightOffers-DisplayOptions';
export const SearchStayOffersDisplayOptions = 'searchStayOffers-DisplayOptions';

export const FavouritesOptionButtonGroup = 'favouritesOptBtnGrp';
export const FavouritesOptionButtonFlights = `${FavouritesOptionButtonGroup}-Flights`;
export const FavouritesOptionButtonStays = `${FavouritesOptionButtonGroup}-Stays`;

export const TabHistoryOptionButtonGroup = 'tabHistoryOptBtnGrp';
export const TabHistoryOptionButtonFlights = `${TabHistoryOptionButtonGroup}-Flights`;
export const TabHistoryOptionButtonStays = `${TabHistoryOptionButtonGroup}-Stays`;

export const SearchOffersFilterTabGroupId = 'search-offers-filter-panel-gid';

export const WorldMapCityLabelFlipX = 0.85;
export const TravelDetailsHtmlAnchor = 'travelDetails';