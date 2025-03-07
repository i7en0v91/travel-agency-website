import type { ControlKey as ControlKeyGeneral, AppPage, SystemPage, OfferKind, FlightOffersSortFactor, StayOffersSortFactor } from '@golobe-demo/shared';
import { toShortForm as toShortFormGeneral, areCtrlKeysEqual as areCtrlKeysEqualGeneral }from '@golobe-demo/shared';
import type { SearchStaysOptionButtonKind } from './constants';
import type { PropertyGridControlButtonType } from './../types';


export const IconSvgCustomizers = {
  fill(color: string) {
    return (content: string) => content.replace(/fill="[^"]*"/gi,  `fill="${color}"`);
  },
  /**
   * @param value from 0.0 to 1.0
   */
  opacity(value: number) {
    return (content: string) => content.replace(/fill="/gi,  ` opacity="${value.toFixed(2)}" fill="`);
  }
};

export type CommonControls = 
  'Btn' |
  'SearchList' |
  'Dropdown' |
  'Counter' |
  'DatePicker' |
  'DateRangePicker' |
  'TabGroup' |
  'Tab' |
  'Accordion';

type KnownControlElements = 
  CommonControls |
  'Page' |
  keyof typeof AppPage | keyof typeof SystemPage |
  'Waiter' |
  'ClientFallback' |
  'StaticImg' | 
  'Card' |
  'Wrapper' |
  'TextBox' |
  'Checkbox' |
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
  'FilterSection' |
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
  'NavFooter' |
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
  'MdcContentSection' |
  'LetsGoPlaces' |
  'ConfirmPassword' |
  'Submit' |
  'OauthProviders' |
  'PerfectTrip' |
  'PopularCity' |
  'ImageLink' |
  'CompanyReviews' |
  'CompanyReview' |
  'AgreeToPolicies' |
  'RecentSearches' |
  'Layout' |
  'NavBar' |
  'CookieBanner' |
  'SiteSearchTool' |
  'SiteSearch' |
  'CityOffers' |
  'CityOffersLinks' |
  'StayParams';
export type ArbitraryControlElementMarker = KnownControlElements;

type ControlKeyPart = KnownControlElements | number;
export type ControlKey = ControlKeyGeneral<ControlKeyPart>;

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