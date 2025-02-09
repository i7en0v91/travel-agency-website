import { PreviewModeParamEnabledValue, type RecoverPasswordCompleteResultEnum, type BookStayPageArgs, type BookingPageArgs, type TripType, type StayServiceLevel, type FlightClass, type AppPage, type Theme } from '@golobe-demo/shared';
import type { PreviewSystemParamOptions, TimestampSystemParamOptions, InternalSystemParamOptions, CacheParamsVariedByValueRanges, CacheParamsVariedBySystemParamsOnly, CacheByPageTimestamp, AnyParamValue, BoolFalse, BoolTrue, EmptyParamListOptions, CacheablePageParamsBase } from './types';

export const internalSystemParamOptions: InternalSystemParamOptions = { 
  i: { isRequired: false, isSystem: true, acceptableValues: ['0', '1'] }
 };
export const timestampSystemParamOptions: TimestampSystemParamOptions = { 
  t: { isRequired: true, isSystem: true, acceptableValues: 'anyValue' }
 };
export const previewSystemParamOptions: PreviewSystemParamOptions = { 
  drafts: { isRequired: false, isSystem: true, acceptableValues: [PreviewModeParamEnabledValue, 'false'] }
};

// Index page
export type IndexCacheParams = CacheParamsVariedByValueRanges<EmptyParamListOptions>;
// Privacy page
export type PrivacyCacheParams = CacheParamsVariedByValueRanges<EmptyParamListOptions>;
// Login page
export declare type LoginPageAllowedParamsOptions = {
  originPath: { isRequired: BoolFalse, isSystem: BoolFalse, acceptableValues: AnyParamValue },
  callbackUrl: { isRequired: BoolFalse, isSystem: BoolFalse, acceptableValues: AnyParamValue },  
  error: { isRequired: BoolFalse, isSystem: BoolFalse, acceptableValues: AnyParamValue }
};
export const loginPageAllowedParamsOptions: LoginPageAllowedParamsOptions = {
  originPath: { isRequired: false, isSystem: false, acceptableValues: 'anyValue' },
  callbackUrl: { isRequired: false, isSystem: false, acceptableValues: 'anyValue' },
  error: { isRequired: false, isSystem: false, acceptableValues: 'anyValue' }
};
export type LoginCacheParams = CacheParamsVariedBySystemParamsOnly<LoginPageAllowedParamsOptions>;
// Forgot password page
export type ForgotPasswordCacheParams = CacheParamsVariedByValueRanges<EmptyParamListOptions>;
// Forgot password verify page
export type ForgotPasswordVerifyCacheParams = CacheParamsVariedByValueRanges<EmptyParamListOptions>;
// Set password page
export declare type ForgotPasswordSetAllowedParamsOptions = {
  token_id: { isRequired: BoolFalse, isSystem: BoolFalse, acceptableValues: AnyParamValue },
  token_value: { isRequired: BoolFalse, isSystem: BoolFalse, acceptableValues: AnyParamValue }
};
export const forgotPasswordSetAllowedParamsOptions: ForgotPasswordSetAllowedParamsOptions = {
  token_id: { isRequired: false, isSystem: false, acceptableValues: 'anyValue' },
  token_value: { isRequired: false, isSystem: false, acceptableValues: 'anyValue' },
};
export type ForgotPasswordSetCacheParams = CacheParamsVariedBySystemParamsOnly<ForgotPasswordSetAllowedParamsOptions>;
// Forgot password complete page
export declare type ForgotPasswordCompleteCacheParamsOptions = {
  result: { isRequired: BoolFalse, isSystem: BoolFalse, acceptableValues: (keyof typeof RecoverPasswordCompleteResultEnum)[] } 
};
export const forgotPasswordCompleteCacheParamsOptions: ForgotPasswordCompleteCacheParamsOptions = {
  result: { isRequired: false, isSystem: false, acceptableValues: ['SUCCESS', 'ALREADY_CONSUMED','LINK_INVALID', 'LINK_EXPIRED'] }
};
export type ForgotPasswordCompleteCacheParams = CacheParamsVariedByValueRanges<ForgotPasswordCompleteCacheParamsOptions>;
// Sign up page
export type SignupCacheParams = CacheParamsVariedByValueRanges<EmptyParamListOptions>;
// Sign up verify page
export type SignupVerifyCacheParams = CacheParamsVariedByValueRanges<EmptyParamListOptions>;
// Sign up complete page
export declare type SignupCompleteAllowedParamsOptions = {
  token_id: { isRequired: BoolFalse, isSystem: BoolFalse, acceptableValues: AnyParamValue },
  token_value: { isRequired: BoolFalse, isSystem: BoolFalse, acceptableValues: AnyParamValue },
};
export const signUpCompleteAllowedParamsOptions: SignupCompleteAllowedParamsOptions = {
  token_id: { isRequired: false, isSystem: false, acceptableValues: 'anyValue' },
  token_value: { isRequired: false, isSystem: false, acceptableValues: 'anyValue' }
};
export type SignupCompleteCacheParams = CacheParamsVariedBySystemParamsOnly<SignupCompleteAllowedParamsOptions>;
// Email verify complete page
export declare type EmailVerifyCompleteAllowedParamsOptions = {
  token_id: { isRequired: BoolFalse, isSystem: BoolFalse, acceptableValues: AnyParamValue },
  token_value: { isRequired: BoolFalse, isSystem: BoolFalse, acceptableValues: AnyParamValue },
};
export const emailVerifyCompleteAllowedParamsOptions: EmailVerifyCompleteAllowedParamsOptions = {
  token_id: { isRequired: false, isSystem: false, acceptableValues: 'anyValue' },
  token_value: { isRequired: false, isSystem: false, acceptableValues: 'anyValue' }
};
export type EmailVerifyCompleteCacheParams = CacheParamsVariedBySystemParamsOnly<EmailVerifyCompleteAllowedParamsOptions>;
// Account page
export type AccountCacheParams = CacheParamsVariedByValueRanges<EmptyParamListOptions>;
// Favourites page
export type FavouritesCacheParams = CacheParamsVariedByValueRanges<EmptyParamListOptions>;
// Flights page
export declare type FlightsAllowedParamsOptions = {
  citySlug: { isRequired: BoolFalse, isSystem: BoolFalse, acceptableValues: AnyParamValue },
};
export const flightsAllowedParamsOptions: FlightsAllowedParamsOptions =  {
  citySlug: { isRequired: false, isSystem: false, acceptableValues: 'anyValue' }
};
export type FlightsCacheParams = CacheParamsVariedBySystemParamsOnly<FlightsAllowedParamsOptions>;
// Stays page
export declare type StaysAllowedParamsOptions = {
  citySlug: { isRequired: BoolFalse, isSystem: BoolFalse, acceptableValues: AnyParamValue },
};
export const staysAllowedParamsOptions: StaysAllowedParamsOptions = {
  citySlug: { isRequired: false, isSystem: false, acceptableValues: 'anyValue' }
};
export type StaysCacheParams = CacheParamsVariedBySystemParamsOnly<StaysAllowedParamsOptions>;
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
export type FindFlightsCacheParams = CacheParamsVariedBySystemParamsOnly<FindFlightsAllowedParamsOptions>;
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
export type FindStaysCacheParams = CacheParamsVariedBySystemParamsOnly<FindStaysAllowedParamsOptions>;
// Flight details page
export type FlightDetailsCacheParams = CacheByPageTimestamp<EmptyParamListOptions>;
// Book flight page
export type BookFlightCacheParams = CacheByPageTimestamp<EmptyParamListOptions>;
// Stay details page
export type StayDetailsCacheParams = CacheByPageTimestamp<EmptyParamListOptions>;
// Book stay page
export declare type StayBookAllowedParamsOptions = {
  serviceLevel: { isRequired: BoolTrue, isSystem: BoolFalse, acceptableValues: StayServiceLevel[], defaultValue: StayServiceLevel }
};
const serviceLevelParamDefaultValue: StayServiceLevel = 'Base';
export const stayBookAllowedParamsOptions: StayBookAllowedParamsOptions = {
  serviceLevel: {  isRequired: true, isSystem: false, acceptableValues: ['Base', 'CityView1', 'CityView2', 'CityView3'], defaultValue: serviceLevelParamDefaultValue }
};
export type BookStayCacheParams = 
  /* ensure [shared] package type definition matches [backend] variant*/
  CacheByPageTimestamp<StayBookAllowedParamsOptions> extends BookStayPageArgs ? 
  CacheByPageTimestamp<StayBookAllowedParamsOptions> : 
  never;

// Booking page
export declare type BookingDetailsAllowedParamsOptions = {
  theme: { isRequired: BoolFalse, isSystem: BoolFalse, acceptableValues: Theme[] },
  isSecondPage: { isRequired: BoolFalse, isSystem: BoolFalse, acceptableValues: ('0' | '1')[] }
};
export const bookingDetailsAllowedParamsOptions: BookingDetailsAllowedParamsOptions = {
  theme: { isRequired: false, isSystem: false, acceptableValues: ['dark', 'light'] },
  isSecondPage: { isRequired: false, isSystem: false, acceptableValues: ['0', '1'] }
};
export type BookingCacheParams = 
  /* ensure [shared] package type definition matches [backend] variant*/
  CacheByPageTimestamp<BookingDetailsAllowedParamsOptions> extends BookingPageArgs ? 
    (CacheByPageTimestamp<BookingDetailsAllowedParamsOptions>) : 
    never;

declare interface ICachePageQueryMapGeneric { map: Record<keyof typeof AppPage, CacheablePageParamsBase> };
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
export declare type GetHtmlPageCacheObjType<TPage extends keyof typeof AppPage = keyof typeof AppPage> =
  CachePageQueryMap extends {[P in TPage]: CacheablePageParamsBase} ? ReturnType<ICachePageQueryMapTyped['map'][TPage]['getCacheKeyObject']> : never;