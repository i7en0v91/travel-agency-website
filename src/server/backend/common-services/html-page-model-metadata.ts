import type { EntityModel } from './change-dependency-tracker';
import { type AppPage, type ParseQueryCacheResult, type GetCachePageParamListObj, type GetParamsOptionsResult, type NormalizedQueryResult, type GetParamsOptionsKind, type PageCacheVaryOptions, type CacheParamsVariedByValueRanges, type CacheParamsVariedBySystemParamsOnly, type CacheByPageTimestamp, type EmptyParamListOptions, type CachePageParamOptions, type IAppLogger, type CacheablePageParamsBase, type GetCachePageParamsVaryMode, bookingDetailsAllowedParamsOptions, emailVerifyCompleteAllowedParamsOptions, findFlightsAllowedParamsOptions, findStaysAllowedParamsOptions, flightsAllowedParamsOptions, forgotPasswordCompleteCacheParamsOptions, forgotPasswordSetAllowedParamsOptions, previewSystemParamOptions, internalSystemParamOptions, loginPageAllowedParamsOptions, signUpCompleteAllowedParamsOptions, stayBookAllowedParamsOptions, staysAllowedParamsOptions, timestampSystemParamOptions, type AccountCacheParams, type BookFlightCacheParams, type BookStayCacheParams, type BookingCacheParams, type BookingDetailsAllowedParamsOptions, type EmailVerifyCompleteAllowedParamsOptions, type EmailVerifyCompleteCacheParams, type FavouritesCacheParams, type FindFlightsAllowedParamsOptions, type FindFlightsCacheParams, type FindStaysAllowedParamsOptions, type FindStaysCacheParams, type FlightDetailsCacheParams, type FlightsAllowedParamsOptions, type FlightsCacheParams, type ForgotPasswordCacheParams, type ForgotPasswordCompleteCacheParams, type ForgotPasswordCompleteCacheParamsOptions, type ForgotPasswordSetAllowedParamsOptions, type ForgotPasswordSetCacheParams, type ForgotPasswordVerifyCacheParams, type GetHtmlPageCacheObjType, type IndexCacheParams, type LoginCacheParams, type LoginPageAllowedParamsOptions, type ParseQueryCacheError, type ParseQueryCacheRedundantParam, type ParseQueryCacheRequiredParamMissed, type ParseQueryCacheSuccess, type ParseQueryCacheValueNotAllowed, type PrivacyCacheParams, type SignupCacheParams, type SignupCompleteAllowedParamsOptions, type SignupCompleteCacheParams, type SignupVerifyCacheParams, type StayBookAllowedParamsOptions, type StayDetailsCacheParams, type StaysAllowedParamsOptions, type StaysCacheParams, type SystemQueryParamsListOptions } from '../app-facade/interfaces';
import { AppException, AppExceptionCodeEnum } from '../app-facade/implementation';

import { parseURL, parseQuery } from 'ufo';
import set from 'lodash-es/set';
import pick from 'lodash-es/pick';
import keys from 'lodash-es/keys';
import toPairs from 'lodash-es/toPairs';
import isArray from 'lodash-es/isArray';
import clone from 'lodash-es/clone';
import fromPairs from 'lodash-es/fromPairs';
import uniq from 'lodash-es/uniq';

declare type ParseCacheQueryParamsArgs = string;
// KB: additional cache invalidation is needed for timestamped page to refresh
declare type TimestampedPageParamListOptions = SystemQueryParamsListOptions<'VaryByIdAndSystemParamsOnly'>;
const timestampedPageParamListOptions: TimestampedPageParamListOptions = { ...internalSystemParamOptions, ...previewSystemParamOptions };
declare type TimestampedPageCacheObjType = GetCachePageParamListObj<TimestampedPageParamListOptions>[];

export interface HtmlPageModel<
    TPage extends keyof typeof AppPage = keyof typeof AppPage,
    TCacheQuery extends CacheablePageParamsBase = CacheablePageParamsBase
> {
  page: TPage,
  /** 
   * Model entity, which is displayed on this page as indified by [id] route parameter.
   * Changes in any idenfified entity in references graph, originating from this model entity,
   * will result in html render cache invalidation for this page with particular ID. 
   * E.g. adding description text or uploading another image for hotel will result 
   * into cache invalidation for this hotel's page
   * */
  identity?: EntityModel | undefined, 
  /** 
   * Any other non ID-reference-related model entities which are displayed on this page.
   * Changes in any entity of those types will result in html render cache invalidation for this page.
   * E.g. list of feedback reviews on main page. If text of any review changes, main page will be marked for re-rendering
   */
  associatedWith?: EntityModel[] | undefined,
  getCacheVaryOptions: () => GetCachePageParamsVaryMode<TCacheQuery>,
  parseCacheQueryParams: (url: ParseCacheQueryParamsArgs) => ParseQueryCacheResult<TCacheQuery>,
  getAllCachingQueryVariants: () => GetCachePageParamsVaryMode<TCacheQuery> extends 'UseEntityChangeTimestamp' ? TimestampedPageCacheObjType :  GetHtmlPageCacheObjType<TPage>[]
};

/** 
 * Information about displayed & related entities on pages ({@link AppPage})
 */
export interface IHtmlPageModelMetadata {
  getMetadata(page: keyof typeof AppPage): HtmlPageModel<typeof page>;
}

export class HtmlPageModelMetadata implements IHtmlPageModelMetadata {
  private readonly logger: IAppLogger;
  
  public static inject = ['logger'] as const;
  constructor (logger: IAppLogger) {
    this.logger = logger;
  }

  
  private cartesianParams = (...params: { name: string, values: any[] }[]): any[] => {
    const result: any[] = [];
    const nonEmptyParams = params.filter(p => (p.values?.length ?? 0) > 0);
    return nonEmptyParams.reduce((prev, current) => {
      if(prev.length === 0) {
        return current.values.map(v => fromPairs([[current.name, v]]));
      }
      const reduceResult: any[] = [];
      for(let p = 0; p < current.values.length; p++) {
        for(let i = 0; i < prev.length; i++) {
          reduceResult.push(set(clone(prev[i]), current.name, current.values[p]));
        }
      }
      return reduceResult;
    }, result);
  };

  private createCachingQueryVariants = <TCacheableParamOptions extends Record<any, CachePageParamOptions>>(cacheableParamOptions: TCacheableParamOptions): GetCachePageParamListObj<TCacheableParamOptions>[] => {
    this.logger.debug(`(HtmlPageModelMetadata) creating caching query variants, params=${JSON.stringify(cacheableParamOptions)}`);

    const params = toPairs(cacheableParamOptions);
    const variedParams: { name: string, values: any[] }[] = [];
    for(let i = 0; i < params.length; i++) {
      const paramName = params[i][0];
      const paramOptions = params[i][1];
      if(!isArray(paramOptions.acceptableValues)) {
        this.logger.error(`(HtmlPageModelMetadata) cannot create caching query variants, expected query parameter to have an array type with limited number of possible values, paramName=${paramName}`);
        throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'internal server error', 'error-page');
      }
      variedParams.push({
        name: paramName,
        values: !paramOptions.isRequired && !paramOptions.acceptableValues.some(v => !v) ? [...paramOptions.acceptableValues, null] : paramOptions.acceptableValues
      });
    }
    const result = this.cartesianParams(...variedParams);

    this.logger.debug(`(HtmlPageModelMetadata) caching query variants created, params=${JSON.stringify(cacheableParamOptions)}, count=${result.length}, variants=[${result.map((x: any) => JSON.stringify(x)).join('; ')}]`);
    return result;
  };

  private parseAndValidateQueryWithVariantValues = <
    TVaryMode extends PageCacheVaryOptions, 
    TAddAllowedParamsOptions extends Record<any, CachePageParamOptions>,
    TCacheParamsOptions extends Record<any, CachePageParamOptions>
  >(url: ParseCacheQueryParamsArgs,
    allowedParamsOptions: TAddAllowedParamsOptions,
    cacheParamsOptions: TCacheParamsOptions
  ): ({ success: false, error: ParseQueryCacheError } | { success: true, query: NormalizedQueryResult<TVaryMode, TAddAllowedParamsOptions, TCacheParamsOptions> }) => {
    this.logger.debug(`(HtmlPageModelMetadata) parsing variant-values query: url=${url}`);
    const allowedParamNames = allowedParamsOptions ? keys(allowedParamsOptions) : [];
    const cacheParamNames = cacheParamsOptions ? keys(cacheParamsOptions) : [];
    const allPageParamNames = [ ...allowedParamNames, ...cacheParamNames ];
    const query = parseQuery(parseURL(url).search);
    const queryParamNames = keys(query);

    // check all values fit into allowed variants range
    const filteredQuery = allPageParamNames.length ? pick(parseQuery(parseURL(url).search), allPageParamNames) : {};
    const queryParamTuples = toPairs(filteredQuery);
    for(let i = 0; i < queryParamTuples.length; i++) {
      const paramTuple = queryParamTuples[i];
      const paramName = paramTuple[0];
      const paramValue = paramTuple[1];
      if(isArray(paramValue)) {
        this.logger.info(`(HtmlPageModelMetadata) got issues while parsing variant-values query because of array param value (not supported): url=${url}, invalid paramName=[${paramName}], paramValue=[${paramValue.join('; ')}]]`);
        const result = {
          success: false as const,
          error: {
            paramName, 
            invalidValue: `[${paramValue.join('; ')}]`,
            result: 'VALUE_NOT_ALLOWED'
          } as ParseQueryCacheValueNotAllowed
        };
        return result;
      };
      const paramOptions = cacheParamsOptions[paramName] ?? allowedParamsOptions[paramName];
      if(paramValue && (paramOptions.acceptableValues !== 'anyValue' && !paramOptions.acceptableValues.includes(paramValue))) {
        this.logger.info(`(HtmlPageModelMetadata) got issues while parsing variant-values query because of invalid param value: url=${url}, invalid paramName=[${paramName}], paramValue=[${paramValue}], allowedValues=[${paramOptions.acceptableValues.join('; ')}]`);
        const result = {
          success: false as const,
          error: {
            paramName, 
            invalidValue: paramValue,
            result: 'VALUE_NOT_ALLOWED'
          } as ParseQueryCacheValueNotAllowed
        };
        return result;
      }
    }

    // check for redundant parameters
    const redundantParamNames = queryParamNames.filter(p => !allPageParamNames.includes(p));
    if(redundantParamNames.length > 0) {
      this.logger.info(`(HtmlPageModelMetadata) got variant-values query parsing issues because of redundant params: url=${url}, redundant param names=[${redundantParamNames.join('; ')}]`);
      const result = {
        success: false as const,
        error: {
          redundantParamNames,
          result: 'REDUNDANT_PARAM'
        } as ParseQueryCacheRedundantParam
      };
      return result;
    }

    // check all required parameters present
    // KB: this check goes last so that in case timestamp parameter is missed user will be redirected only after all other checks are made
    const requiredParamNames = uniq([
      ...toPairs(allowedParamsOptions).filter(p => p[1].isRequired).map(p => p[0]), 
      ...toPairs(cacheParamsOptions).filter(p => p[1].isRequired).map(p => p[0])
    ]);
    const missedParamNames = requiredParamNames.filter(p => !queryParamNames.includes(p));
    if(missedParamNames.length > 0) {
      this.logger.verbose(`(HtmlPageModelMetadata) parsing variant-values query detected missed required params: url=${url}, missed param names=[${missedParamNames.join('; ')}]`);
      const allOptions = {
        ...allowedParamsOptions,
        ...cacheParamsOptions,
        ...internalSystemParamOptions,
        ...timestampSystemParamOptions,
        ...previewSystemParamOptions
      };
      const providedDefaults = new Map<string, string>(
        missedParamNames
          .filter(p => allOptions[p].defaultValue)
          .map(p => [p, allOptions[p].defaultValue!])
        );
      const result = {
        success: false as const,
        error: {
          missedParamNames,
          providedDefaults,
          result: 'REQUIRED_PARAM_MISSED'
        } as ParseQueryCacheRequiredParamMissed
      };
      return result;
    }

    this.logger.debug(`(HtmlPageModelMetadata) variant-values query parsed: url=${url}, result=[${JSON.stringify(query)}]`);
    return {
      success: true as const,
      query: query as NormalizedQueryResult<TVaryMode, TAddAllowedParamsOptions, TCacheParamsOptions>
    };
  };

  private createVariedByValueRangesParser = 
    <TAllowedAndCacheParamsOptions extends Record<any, CachePageParamOptions>>(allowedAndCacheParamsOptions: TAllowedAndCacheParamsOptions): (
      (url: ParseCacheQueryParamsArgs) => ParseQueryCacheError | ParseQueryCacheSuccess<CacheParamsVariedByValueRanges<TAllowedAndCacheParamsOptions>>
  ) => {
    this.logger.verbose(`(HtmlPageModelMetadata) creating value ranges parser, cacheParamOptions=${JSON.stringify(allowedAndCacheParamsOptions)}`);

    const allQueryOptions = {
      ...allowedAndCacheParamsOptions,
      ...internalSystemParamOptions,
      ...previewSystemParamOptions
    } as GetParamsOptionsResult<'all', 'UseEntityChangeTimestamp', EmptyParamListOptions, TAllowedAndCacheParamsOptions>;
    
    const resultParser = ((url: ParseCacheQueryParamsArgs): ParseQueryCacheError | ParseQueryCacheSuccess<CacheParamsVariedByValueRanges<TAllowedAndCacheParamsOptions>> => 
    {
      const parseResult = this.parseAndValidateQueryWithVariantValues(url, {}, allQueryOptions);
      if(!parseResult.success) {
        return parseResult.error;
      }
      const parsedQuery = parseResult.query as ReturnType<CacheParamsVariedByValueRanges<TAllowedAndCacheParamsOptions>['getNormalizedUrlQuery']>;
      
      const result: CacheParamsVariedByValueRanges<TAllowedAndCacheParamsOptions> = {
        ...parsedQuery,
        getCacheVaryOptions: () => 'PathAndPredefinedVariants',
        getParamsOptions: (kind: GetParamsOptionsKind) => {
          switch(kind) {
            case 'allowed':
              return {} as any;
            case 'cache':
              return allowedAndCacheParamsOptions;
            case 'system':
              return { 
                ...internalSystemParamOptions,
                ...previewSystemParamOptions
              };
            default:
              return allQueryOptions;
          }
        },
        getNormalizedUrlQuery: () => parsedQuery,
        getCacheKeyObject: () => { 
          const cacheKeyParamNames = keys(result.getParamsOptions('all'));
          const cacheKeyObj = pick(parsedQuery, cacheKeyParamNames) as ReturnType<CacheParamsVariedByValueRanges<TAllowedAndCacheParamsOptions>['getCacheKeyObject']>;
          return cacheKeyObj;
        }
      };

      return { 
        result: 'SUCCESS', 
        parsedQuery: result 
      };
    });

    this.logger.verbose(`(HtmlPageModelMetadata) value ranges parser created, cacheParamOptions=${JSON.stringify(allowedAndCacheParamsOptions)}`);
    return resultParser;
  };

  private createVariedByIdAndSystemParamsParser = 
    <TQueryParamsOptions extends Record<any, CachePageParamOptions>>(queryParamsOptions: TQueryParamsOptions): (
      (url: ParseCacheQueryParamsArgs) => ParseQueryCacheError | ParseQueryCacheSuccess<CacheParamsVariedBySystemParamsOnly<TQueryParamsOptions>>
  ) => {
    this.logger.verbose(`(HtmlPageModelMetadata) creating id & system params -varied parser, cacheParamOptions=${JSON.stringify(queryParamsOptions)}`);

    const resultParser = ((url: ParseCacheQueryParamsArgs): ParseQueryCacheError | ParseQueryCacheSuccess<CacheParamsVariedBySystemParamsOnly<TQueryParamsOptions>> => 
    {
      const parseResult = this.parseAndValidateQueryWithVariantValues(url, queryParamsOptions, { ...internalSystemParamOptions, ...previewSystemParamOptions });
      if(!parseResult.success) {
        return parseResult.error;
      }
      const parsedQuery = parseResult.query as ReturnType<CacheParamsVariedBySystemParamsOnly<TQueryParamsOptions>['getNormalizedUrlQuery']>;
      
      const result: CacheParamsVariedBySystemParamsOnly<TQueryParamsOptions> = {
        ...parsedQuery,
        getCacheVaryOptions: () => 'VaryByIdAndSystemParamsOnly',
        getParamsOptions: <TKind extends GetParamsOptionsKind>(kind: TKind) => {
          switch(kind) {
            case 'allowed':
              return queryParamsOptions as GetParamsOptionsResult<TKind, 'VaryByIdAndSystemParamsOnly', TQueryParamsOptions, EmptyParamListOptions>;;
            case 'cache':
              return { } as GetParamsOptionsResult<TKind, 'VaryByIdAndSystemParamsOnly', TQueryParamsOptions, EmptyParamListOptions>;
            case 'system':
              return { ...internalSystemParamOptions, ...previewSystemParamOptions } as GetParamsOptionsResult<TKind, 'VaryByIdAndSystemParamsOnly', TQueryParamsOptions, EmptyParamListOptions>;
            default:
              return  {
                ...queryParamsOptions,
                ...internalSystemParamOptions,
                ...previewSystemParamOptions,
              } as GetParamsOptionsResult<TKind, 'VaryByIdAndSystemParamsOnly', TQueryParamsOptions, EmptyParamListOptions>;
          }
        },
        getNormalizedUrlQuery: () => parsedQuery,
        getCacheKeyObject: () => { 
          const cacheKeyParamNames = keys(result.getParamsOptions('system'));
          const cacheKeyObj = pick(parsedQuery, cacheKeyParamNames) as ReturnType<CacheParamsVariedBySystemParamsOnly<TQueryParamsOptions>['getCacheKeyObject']>;
          return cacheKeyObj;
        },
      };

      return { 
        result: 'SUCCESS', 
        parsedQuery: result 
      };
    });

    this.logger.verbose(`(HtmlPageModelMetadata) id & system params -varied parser created, cacheParamOptions=${JSON.stringify(queryParamsOptions)}`);
    return resultParser;
  };

  private createCacheByEntityTimestampParser = 
    <TQueryParamsOptions extends Record<any, CachePageParamOptions>>(queryParamsOptions: TQueryParamsOptions): (
      (url: ParseCacheQueryParamsArgs) => ParseQueryCacheError | ParseQueryCacheSuccess<CacheByPageTimestamp<TQueryParamsOptions>>
  ) => {
    this.logger.verbose(`(HtmlPageModelMetadata) creating entity timestamp-based parser, cacheParamOptions=${JSON.stringify(queryParamsOptions)}`);

    const resultParser = ((url: ParseCacheQueryParamsArgs): ParseQueryCacheError | ParseQueryCacheSuccess<CacheByPageTimestamp<TQueryParamsOptions>> => 
    {
      const allQueryOptions = {
        ...queryParamsOptions,
        ...internalSystemParamOptions,
        ...timestampSystemParamOptions,
        ...previewSystemParamOptions
      } as GetParamsOptionsResult<'all', 'UseEntityChangeTimestamp', TQueryParamsOptions, EmptyParamListOptions>;
      const parseResult = this.parseAndValidateQueryWithVariantValues(url, allQueryOptions, {});
      if(!parseResult.success) {
        return parseResult.error;
      }
      const parsedQuery = parseResult.query as ReturnType<CacheByPageTimestamp<TQueryParamsOptions>['getNormalizedUrlQuery']>;
      
      const result: CacheByPageTimestamp<TQueryParamsOptions> = {
        ...parsedQuery,
        getCacheVaryOptions: () => 'UseEntityChangeTimestamp',
        getParamsOptions: <TKind extends GetParamsOptionsKind>(kind: TKind) => {
          switch(kind) {
            case 'allowed':
              return queryParamsOptions as GetParamsOptionsResult<TKind, 'UseEntityChangeTimestamp', TQueryParamsOptions, EmptyParamListOptions>;;
            case 'cache':
              return  {} as GetParamsOptionsResult<TKind, 'UseEntityChangeTimestamp', TQueryParamsOptions, EmptyParamListOptions>;
            case 'system':
              return { 
                ...internalSystemParamOptions,
                ...timestampSystemParamOptions,
                ...previewSystemParamOptions,
              } as GetParamsOptionsResult<TKind, 'UseEntityChangeTimestamp', TQueryParamsOptions, EmptyParamListOptions>;
            default:
              return allQueryOptions as GetParamsOptionsResult<TKind, 'UseEntityChangeTimestamp', TQueryParamsOptions, EmptyParamListOptions>;
          }
        },
        getNormalizedUrlQuery: () => parsedQuery,
        getCacheKeyObject: () => null as never
      };

      return { 
        result: 'SUCCESS', 
        parsedQuery: result 
      };
    });

    this.logger.verbose(`(HtmlPageModelMetadata) entity timestamp-based parser created, cacheParamOptions=${JSON.stringify(queryParamsOptions)}`);
    return resultParser;
  };

  getMetadata(page: keyof typeof AppPage): HtmlPageModel<typeof page> {
    this.logger.debug(`(HtmlPageModelMetadata) get metdata, page=${page}`);

    let result: HtmlPageModel<typeof page>;
    if(page === 'Index') {
      const cachingQueryVariants = this.createCachingQueryVariants({ ...internalSystemParamOptions, ...previewSystemParamOptions });
      const typedResult: HtmlPageModel<'Index', IndexCacheParams> = {
        page,
        identity: undefined,
        associatedWith: ['PopularCity', 'City', 'CompanyReview'],
        getCacheVaryOptions: () => 'PathAndPredefinedVariants',
        parseCacheQueryParams: this.createVariedByValueRangesParser<EmptyParamListOptions>({}),
        getAllCachingQueryVariants: () => cachingQueryVariants 
      };
      result = typedResult;
    } else if(page === 'Privacy') {
      const cachingQueryVariants =  this.createCachingQueryVariants({ ...internalSystemParamOptions, ...previewSystemParamOptions });
      const typedResult: HtmlPageModel<'Privacy', PrivacyCacheParams> = {
        page,
        identity: undefined,
        associatedWith: undefined, // can be refreshed via service endpoint
        getCacheVaryOptions: () => 'PathAndPredefinedVariants',
        parseCacheQueryParams: this.createVariedByValueRangesParser<EmptyParamListOptions>({}),
        getAllCachingQueryVariants: () => cachingQueryVariants
      };
      result = typedResult;
    } else if(page === 'Login') {
      const typedResult: HtmlPageModel<'Login', LoginCacheParams> = {
        page,
        identity: undefined,
        associatedWith: ['AuthFormImage'], // only photos slider affects cached content
        getCacheVaryOptions: () => 'VaryByIdAndSystemParamsOnly',
        parseCacheQueryParams: this.createVariedByIdAndSystemParamsParser<LoginPageAllowedParamsOptions>(loginPageAllowedParamsOptions),
        getAllCachingQueryVariants: () => []
      };
      result = typedResult;
    } else if(page === 'ForgotPassword') {
      const cachingQueryVariants = this.createCachingQueryVariants({ ...internalSystemParamOptions, ...previewSystemParamOptions });
      const typedResult: HtmlPageModel<'ForgotPassword', ForgotPasswordCacheParams> = {
        page,
        identity: undefined,
        associatedWith: ['AuthFormImage'], // only photos slider affects cached content
        getCacheVaryOptions: () => 'PathAndPredefinedVariants',
        parseCacheQueryParams: this.createVariedByValueRangesParser<EmptyParamListOptions>({}),
        getAllCachingQueryVariants: () => cachingQueryVariants
      };
      result = typedResult;
    } else if(page === 'ForgotPasswordComplete') {
      const cachingQueryVariants = this.createCachingQueryVariants({ ...forgotPasswordCompleteCacheParamsOptions, ...internalSystemParamOptions, ...previewSystemParamOptions });
      const typedResult: HtmlPageModel<'ForgotPasswordComplete', ForgotPasswordCompleteCacheParams> = {
        page,
        identity: undefined,
        associatedWith: ['AuthFormImage'], // only photos slider affects cached content
        getCacheVaryOptions: () => 'PathAndPredefinedVariants',
        parseCacheQueryParams: this.createVariedByValueRangesParser<ForgotPasswordCompleteCacheParamsOptions>(forgotPasswordCompleteCacheParamsOptions),
        getAllCachingQueryVariants: () => cachingQueryVariants
      };
      result = typedResult;
    } else if(page === 'ForgotPasswordSet') {
      const typedResult: HtmlPageModel<'ForgotPasswordSet', ForgotPasswordSetCacheParams> = {
        page,
        identity: undefined,
        associatedWith: ['AuthFormImage'], // only photos slider affects cached content
        getCacheVaryOptions: () => 'VaryByIdAndSystemParamsOnly',
        parseCacheQueryParams: this.createVariedByIdAndSystemParamsParser<ForgotPasswordSetAllowedParamsOptions>(forgotPasswordSetAllowedParamsOptions),
        getAllCachingQueryVariants: () => []
      };
      result = typedResult;
    } else if(page === 'ForgotPasswordVerify') {
      const cachingQueryVariants = this.createCachingQueryVariants({ ...internalSystemParamOptions, ...previewSystemParamOptions });
      const typedResult: HtmlPageModel<'ForgotPasswordVerify', ForgotPasswordVerifyCacheParams> = {
        page,
        identity: undefined,
        associatedWith: ['AuthFormImage'], // only photos slider affects cached content
        getCacheVaryOptions: () => 'PathAndPredefinedVariants',
        parseCacheQueryParams: this.createVariedByValueRangesParser<EmptyParamListOptions>({}),
        getAllCachingQueryVariants: () => cachingQueryVariants
      };
      result = typedResult;
    } else if(page === 'Signup') {
      const cachingQueryVariants = this.createCachingQueryVariants({ ...internalSystemParamOptions, ...previewSystemParamOptions });
      const typedResult: HtmlPageModel<'Signup', SignupCacheParams> = {
        page,
        identity: undefined,
        associatedWith: ['AuthFormImage'], // only photos slider affects cached content
        getCacheVaryOptions: () => 'PathAndPredefinedVariants',
        parseCacheQueryParams: this.createVariedByValueRangesParser<EmptyParamListOptions>({}),
        getAllCachingQueryVariants: () => cachingQueryVariants
      };
      result = typedResult;
    } else if(page === 'SignupComplete') {
      const typedResult: HtmlPageModel<'SignupComplete', SignupCompleteCacheParams> = {
        page,
        identity: undefined,
        associatedWith: ['AuthFormImage'], // only photos slider affects cached content
        getCacheVaryOptions: () => 'VaryByIdAndSystemParamsOnly',
        parseCacheQueryParams: this.createVariedByIdAndSystemParamsParser<SignupCompleteAllowedParamsOptions>(signUpCompleteAllowedParamsOptions),
        getAllCachingQueryVariants: () => []
      };
      result = typedResult;
    } else if(page === 'SignupVerify') {
      const cachingQueryVariants = this.createCachingQueryVariants({ ...internalSystemParamOptions, ...previewSystemParamOptions });
      const typedResult: HtmlPageModel<'SignupVerify', SignupVerifyCacheParams> = {
        page,
        identity: undefined,
        associatedWith: ['AuthFormImage'], // only photos slider affects cached content
        getCacheVaryOptions: () => 'PathAndPredefinedVariants',
        parseCacheQueryParams: this.createVariedByValueRangesParser<EmptyParamListOptions>({}),
        getAllCachingQueryVariants: () => cachingQueryVariants
      };
      result = typedResult;
    } else if(page === 'EmailVerifyComplete') {
      const typedResult: HtmlPageModel<'EmailVerifyComplete', EmailVerifyCompleteCacheParams> =  {
        page,
        identity: undefined,
        associatedWith: ['AuthFormImage'], // only photos slider affects cached content
        getCacheVaryOptions: () => 'VaryByIdAndSystemParamsOnly',
        parseCacheQueryParams: this.createVariedByIdAndSystemParamsParser<EmailVerifyCompleteAllowedParamsOptions>(emailVerifyCompleteAllowedParamsOptions),
        getAllCachingQueryVariants: () => []
      };
      result = typedResult;
    } else if(page === 'Flights') {
      const typedResult: HtmlPageModel<'Flights', FlightsCacheParams> = {
        page,
        identity: undefined,
        associatedWith: ['PopularCity', 'City'],
        getCacheVaryOptions: () => 'VaryByIdAndSystemParamsOnly',
        parseCacheQueryParams: this.createVariedByIdAndSystemParamsParser<FlightsAllowedParamsOptions>(flightsAllowedParamsOptions),
        getAllCachingQueryVariants: () => []
      };
      result = typedResult;
    } else if(page === 'FindFlights') {
      const typedResult: HtmlPageModel<'FindFlights', FindFlightsCacheParams> = {
        page,
        identity: undefined,
        associatedWith: undefined,
        getCacheVaryOptions: () => 'VaryByIdAndSystemParamsOnly',
        parseCacheQueryParams: this.createVariedByIdAndSystemParamsParser<FindFlightsAllowedParamsOptions>(findFlightsAllowedParamsOptions),
        getAllCachingQueryVariants: () => []
      };
      result = typedResult;
    } else if(page === 'FlightDetails') {
      const cachingQueryVariants = this.createCachingQueryVariants(timestampedPageParamListOptions);
      const typedResult: HtmlPageModel<'FlightDetails', FlightDetailsCacheParams> = {
        page: page as any,
        identity: 'FlightOffer',
        associatedWith: undefined,
        getCacheVaryOptions: () => 'UseEntityChangeTimestamp',
        parseCacheQueryParams: this.createCacheByEntityTimestampParser<EmptyParamListOptions>({}),
        getAllCachingQueryVariants: () => cachingQueryVariants
      };
      result = typedResult;
    } else if(page === 'BookFlight') {
      const cachingQueryVariants = this.createCachingQueryVariants(timestampedPageParamListOptions);
      const typedResult: HtmlPageModel<'BookFlight', BookFlightCacheParams> = {
        page,
        identity: 'FlightOffer',
        associatedWith: undefined,
        getCacheVaryOptions: () => 'UseEntityChangeTimestamp',
        parseCacheQueryParams: this.createCacheByEntityTimestampParser<EmptyParamListOptions>({}),
        getAllCachingQueryVariants: () => cachingQueryVariants
      };
      result = typedResult;
    } else if(page === 'Stays') {
      const typedResult: HtmlPageModel<'Stays', StaysCacheParams> = {
        page,
        identity: undefined,
        associatedWith: ['PopularCity', 'City'],
        getCacheVaryOptions: () => 'VaryByIdAndSystemParamsOnly',
        parseCacheQueryParams: this.createVariedByIdAndSystemParamsParser<StaysAllowedParamsOptions>(staysAllowedParamsOptions),
        getAllCachingQueryVariants: () => []
      };
      result = typedResult;
    } else if(page === 'FindStays') {
      const typedResult: HtmlPageModel<'FindStays', FindStaysCacheParams> = {
        page,
        identity: undefined,
        associatedWith: undefined,
        getCacheVaryOptions: () => 'VaryByIdAndSystemParamsOnly',
        parseCacheQueryParams: this.createVariedByIdAndSystemParamsParser<FindStaysAllowedParamsOptions>(findStaysAllowedParamsOptions),
        getAllCachingQueryVariants: () => []
      };
      result = typedResult;
    } else if(page === 'StayDetails') {
      const cachingQueryVariants = this.createCachingQueryVariants(timestampedPageParamListOptions);
      const typedResult: HtmlPageModel<'StayDetails', StayDetailsCacheParams> = {
        page,
        identity: 'StayOffer',
        associatedWith: undefined,
        getCacheVaryOptions: () => 'UseEntityChangeTimestamp',
        parseCacheQueryParams: this.createCacheByEntityTimestampParser<EmptyParamListOptions>({}),
        getAllCachingQueryVariants: () => cachingQueryVariants
      };
      result = typedResult;
    } else if(page === 'BookStay') {
      const cachingQueryVariants = this.createCachingQueryVariants(timestampedPageParamListOptions);
      const typedResult: HtmlPageModel<'BookStay', BookStayCacheParams> = {
        page,
        identity: 'StayOffer',
        associatedWith: undefined,
        getCacheVaryOptions: () => 'UseEntityChangeTimestamp',
        parseCacheQueryParams: this.createCacheByEntityTimestampParser<StayBookAllowedParamsOptions>(stayBookAllowedParamsOptions),
        getAllCachingQueryVariants: () => cachingQueryVariants
      };
      result = typedResult;
    } else if(page === 'BookingDetails') {
      const cachingQueryVariants = this.createCachingQueryVariants(timestampedPageParamListOptions);
      const typedResult: HtmlPageModel<'BookingDetails', BookingCacheParams> = {
        page,
        identity: 'Booking',
        associatedWith: undefined,
        getCacheVaryOptions: () => 'UseEntityChangeTimestamp',
        parseCacheQueryParams: this.createCacheByEntityTimestampParser<BookingDetailsAllowedParamsOptions>(bookingDetailsAllowedParamsOptions),
        getAllCachingQueryVariants: () => cachingQueryVariants
      };
      result = typedResult;
    } else if(page === 'Account') {
      const cachingQueryVariants = this.createCachingQueryVariants({ ...internalSystemParamOptions, ...previewSystemParamOptions });
      const typedResult: HtmlPageModel<'Account', AccountCacheParams> = {
        page,
        identity: undefined,
        associatedWith: undefined,
        getCacheVaryOptions: () => 'PathAndPredefinedVariants',
        parseCacheQueryParams: this.createVariedByValueRangesParser<EmptyParamListOptions>({}),
        getAllCachingQueryVariants: () => cachingQueryVariants
      };
      result = typedResult;
    } else if(page === 'Favourites') {
      const cachingQueryVariants = this.createCachingQueryVariants({ ...internalSystemParamOptions, ...previewSystemParamOptions });
      const typedResult: HtmlPageModel<'Favourites', FavouritesCacheParams> = {
        page,
        identity: undefined,
        associatedWith: undefined,
        getCacheVaryOptions: () => 'PathAndPredefinedVariants',
        parseCacheQueryParams: this.createVariedByValueRangesParser<EmptyParamListOptions>({}),
        getAllCachingQueryVariants: () => cachingQueryVariants
      };
      result = typedResult;
    } else {
      this.logger.warn(`(HtmlPageModelMetadata) unexpected page type, page=${(page as any)?.toString() ?? ''}`);
      throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'unexpected exception occured', 'error-page');
    }

    if(!result.identity && !(result.associatedWith?.length ?? 0) && result.getCacheVaryOptions() === 'UseEntityChangeTimestamp') {
      this.logger.warn(`(HtmlPageModelMetadata) page has ${<PageCacheVaryOptions>'UseEntityChangeTimestamp'}, but it does not have any related entity. Another cache variation option must be chosen, page=${(page as any).valueOf()}`);
    }
    return result;
  }
}