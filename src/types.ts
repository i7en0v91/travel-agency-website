import type { TripType, CacheEntityType, ICommonServicesLocator, AppPage, I18nResName, GeoPoint, Price, StayOffersSortFactor, FlightOffersSortFactor, FlightClass, OfferKind, Timestamp, ILocalizableValue, EntityId, IImageEntitySrc, GetEntityCacheItem, SystemPage } from '@golobe-demo/shared';
import type * as config from './node_modules/@nuxt/ui/dist/runtime/ui.config/index.js';
import type  { DeepPartial } from './node_modules/@nuxt/ui/dist/runtime/types/index.js';
import type { IElectronShell } from './electron/interfaces';

export type SimplePropertyType = 'text' | 'email' | 'password';
export type PropertyGridControlButtonType = 'change' | 'apply' | 'cancel' | 'delete' | 'add';

export type ConfirmBoxButton = 'yes' | 'no' | 'cancel';

export type ActivePageLink = AppPage.Flights | AppPage.Stays | AppPage.Favourites;
export type ButtonKind = 'default' | 'accent' | 'support' | 'icon';

export type FloatingVueHydrationHints = {
  tabIndex: number | undefined
};

/** Client - app state */
export interface IAppState {
  mounted: boolean,
  navigatedFromPage: AppPage | SystemPage | undefined
}

/** Client - entity cache */
export interface IEntityCache {
  set: <TEntityType extends CacheEntityType>(item: GetEntityCacheItem<TEntityType>, expireInSeconds: number | undefined) => Promise<void>,
  remove: <TEntityType extends CacheEntityType>(id: EntityId | undefined, slug: string | undefined, type: TEntityType) => Promise<void>,
  get: <TEntityType extends CacheEntityType>(ids: EntityId[], slugs: string[], type: TEntityType, fetchOnCacheMiss: false | { expireInSeconds: number | undefined }) => Promise<GetEntityCacheItem<TEntityType>[] | undefined>
}

/** Component - static image */
export interface IStaticImageUiProps {
  wrapper?: string,
  img?: string,
  stub?: string,
  overlay?: string,
  errorStub?: string
}

/** Components - accordion */
export interface IAccordionItemProps {
  labelResName: string,
  slotName: string,
  icon?: string
}

export interface IAccordionProps {
  ctrlKey: string,
  // collapseEnabled: boolean,
  // collapsed: boolean,
  // showCollapsableButton?: boolean,
  items: IAccordionItemProps[],
  persistent?: boolean,
}

/** Components - tabs */
export interface ITabProps {
  ctrlKey: string,
  enabled: boolean,
  isActive?: boolean,
  slotName?: string,
  label: {
    resName: I18nResName,
    shortIcon?: string
  } | { slotName: string },
  tabName?: string
}

export type TabGroupOtherOptions = Omit<ITabProps, 'label'> & { label: { resName: I18nResName } };

export interface ITabGroupMenuProps extends Omit<ITabProps, 'isActive' | 'label' | 'ctrlKey' | 'tabName'> {
  defaultResName: I18nResName,
  selectedResName: I18nResName,
  variants: TabGroupOtherOptions[]
}

export interface ITabGroupProps {
  ctrlKey: string,
  tabs: ITabProps[],
  menu?: ITabGroupMenuProps,
  activeTabKey?: string,
  variant?: 'solid' | 'split',
  ui?: DeepPartial<typeof config['tabs']>
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
  defaultValue?: DropdownListValue,
  placeholderResName?: I18nResName,
  items: IDropdownListItemProps[],
  variant?: 'default' | 'none',
  ui?: {
    wrapper?: string,
    input?: string
  }
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
export type SearchListItemType = 'destination';
export interface ISearchListItem {
  id: EntityId,
  slug?: string,
  displayName: ILocalizableValue | string
}

/** Components - search offers */

// Filters
export type FilterType = 'range' | 'checklist' | 'choice';
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
  variants: ISearchOffersFilterVariant[],
  applyNarrowing: (variants: ISearchOffersFilterVariant[]) => void
}

export interface ISearchOffersChoiceFilterProps extends ISearchOffersFilterProps<SearchOffersFilterVariantId> {
  type: 'choice',
  variants: ISearchOffersFilterVariant[],
  applyNarrowing: (variants: ISearchOffersFilterVariant[]) => void
}

export interface ISearchOffersCommonParams {
  kind: OfferKind
}

export interface ISearchOffersFilterParams {
  filters: (ISearchOffersRangeFilterProps | ISearchOffersChecklistFilterProps | ISearchOffersChoiceFilterProps)[]
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
  styleClass?: string,
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
  label?: string,
  sub?: ILocalizableValue | I18nResName
}

export interface IBookingTicketDatesProps {
  ctrlKey: string,
  from?: IBookingTicketDatesItemProps,
  to?: IBookingTicketDatesItemProps,
  offerKind?: OfferKind
}

export interface IBookingTicketDetailsItemProps {
  ctrlKey: string,
  icon: string,
  caption: I18nResName,
  text?: I18nResName
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
  generalInfo?: IBookingTicketGeneralProps,
  dates?: Omit<IBookingTicketDatesProps, 'offerKind'>,
  details?: IBookingTicketDetailsProps,
  titleOrGfx?: IBookingTicketFlightGfxProps | IBookingTicketStayTitleProps
}

export interface IClientServicesLocator extends ICommonServicesLocator {
  state: IAppState,
  getEntityCache(): IEntityCache,
  getElectronShell(): IElectronShell
}