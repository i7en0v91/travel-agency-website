import type { CacheEntityType, ICommonServicesLocator, AppPage, I18nResName, GeoPoint, Price, FlightOffersSortFactor, FlightClass, TripType, OfferKind, Timestamp, ILocalizableValue, EntityId, IImageEntitySrc, FlightsFilterIds, StaysFilterIds } from '@golobe-demo/shared';
import type { IElectronShell } from './electron/interfaces';
import type { ControlKey } from './helpers/components';

export type SimplePropertyType = 'text' | 'email' | 'password';
export type PropertyGridControlButtonType = 'change' | 'apply' | 'cancel' | 'delete' | 'add';

export type ConfirmBoxButton = 'yes' | 'no' | 'cancel';

export type ActivePageLink = AppPage.Flights | AppPage.Stays | AppPage.Favourites;
export type NavBarMode = 'landing' | 'inApp';
export type ButtonKind = 'default' | 'accent' | 'support' | 'icon';

export type FloatingVueHydrationHints = {
  tabIndex: number | undefined
};

/** Components - option buttons */
export type IOptionButtonRole = { role: 'radio'} | { role: 'tab', tabPanelId: string };

export interface IOptionButtonProps {
  ctrlKey: ControlKey,
  enabled: boolean,
  isActive?: boolean,
  labelResName: I18nResName,
  subtextResName?: I18nResName | null | undefined,
  subtextResArgs?: any,
  shortIcon?: string,
  tabName?: string,
  role: IOptionButtonRole
}

export type OtherOptionButtonVariant = Omit<IOptionButtonProps, 'subtextResName' | 'subtextResArgs' | 'shortIcon'>;

export interface IOtherOptionsButtonGroupProps extends Omit<IOptionButtonProps, 'isActive' | 'shortIcon' | 'labelResName'> {
  defaultResName: I18nResName,
  selectedResName: I18nResName,
  variants: OtherOptionButtonVariant[]
}

export interface IOptionButtonGroupProps {
  ctrlKey: ControlKey,
  options: IOptionButtonProps[],
  otherOptions?: IOtherOptionsButtonGroupProps,
  defaultActiveOptionKey?: ControlKey,
  useAdaptiveButtonWidth?: boolean,
  persistent?: boolean,
  role: 'radiogroup' | 'tablist'
}

/** Components - dropdown lists */
export type DropdownListValue = string;
export interface IDropdownListItemProps {
  value: DropdownListValue,
  resName: I18nResName
}
export interface IDropdownListProps {
  ctrlKey: ControlKey,
  captionResName?: I18nResName,
  persistent?: boolean,
  selectedValue?: DropdownListValue,
  defaultValue?: DropdownListValue,
  placeholderResName?: I18nResName,
  listContainerClass?: string,
  items: IDropdownListItemProps[],
  kind?: 'primary' | 'secondary'
}

/** Components - travel details */
export type TravelDetailsImageStatus = 'loading' | 'ready' | 'error';
export interface ITravelDetailsTextingData {
  header: ILocalizableValue,
  text: ILocalizableValue,
  price: Price,
  slug: string
}
export interface ITravelDetailsData {
  cityId: EntityId,
  texting?: ITravelDetailsTextingData,
  images?: { slug: string, timestamp: Timestamp }[]
}

/** Components - search lists (with autocomplete) */
export type SearchListItemType = CacheEntityType;
export interface ISearchListItem {
  id: EntityId,
  slug?: string,
  displayName: ILocalizableValue
}

/** Components - search offers */

// Filters
export type FilterType = 'range' | 'checklist';
export interface ISearchOffersFilterProps {
  filterId: FlightsFilterIds | StaysFilterIds,
  captionResName: I18nResName,
  type: FilterType,
  displayOrder: number
}

export type SearchOffersFilterRange = { min: number, max: number };
export interface ISearchOffersRangeFilterProps extends ISearchOffersFilterProps {
  type: 'range',
  valueRange: SearchOffersFilterRange,
  limitLabelFormatter: 'price' | 'daytime'
}

export type SearchOffersFilterVariantId = string;
export interface ISearchOffersFilterVariant {
  id: SearchOffersFilterVariantId,
  displayText: I18nResName | ILocalizableValue | undefined
}

export interface ISearchOffersChecklistFilterProps extends ISearchOffersFilterProps {
  type: 'checklist',
  display: 'list' | 'flow',
  variants: ISearchOffersFilterVariant[] | undefined
}

export interface ISearchOffersCommonParams {
  kind: OfferKind
}

export interface ISearchOffersFilterParams {
  filters: (ISearchOffersRangeFilterProps | ISearchOffersChecklistFilterProps)[]
}

// Search parameters
export interface ISearchFlightOffersMainParams {
  fromCityId: EntityId,
  toCityId: EntityId,
  tripType: TripType,
  dateFrom: Date,
  dateTo: Date,
  numPassengers: number,
  class: FlightClass
}

export interface ISearchStayOffersMainParams {
  cityId: EntityId,
  checkIn: Date,
  checkOut: Date,
  numRooms: number,
  numGuests: number
}

export type ISearchFlightOffersParams = ISearchFlightOffersMainParams & ISearchOffersFilterParams & ISearchOffersCommonParams & { kind: 'flights' };
export type ISearchStayOffersParams = ISearchStayOffersMainParams & ISearchOffersFilterParams & ISearchOffersCommonParams & { kind: 'stays' };

// Display options
export type FlightOffersSortOptionType = FlightOffersSortFactor;

export interface ISearchOffersCommonSortOptions {
  totalCount: number
}

export type SearchFlightOffersSortVariant = {
  type: FlightOffersSortOptionType,
  price?: Price,
  duration?: number, // flights duration in minutes
};
export interface ISearchFlightOffersSortOptions extends ISearchOffersCommonSortOptions {
  sortVariants: SearchFlightOffersSortVariant[]
}

/** Components - maps */
export interface IMapControlProps {
  ctrlKey: ControlKey,
  origin: GeoPoint,
  cssClass?: string,
  webUrl?: string
}

/** Components - review editor */
export type ReviewEditorButtonType = 'bold' | 'italic' | 'strikethrough' | 'underline' | 'bulletList' | 'orderedList' | 'blockquote' | 'undo' | 'redo';

/** Components - booking ticket */
export interface IBookingTicketGeneralProps {
  ctrlKey: ControlKey,
  avatar?: IImageEntitySrc | null | undefined,
  texting?: {
    name: string,
    sub?: I18nResName | null | undefined
  },
  classResName?: I18nResName
}

export interface IBookingTicketDatesItemProps {
  ctrlKey: ControlKey,
  label?: string,
  sub?: ILocalizableValue | I18nResName
}

export interface IBookingTicketDatesProps {
  ctrlKey: ControlKey,
  from?: IBookingTicketDatesItemProps,
  to?: IBookingTicketDatesItemProps,
  offerKind?: OfferKind
}

export interface IBookingTicketDetailsItemProps {
  ctrlKey: ControlKey,
  icon: string,
  caption: I18nResName,
  text?: I18nResName
}

export interface IBookingTicketDetailsProps {
  ctrlKey: ControlKey,
  items?: IBookingTicketDetailsItemProps[]
}

export interface IBookingTicketStayTitleProps {
  ctrlKey: ControlKey,
  stayName: ILocalizableValue,
  cityName: ILocalizableValue
}

export interface IBookingTicketFlightGfxProps {
  ctrlKey: ControlKey,
  userName: string
}

export interface IBookingTicketProps {
  ctrlKey: ControlKey,
  offerKind?: OfferKind,
  generalInfo?: IBookingTicketGeneralProps,
  dates?: Omit<IBookingTicketDatesProps, 'offerKind'>,
  details?: IBookingTicketDetailsProps,
  titleOrGfx?: IBookingTicketFlightGfxProps | IBookingTicketStayTitleProps
}

export interface IClientServicesLocator extends ICommonServicesLocator {
  appMounted: boolean,
  userNotificationStore?: ReturnType<typeof useUserNotificationStore>,
  getElectronShell(): IElectronShell
}