import { type ICommonServicesLocator, type AppPage, type I18nResName, type GeoPoint, type Price, type StayOffersSortFactor, type FlightOffersSortFactor, type FlightClass, type TripType, type OfferKind, type Timestamp, type ILocalizableValue, type EntityId, type IImageEntitySrc, type CacheEntityType, type GetEntityCacheItem } from '@golobe-demo/shared';

export type SimplePropertyType = 'text' | 'email' | 'password';
export type PropertyGridControlButtonType = 'change' | 'apply' | 'cancel' | 'delete' | 'add';

export type ConfirmBoxButton = 'yes' | 'no' | 'cancel';

export type ActivePageLink = AppPage.Flights | AppPage.Stays | AppPage.Favourites;
export type ButtonKind = 'default' | 'accent' | 'support' | 'icon';

export type FloatingVueHydrationHints = {
  tabIndex: number | undefined
};

/** Client - entity cache */
export interface IEntityCache {
  set: <TEntityType extends CacheEntityType>(item: GetEntityCacheItem<TEntityType>, expireInSeconds: number | undefined) => Promise<void>,
  remove: <TEntityType extends CacheEntityType>(id: EntityId | undefined, slug: string | undefined, type: TEntityType) => Promise<void>,
  get: <TEntityType extends CacheEntityType>(ids: EntityId[], slugs: string[], type: TEntityType, fetchOnCacheMiss: false | { expireInSeconds: number | undefined }) => Promise<GetEntityCacheItem<TEntityType>[] | undefined>
}

/** Components - option buttons */
export type IOptionButtonRole = { role: 'radio'} | { role: 'tab', tabPanelId: string };

export interface IOptionButtonProps {
  ctrlKey: string,
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
  ctrlKey: string,
  options: IOptionButtonProps[],
  otherOptions?: IOtherOptionsButtonGroupProps,
  activeOptionCtrl?: string,
  useAdaptiveButtonWidth?: boolean,
  role: 'radiogroup' | 'tablist'
}

/** Components - dropdown lists */
export type DropdownListValue = string | number;
export interface IDropdownListItemProps {
  value: DropdownListValue,
  resName: I18nResName
}
export interface IDropdownListProps {
  ctrlKey: string,
  captionResName?: I18nResName,
  persistent: boolean,
  selectedValue?: DropdownListValue | undefined,
  defaultValue?: DropdownListValue | undefined,
  initiallySelectedValue?: DropdownListValue | null | undefined,
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
  texting?: ITravelDetailsTextingData | undefined,
  images?: { slug: string, timestamp: Timestamp }[] | undefined
}

/** Components - search lists (with autocomplete) */
export type SearchListItemType = 'destination';
export interface ISearchListItem {
  id: EntityId,
  slug?: string,
  displayName: ILocalizableValue | string
}

/** Components - search offers */

// Filters
export type FilterType = 'range' | 'checklist';
export interface ISearchOffersFilterProps<TValue> {
  filterId: string,
  captionResName: I18nResName,
  type: FilterType,
  currentValue?: TValue,
  displayOrder: number
}

export interface ISearchOffersRangeFilterProps extends ISearchOffersFilterProps<{ min: number, max: number }> {
  type: 'range',
  valueRange: {
    min: number,
    max: number
  },
  limitLabelFormatter: 'price' | 'daytime',
  applyNarrowing: (min: number, max: number) => void
}

export type SearchOffersFilterVariantId = string;
export interface ISearchOffersFilterVariant {
  id: SearchOffersFilterVariantId,
  displayText?: I18nResName | ILocalizableValue
}

export interface ISearchOffersChecklistFilterProps extends ISearchOffersFilterProps<SearchOffersFilterVariantId[]> {
  type: 'checklist',
  display: 'list' | 'flow',
  variants: ISearchOffersFilterVariant[],
  applyNarrowing: (variants: ISearchOffersFilterVariant[]) => void
}

export interface ISearchOffersCommonParams {
  kind: OfferKind
}

export interface ISearchOffersFilterParams {
  filters: (ISearchOffersRangeFilterProps | ISearchOffersChecklistFilterProps)[]
}

// Search parameters
export interface ISearchFlightOffersMainParams {
  fromCity: ISearchListItem,
  toCity: ISearchListItem,
  tripType: TripType,
  dateFrom: Date,
  dateTo: Date,
  numPassengers: number,
  class: FlightClass
}

export interface ISearchStayOffersMainParams {
  city: ISearchListItem,
  checkIn: Date,
  checkOut: Date,
  numRooms: number,
  numGuests: number
}

export type ISearchFlightOffersParams = ISearchFlightOffersMainParams & ISearchOffersFilterParams & ISearchOffersCommonParams & { kind: 'flights' };
export type ISearchStayOffersParams = ISearchStayOffersMainParams & ISearchOffersFilterParams & ISearchOffersCommonParams & { kind: 'stays' };

// Display options
export type FlightOffersDisplayOptionType = FlightOffersSortFactor;

export interface ISearchOffersCommonDisplayOptions {
  totalCount: number
}

export interface ISearchFlightOffersDisplayOption {
  type: FlightOffersDisplayOptionType,
  price?: Price,
  duration?: number, // flights duration in minutes
  isActive: boolean
}
export interface ISearchFlightOffersDisplayOptions extends ISearchOffersCommonDisplayOptions {
  primaryOptions: ISearchFlightOffersDisplayOption[],
  additionalSorting: FlightOffersDisplayOptionType
}
export interface ISearchStayOffersDisplayOptions extends ISearchOffersCommonDisplayOptions {
  sorting: StayOffersSortFactor
}

/** Components - maps */
export interface IMapControlProps {
  ctrlKey: string,
  origin: GeoPoint,
  cssClass?: string,
  webUrl?: string
}

/** Components - review editor */
export type ReviewEditorButtonType = 'bold' | 'italic' | 'strikethrough' | 'underline' | 'bulletList' | 'orderedList' | 'blockquote' | 'undo' | 'redo';

/** Components - booking ticket */
export interface IBookingTicketGeneralProps {
  ctrlKey: string,
  avatar?: IImageEntitySrc | null | undefined,
  texting?: {
    name: string,
    sub?: I18nResName | null | undefined
  },
  classResName?: I18nResName
}

export interface IBookingTicketDatesItemProps {
  ctrlKey: string,
  label?: string | undefined,
  sub?: ILocalizableValue | I18nResName | undefined
}

export interface IBookingTicketDatesProps {
  ctrlKey: string,
  from?: IBookingTicketDatesItemProps | undefined,
  to?: IBookingTicketDatesItemProps | undefined,
  offerKind?: OfferKind
}

export interface IBookingTicketDetailsItemProps {
  ctrlKey: string,
  icon: string,
  caption: I18nResName,
  text?: I18nResName | undefined
}

export interface IBookingTicketDetailsProps {
  ctrlKey: string,
  items?: IBookingTicketDetailsItemProps[]
}

export interface IBookingTicketStayTitleProps {
  ctrlKey: string,
  stayName: ILocalizableValue,
  cityName: ILocalizableValue
}

export interface IBookingTicketFlightGfxProps {
  ctrlKey: string,
  userName: string
}

export interface IBookingTicketProps {
  ctrlKey: string,
  offerKind?: OfferKind,
  generalInfo?: IBookingTicketGeneralProps | undefined,
  dates?: Omit<IBookingTicketDatesProps, 'offerKind'> | undefined,
  details?: IBookingTicketDetailsProps | undefined,
  titleOrGfx?: IBookingTicketFlightGfxProps | IBookingTicketStayTitleProps | undefined
}

export interface IClientServicesLocator extends ICommonServicesLocator {
  appMounted: boolean,
  getEntityCache(): IEntityCache
}