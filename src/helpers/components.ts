import type { ControlKey as ControlKeyGeneral, FilterId, AppPage, SystemPage, OfferKind, FlightOffersSortFactor, StayOffersSortFactor } from '@golobe-demo/shared';
import { toShortForm as toShortFormGeneral, areCtrlKeysEqual as areCtrlKeysEqualGeneral }from '@golobe-demo/shared';
import type { SearchStaysOptionButtonKind } from './constants';
import type { PropertyGridControlButtonType, SearchOffersFilterRange, SearchOffersFilterVariantId, ISearchOffersFilterVariant } from './../types';

export type CommonControls = 
  'Btn' |
  'SearchList' |
  'Dropdown' |
  'Counter' |
  'DatePicker' |
  'DateRangePicker' |
  'OptionBtnGroup' |
  'Option' |
  'CollapsableSection' |
  'RangeFilter' |
  'ChecklistFilter';

type KnownControlElements = 
  CommonControls |
  'FunctionalElement' |
  'Page' |
  keyof typeof AppPage | keyof typeof SystemPage |
  'Waiter' |
  'ClientFallback' |
  'StaticImg' | 
  'Card' |
  'Wrapper' |
  'TextBox' |
  'Checkbox' |
  'Tab' |
  'Input' |
  'ConfirmBox' |
  'Captcha' |
  'Oauth' |
  'Yes' |
  'No' |
  'From' | 
  'To' |
  'Total' |
  'Close' |
  'Search' |
  'Toggler' |
  'Avatar' |
  'General' |
  'Details' |
  'ResultItemsList' |
  Capitalize<OfferKind> |
  /** specific elements */
  'Dates' |
  'SearchOffers' |
  'FlightOffers' |
  'StayOffers' |
  'SecondarySort' |
  'OtherOptions' |
  Capitalize<FlightOffersSortFactor> |
  Capitalize<StayOffersSortFactor> |
  'AuthPhoto' |
  'Google' |
  'GitHub' |
  'TestLocal' |
  'Payments' | 
  'PricingDetails' | 
  'Codes' |
  'InteractiveMap' |
  'YandexMap' |
  'FilterPanel' | 
  'DisplayOptions' |
  'ListPaging' |
  'FilterVariant' |
  'Filter' |
  'Apply' |
  'Reset' |
  'Paging' |
  SearchStaysOptionButtonKind |
  'CompanyLogo' |
  'Like' |
  'StayPhoto' | 
  'TripType' |
  'FlightParams' |
  'NumPassengers' |
  'FlightClass' |
  'Decrement' |
  'Increment' |
  'PromoCode' |
  'Rooms' |
  'Guests' |
  'Destination' |
  'CheckIn' |
  'CheckOut' |
  'TravelCities' |
  'TravelDetails' |
  'Texting' |
  'City' |
  'Download' |
  'Share' |
  'WorldMap' |
  'CityLabel' |
  'SubscribeBox' |
  'Footer' |
  'SocialLink' | 
  'Twitter' |
  'YouTube' |
  'DestinationLink' |
  'ActivitiesLink' |
  'TravelBlogs' |
  'About' |
  'PropGrid' |
  'PropEdit' |
  'ControlSection' |
  'Row' |
  Capitalize<PropertyGridControlButtonType> |
  'Upload' |
  'CroppingBox' |
  'SearchPageLinks' |
  'NavLogo' |
  'NavLink' |
  'Favourites' |
  'Locale' |
  'Theme' |
  'NavUser' |
  'UserMenu' |
  'Login' |
  'SignUp' |
  'Account' |
  'Settings' |
  'Support' |
  'Logout' |
  'AccountOptionButtonsGroup' |
  'FavouritesOptionButtonGroup' |
  'TabHistoryOptBtnGrp' |
  'History' |
  'Email' |
  'PaymentMethod' |
  'CardPicker' |
  'Pay' |
  'MoreInfo' |
  'ReviewEditorBtn' |
  'Send' |
  'ScorePicker' |
  'ReviewItem' |
  'UserReview' |
  'Prev' |
  'Next' |
  'ReviewEditor' |
  'FirstName' |
  'LastName' |
  'Password' |
  'Email' |
  'TimeRangeFilter' |
  'OfferTabView' |
  'Gate' |
  'Seat' |
  'CheckInTime' |
  'CheckOutTime' |
  'Room' |
  'EditableImg' |
  'Accept' |
  'DocumentDownloader' |
  'ReturnFlight' |
  'Ticket' |
  'Breadcrumbs' |
  'TermsOfUse' |
  'DepartFlight' |
  'ArriveFlight' |
  'Airplane' |
  'OfferBooking' |
  'StayDetailsSection' |
  'Overview' |
  'Location' |
  'Amenities' |
  'Reviews' |
  'UserCover' |
  'PageContent' |
  'AccountFormPhotos' |
  'ListView' |
  'SearchPageHead' |
  'Title' |
  'PageSection' |
  'LetsGoPlaces' |
  'ConfirmPassword' |
  'Submit' |
  'OauthProviders' |
  'PerfectTrip' |
  'PopularCity' |
  'ImageLink' |
  'CompanyReview' |
  'AgreeToPolicies' |
  'RecentSearches' |
  'Layout' |
  'NavBar' |
  'CookieBanner';
export type ArbitraryControlElementMarker = KnownControlElements;

type ControlKeyPart = KnownControlElements | number;
export type ControlKey = ControlKeyGeneral<ControlKeyPart>;

export const RESET_TO_DEFAULT = Symbol.for('control-value-reset');

export function toShortForm(key: ControlKey): string {
  return toShortFormGeneral(key);
}

export function areCtrlKeysEqual(key1: ControlKey, key2: ControlKey): boolean {
  return areCtrlKeysEqualGeneral(key1, key2);
}

export function toKnownElement(value: 
  OfferKind | FlightOffersSortFactor | StayOffersSortFactor | SearchStaysOptionButtonKind | PropertyGridControlButtonType
): KnownControlElements {
  switch(value) {
    case 'flights':
      return 'Flights';
    case 'stays':
      return 'Stays';
    case 'duration':
      return 'Duration';
    case 'price':
      return 'Price';
    case 'rating':
      return 'Rating';
    case 'score':
      return 'Score';
    case 'timetodeparture':
      return 'Timetodeparture';
    case 'add':
      return 'Add';
    case 'apply':
      return 'Apply';
    case 'cancel':
      return 'Cancel';
    case 'change':
      return 'Change';
    case 'delete':
      return 'Delete';
    default:
      return value;
  }
}

export function isCommonControl(testKey: ControlKey, controlType: CommonControls) {
  return testKey.findLast(v => typeof v === 'string') === controlType;
}

export function isSpecificControl(testKey: ControlKey, specificControl: ControlKey) {
 if(testKey.length < specificControl.length) {
  return false;
 }

 const keyLengthDiff = testKey.length - specificControl.length;
 return specificControl.every((kp, idx) => kp === testKey[keyLengthDiff + idx]);
}

export function isNestedControl(testKey: ControlKey, containingControl: ControlKey) {
  if(testKey.length < containingControl.length) {
    return false;
   }
  
   return containingControl.every((kp, idx) => kp === testKey[idx]);
}

type FunctionalElementProps = {
  sortOption: SearchStaysOptionButtonKind | FlightOffersSortFactor | StayOffersSortFactor,
  isPrimary: boolean
} | {
  filterId: FilterId
};
/** 
 * Returns {@link ControlKey} for functional controls - i.e. elements with 
 * complex client-side behavior, whose state and logic are grouped and extracted 
 * into stores
 */
export function getFunctionalElementKey(elementProps: FunctionalElementProps): ControlKey {
  if('filterId' in elementProps) {
    const { filterId } = elementProps;
    let isRangeFilter = false;
    switch(filterId) {
      case 'DepartureTime':
      case 'FlightPrice':
      case 'StayPrice':
        isRangeFilter = true;
        break;
    }
    return [
      'FilterPanel', 
      'FunctionalElement',
      'Filter', 
      filterId as ArbitraryControlElementMarker, 
      isRangeFilter ? 'RangeFilter' : 'ChecklistFilter'
    ];
  } else {
    const { isPrimary, sortOption } = elementProps;
    return [
      isPrimary ? 'DisplayOptions' : 'SecondarySort', 
      'FunctionalElement', 
      toKnownElement(sortOption), 
      isPrimary ? 'Option' : 'Dropdown'];
  }
}

/**
 * Inverse to @see getFunctionalElementKey
 */
export function getFunctionalElementProps(ctrlKey: ControlKey): FunctionalElementProps {
  if(ctrlKey.length <= 2) {
    throw new Error('invalid functional element key');
  }
  
  if(isNestedControl(ctrlKey, ['FilterPanel', 'FunctionalElement'])) {
    const filterId = ctrlKey[ctrlKey.length - 2] as FilterId;
    return { filterId };
  } else if(
    isNestedControl(ctrlKey, ['DisplayOptions', 'FunctionalElement']) ||
    isNestedControl(ctrlKey, ['SecondarySort', 'FunctionalElement'])
  ) {
    return { 
      sortOption: ctrlKey[ctrlKey.length - 2] as SearchStaysOptionButtonKind | FlightOffersSortFactor | StayOffersSortFactor,
      isPrimary: isNestedControl(ctrlKey, ['DisplayOptions', 'FunctionalElement'])
     };
  } else {
    throw new Error('unexpected functional element key');
  }
}

export function computeNarrowedVariantList(
  currentVariants: ISearchOffersFilterVariant[] | undefined, 
  newVariants: ISearchOffersFilterVariant[]
): ISearchOffersFilterVariant[] {
  if(!(currentVariants?.length ?? 0)) {
    return newVariants;
  }
  const valueSet = new Set<SearchOffersFilterVariantId>(currentVariants!.map(v => v.id));
  return newVariants.filter(v => valueSet.has(v.id));
};

export function computeNarrowedRange(
  currentRange: SearchOffersFilterRange | undefined, 
  newRange: SearchOffersFilterRange, 
  limits: SearchOffersFilterRange
): SearchOffersFilterRange {
  if(!currentRange) {
    return newRange;
  }

  let result: SearchOffersFilterRange;
  if (currentRange.min > newRange.max || currentRange.max < newRange.min) {
    result = newRange;
  } else {
    const sortedEdgeValues = [newRange.min, newRange.max, currentRange.min, currentRange.max];
    sortedEdgeValues.sort((a, b) => a - b);
    result = { min: sortedEdgeValues[1], max: sortedEdgeValues[2] };
  }
  if (Math.abs(result.min - result.max) < 0.01) {
    result.min = Math.max(limits.min, result.min - 1);
    result.max = Math.min(limits.max, result.max + 1);
  }

  return result;
};