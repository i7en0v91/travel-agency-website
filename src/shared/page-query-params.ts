import { type TimestampSystemParamOptions, type InternalSystemParamOptions, type CacheParamsVariedByValueRanges, type CacheParamsVariedBySystemParamsOnly, type CacheByPageTimestamp, type AnyParamValue, type BoolFalse, type BoolTrue, type EmptyParamListOptions, type TripType, type CacheablePageParamsBase, type StayServiceLevel, type FlightClass } from './interfaces';
import { type RecoverPasswordCompleteResultEnum, type Theme } from './constants';

export enum HtmlPage {
  Index = 'Index',
  Account = 'Account',
  Favourites = 'Favourites',
  EmailVerifyComplete = 'EmailVerifyComplete',
  FindFlights = 'FindFlights',
  FindStays = 'FindStays',
  FlightDetails = 'FlightDetails',
  BookFlight = 'BookFlight',
  Flights = 'Flights',
  ForgotPasswordComplete = 'ForgotPasswordComplete',
  ForgotPasswordSet = 'ForgotPasswordSet',
  ForgotPasswordVerify = 'ForgotPasswordVerify',
  ForgotPassword = 'ForgotPassword',
  Login = 'Login',
  Privacy = 'Privacy',
  SignupComplete = 'SignupComplete',
  SignupVerify = 'SignupVerify',
  Signup = 'Signup',
  Stays = 'Stays',
  StayDetails = 'StayDetails',
  BookStay = 'BookStay',
  BookingDetails = 'BookingDetails'
};
export const AllHtmlPages = Object.values(HtmlPage);
export const EntityIdPages: HtmlPage[] = [HtmlPage.FlightDetails, HtmlPage.BookFlight, HtmlPage.StayDetails, HtmlPage.BookStay, HtmlPage.BookingDetails];

export const internalSystemParamOptions: InternalSystemParamOptions = { 
  i: { isRequired: false, isSystem: true, acceptableValues: ['0', '1'] }
 };
export const timestampSystemParamOptions: TimestampSystemParamOptions = { 
  t: { isRequired: true, isSystem: true, acceptableValues: 'anyValue' }
 };

// Index page
export interface IndexCacheParams extends CacheParamsVariedByValueRanges<EmptyParamListOptions> {};
// Privacy page
export interface PrivacyCacheParams extends CacheParamsVariedByValueRanges<EmptyParamListOptions> {};
// Login page
export declare type LoginPageAllowedParamsOptions = {
  callbackUrl: { isRequired: BoolFalse, isSystem: BoolFalse, acceptableValues: AnyParamValue } 
};
export const loginPageAllowedParamsOptions: LoginPageAllowedParamsOptions = {
  callbackUrl: { isRequired: false, isSystem: false, acceptableValues: 'anyValue' }
};
export interface LoginCacheParams extends CacheParamsVariedBySystemParamsOnly<LoginPageAllowedParamsOptions> {};
// Forgot password page
export interface ForgotPasswordCacheParams extends CacheParamsVariedByValueRanges<EmptyParamListOptions> {};
// Forgot password verify page
export interface ForgotPasswordVerifyCacheParams extends CacheParamsVariedByValueRanges<EmptyParamListOptions> {};
// Set password page
export declare type ForgotPasswordSetAllowedParamsOptions = {
  token_id: { isRequired: BoolFalse, isSystem: BoolFalse, acceptableValues: AnyParamValue },
  token_value: { isRequired: BoolFalse, isSystem: BoolFalse, acceptableValues: AnyParamValue }
};
export const forgotPasswordSetAllowedParamsOptions: ForgotPasswordSetAllowedParamsOptions = {
  token_id: { isRequired: false, isSystem: false, acceptableValues: 'anyValue' },
  token_value: { isRequired: false, isSystem: false, acceptableValues: 'anyValue' },
};
export interface ForgotPasswordSetCacheParams extends CacheParamsVariedBySystemParamsOnly<ForgotPasswordSetAllowedParamsOptions> {};
// Forgot password complete page
export declare type ForgotPasswordCompleteCacheParamsOptions = {
  result: { isRequired: BoolFalse, isSystem: BoolFalse, acceptableValues: (keyof typeof RecoverPasswordCompleteResultEnum)[] } 
};
export const forgotPasswordCompleteCacheParamsOptions: ForgotPasswordCompleteCacheParamsOptions = {
  result: { isRequired: false, isSystem: false, acceptableValues: ['SUCCESS', 'ALREADY_CONSUMED','LINK_INVALID', 'LINK_EXPIRED'] }
};
export interface ForgotPasswordCompleteCacheParams extends CacheParamsVariedByValueRanges<ForgotPasswordCompleteCacheParamsOptions> {};
// Sign up page
export interface SignupCacheParams extends CacheParamsVariedByValueRanges<EmptyParamListOptions> {};
// Sign up verify page
export interface SignupVerifyCacheParams extends CacheParamsVariedByValueRanges<EmptyParamListOptions> {};
// Sign up complete page
export declare type SignupCompleteAllowedParamsOptions = {
  token_id: { isRequired: BoolFalse, isSystem: BoolFalse, acceptableValues: AnyParamValue },
  token_value: { isRequired: BoolFalse, isSystem: BoolFalse, acceptableValues: AnyParamValue },
};
export const signUpCompleteAllowedParamsOptions: SignupCompleteAllowedParamsOptions = {
  token_id: { isRequired: false, isSystem: false, acceptableValues: 'anyValue' },
  token_value: { isRequired: false, isSystem: false, acceptableValues: 'anyValue' }
};
export interface SignupCompleteCacheParams extends CacheParamsVariedBySystemParamsOnly<SignupCompleteAllowedParamsOptions> {};
// Email verify complete page
export declare type EmailVerifyCompleteAllowedParamsOptions = {
  token_id: { isRequired: BoolFalse, isSystem: BoolFalse, acceptableValues: AnyParamValue },
  token_value: { isRequired: BoolFalse, isSystem: BoolFalse, acceptableValues: AnyParamValue },
};
export const emailVerifyCompleteAllowedParamsOptions: EmailVerifyCompleteAllowedParamsOptions = {
  token_id: { isRequired: false, isSystem: false, acceptableValues: 'anyValue' },
  token_value: { isRequired: false, isSystem: false, acceptableValues: 'anyValue' }
};
export interface EmailVerifyCompleteCacheParams extends CacheParamsVariedBySystemParamsOnly<EmailVerifyCompleteAllowedParamsOptions> {};
// Account page
export interface AccountCacheParams extends CacheParamsVariedByValueRanges<EmptyParamListOptions> {};
// Favourites page
export interface FavouritesCacheParams extends CacheParamsVariedByValueRanges<EmptyParamListOptions> {};
// Flights page
export declare type FlightsAllowedParamsOptions = {
  citySlug: { isRequired: BoolFalse, isSystem: BoolFalse, acceptableValues: AnyParamValue },
};
export const flightsAllowedParamsOptions: FlightsAllowedParamsOptions =  {
  citySlug: { isRequired: false, isSystem: false, acceptableValues: 'anyValue' }
};
export interface FlightsCacheParams extends CacheParamsVariedBySystemParamsOnly<FlightsAllowedParamsOptions> {};
// Stays page
export declare type StaysAllowedParamsOptions = {
  citySlug: { isRequired: BoolFalse, isSystem: BoolFalse, acceptableValues: AnyParamValue },
};
export const staysAllowedParamsOptions: StaysAllowedParamsOptions = {
  citySlug: { isRequired: false, isSystem: false, acceptableValues: 'anyValue' }
};
export interface StaysCacheParams extends CacheParamsVariedBySystemParamsOnly<StaysAllowedParamsOptions> {};
// Find flights - caching must be disabled for this page
export declare type FindFlightsAllowedParamsOptions = {
  fromCitySlug: { isRequired: BoolFalse, isSystem: BoolFalse, acceptableValues: AnyParamValue },
  toCitySlug: { isRequired: BoolFalse, isSystem: BoolFalse, acceptableValues: AnyParamValue },
  tripType: { isRequired: BoolFalse, isSystem: BoolFalse, acceptableValues: TripType[] },
  dateFrom: { isRequired: BoolFalse, isSystem: BoolFalse, acceptableValues: AnyParamValue },
  dateTo: { isRequired: BoolFalse, isSystem: BoolFalse, acceptableValues: AnyParamValue },
  numPassengers: { isRequired: BoolFalse, isSystem: BoolFalse, acceptableValues: AnyParamValue },
  class: { isRequired: BoolFalse, isSystem: BoolFalse, acceptableValues: FlightClass[] }
};
export const findFlightsAllowedParamsOptions: FindFlightsAllowedParamsOptions =  {
  fromCitySlug: { isRequired: false, isSystem: false, acceptableValues: 'anyValue' },
  toCitySlug: { isRequired: false, isSystem: false, acceptableValues: 'anyValue' },
  tripType: { isRequired: false, isSystem: false, acceptableValues: ['oneway', 'return'] },
  dateFrom: { isRequired: false, isSystem: false, acceptableValues: 'anyValue' },
  dateTo: { isRequired: false, isSystem: false, acceptableValues: 'anyValue' },
  numPassengers: { isRequired: false, isSystem: false, acceptableValues: 'anyValue' },
  class: { isRequired: false, isSystem: false, acceptableValues: ['economy', 'comfort', 'business'] }
};
export interface FindFlightsCacheParams extends CacheParamsVariedBySystemParamsOnly<FindFlightsAllowedParamsOptions> {};
// Find stays - caching must be disabled for this page
export declare type FindStaysAllowedParamsOptions = {
  citySlug: { isRequired: BoolFalse, isSystem: BoolFalse, acceptableValues: AnyParamValue },
  checkIn: { isRequired: BoolFalse, isSystem: BoolFalse, acceptableValues: AnyParamValue },
  checkOut: { isRequired: BoolFalse, isSystem: BoolFalse, acceptableValues: AnyParamValue },
  numRooms: { isRequired: BoolFalse, isSystem: BoolFalse, acceptableValues: AnyParamValue },
  numGuests: { isRequired: BoolFalse, isSystem: BoolFalse, acceptableValues: AnyParamValue }
};
export const findStaysAllowedParamsOptions: FindStaysAllowedParamsOptions = {
  citySlug: { isRequired: false, isSystem: false, acceptableValues: 'anyValue' },
  checkIn: { isRequired: false, isSystem: false, acceptableValues: 'anyValue' },
  checkOut: { isRequired: false, isSystem: false, acceptableValues: 'anyValue' },
  numRooms: { isRequired: false, isSystem: false, acceptableValues: 'anyValue' },
  numGuests: { isRequired: false, isSystem: false, acceptableValues: 'anyValue' } 
};
export interface FindStaysCacheParams extends CacheParamsVariedBySystemParamsOnly<FindStaysAllowedParamsOptions> {};
// Flight details page
export interface FlightDetailsCacheParams extends CacheByPageTimestamp<EmptyParamListOptions> {};
// Book flight page
export interface BookFlightCacheParams extends CacheByPageTimestamp<EmptyParamListOptions> {};
// Stay details page
export interface StayDetailsCacheParams extends CacheByPageTimestamp<EmptyParamListOptions> {};
// Book stay page
export declare type StayBookAllowedParamsOptions = {
  serviceLevel: { isRequired: BoolTrue, isSystem: BoolFalse, acceptableValues: StayServiceLevel[], defaultValue: StayServiceLevel }
};
const serviceLevelParamDefaultValue: StayServiceLevel = 'Base';
export const stayBookAllowedParamsOptions: StayBookAllowedParamsOptions = {
  serviceLevel: {  isRequired: true, isSystem: false, acceptableValues: ['Base', 'CityView1', 'CityView2', 'CityView3'], defaultValue: serviceLevelParamDefaultValue }
};
export interface BookStayCacheParams extends CacheByPageTimestamp<StayBookAllowedParamsOptions> {};
// Booking page
export declare type BookingDetailsAllowedParamsOptions = {
  theme: { isRequired: BoolFalse, isSystem: BoolFalse, acceptableValues: Theme[] },
  isSecondPage: { isRequired: BoolFalse, isSystem: BoolFalse, acceptableValues: ('0' | '1')[] }
};
export const bookingDetailsAllowedParamsOptions: BookingDetailsAllowedParamsOptions = {
  theme: { isRequired: false, isSystem: false, acceptableValues: ['dark', 'light'] },
  isSecondPage: { isRequired: false, isSystem: false, acceptableValues: ['0', '1'] }
};
export interface BookingCacheParams extends CacheByPageTimestamp<BookingDetailsAllowedParamsOptions> {};

declare interface ICachePageQueryMapGeneric { map: Record<keyof typeof HtmlPage, CacheablePageParamsBase> };
declare interface ICachePageQueryMapTyped extends ICachePageQueryMapGeneric {
  map: { 
    'Index': IndexCacheParams,
    'Account': AccountCacheParams,
    'Favourites': FavouritesCacheParams,
    'EmailVerifyComplete': EmailVerifyCompleteCacheParams,
    'FindFlights': FindFlightsCacheParams,
    'FindStays': FindStaysCacheParams,
    'FlightDetails': FlightDetailsCacheParams,
    'BookFlight': BookFlightCacheParams,
    'Flights': FlightsCacheParams,
    'ForgotPasswordComplete': ForgotPasswordCompleteCacheParams,
    'ForgotPasswordSet': ForgotPasswordSetCacheParams,
    'ForgotPasswordVerify': ForgotPasswordVerifyCacheParams,
    'ForgotPassword': ForgotPasswordCacheParams,
    'Login': LoginCacheParams,
    'Privacy': PrivacyCacheParams,
    'SignupComplete': SignupCompleteCacheParams,
    'SignupVerify': SignupVerifyCacheParams,
    'Signup': SignupCacheParams,
    'Stays': StaysCacheParams,
    'StayDetails': StayDetailsCacheParams,
    'BookStay': BookStayCacheParams,
    'BookingDetails': BookingCacheParams
  }
};
declare type CachePageQueryMap = ICachePageQueryMapTyped['map'];
export declare type GetHtmlPageCacheObjType<TPage extends keyof typeof HtmlPage = keyof typeof HtmlPage> =
  CachePageQueryMap extends {[P in TPage]: CacheablePageParamsBase} ? ReturnType<ICachePageQueryMapTyped['map'][TPage]['getCacheKeyObject']> : never;

const HtmlPagePaths: ReadonlyMap<HtmlPage, string> = new Map<HtmlPage, string>([
  [HtmlPage.Index ,  ''],  
  [HtmlPage.Account ,  'account'],  
  [HtmlPage.Favourites ,  'favourites'],  
  [HtmlPage.EmailVerifyComplete ,  'email-verify-complete'],  
  [HtmlPage.FindFlights ,  'find-flights'],  
  [HtmlPage.FindStays ,  'find-stays'],  
  [HtmlPage.FlightDetails ,  'flight-details'],  
  [HtmlPage.BookFlight ,  'flight-book'],  
  [HtmlPage.Flights ,  'flights'],  
  [HtmlPage.ForgotPasswordComplete ,  'forgot-password-complete'],  
  [HtmlPage.ForgotPasswordSet ,  'forgot-password-set'],  
  [HtmlPage.ForgotPasswordVerify ,  'forgot-password-verify'],  
  [HtmlPage.ForgotPassword ,  'forgot-password'],  
  [HtmlPage.Login ,  'login'],  
  [HtmlPage.Privacy ,  'privacy'],  
  [HtmlPage.SignupComplete ,  'signup-complete'],  
  [HtmlPage.SignupVerify ,  'signup-verify'],  
  [HtmlPage.Signup ,  'signup'],  
  [HtmlPage.Stays ,  'stays'],  
  [HtmlPage.StayDetails ,  'stay-details'],  
  [HtmlPage.BookStay ,  'stay-book'],  
  [HtmlPage.BookingDetails ,  'booking']
]);
export function getHtmlPagePath(page: HtmlPage): string {
  return HtmlPagePaths.get(page)!;
};