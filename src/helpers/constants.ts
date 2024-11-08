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

export const UserAccount = 'account';
export const UserHistory = 'history';
export const UserPayments = 'payments';
export const UserAccountTabGroup = 'tabAccountGrp';
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