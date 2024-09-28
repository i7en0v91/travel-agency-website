import { type IStayImage, type IImageInfo, type IFileInfo, AppException, AppExceptionCodeEnum, lookupValueOrThrow, type IStayOfferDetails, type IStayDescription, type IStay, type IFlight, type IAirport, type AirplaneImageKind, type ICity, type IAppLogger, type IEntity, type ILocalizableValue, type EntityId, type IAirlineCompany, type IImageCategoryInfo, ImageCategory, type ICountry, type IAirplane, type IAirplaneImage, type IFlightOffer, type FlightClass, type EntityDataAttrsOnly, type StayServiceLevel, type IStayImageShort, type StayDescriptionParagraphType, DefaultStayReviewScore } from '@golobe-demo/shared';
import { CityInfoQuery, ImageInfoQuery, MapImageInfo } from '../services/queries'; 
import { type IFileLogic, type ICompanyReview, type IAuthFormImageInfo } from './../types';
import type { PrismaClient } from '@prisma/client';
import uniq from 'lodash-es/uniq';
import omit from 'lodash-es/omit';
import groupBy from 'lodash-es/groupBy';
import toPairs from 'lodash-es/toPairs';
import flatten from 'lodash-es/flatten';
import orderBy from 'lodash-es/orderBy';
import { Decimal } from 'decimal.js';
import { mapDbDate, mapDbGeoCoord } from './../helpers/db';
import type { EntityModel } from '../common-services/change-dependency-tracker';

/**
 * Specifies whether error must be thrown and upon which conditions while resolving draft entities.
 * {@link ThrowAnyNotFound} - throws an error if no entities were found either for id specified in argumets of original method call or while resolving any of it's nested entities 
 * {@link ThrowOnlyOnRequestedIdNotFound} - throws an error if no entities were found for id specified in arguments of original method call; simply excludes entity from result in case any of its nested entities haven't been found
 * {@link ExcludeFromResult} - simply excludes entity from result in case it or any of its nested entities haven't been found
*/
export enum UnresolvedEntityThrowingCondition {
  ThrowAnyNotFound,
  ThrowOnlyOnRequestedIdNotFound,
  ExcludeFromResult
}

type UnresolvedEntityExceptionArgs = {
  options: AcsysDraftEntitiesResolveOptions,
  notFoundEntities: { ids: EntityId[], model: EntityModel },
};

export type AcsysDraftEntitiesResolveOptions = {
  idsFilter?: EntityId[] | undefined,
  includeDeleted?: boolean,
  unresolvedEntityPolicy?: UnresolvedEntityThrowingCondition,
  exceptionFactory?: (exceptionArgs: UnresolvedEntityExceptionArgs) => Error
};

export type AcsysDraftEntitiesResolveResult<TEntity extends IEntity> = {
  items: ReadonlyMap<EntityId, TEntity>,
  notFoundIds: EntityId[] | undefined
};

type AirplaneImageResolveItem = Omit<IAirplaneImage, 'airplane'> & { airplaneId: EntityId };
type HotelImageResolveItem = Omit<IStayImage, 'hotel'> & { hotelId: EntityId };
type HoteDescriptionResolveItem = Omit<IStayDescription, 'hotel'> & { hotelId: EntityId };

export class AcsysDraftEntitiesResolver {
  private readonly logger: IAppLogger;
  private readonly fileLogic: IFileLogic;
  private readonly dbRepository: PrismaClient;
  
  public static inject = ['dbRepository', 'fileLogic', 'logger'] as const;
  constructor (dbRepository: PrismaClient, fileLogic: IFileLogic, logger: IAppLogger) {
    this.dbRepository = dbRepository;
    this.logger = logger;
    this.fileLogic = fileLogic;
  }

  private formatResolveResultLog<TEntity extends IEntity>(options: AcsysDraftEntitiesResolveOptions, result: AcsysDraftEntitiesResolveResult<TEntity>): string {
    return `count=${result.items.size} of ${options.idsFilter ? options.idsFilter.length : 'all'} (${result.notFoundIds?.length ? `NOT FOUND ids=[${result.notFoundIds.join('; ')}]; `: ''}, ids=[${Array.from(result.items.values()).map(x => x.id).join('; ')}])`;
  }

  private formatResolveOptionsLog(options: AcsysDraftEntitiesResolveOptions): string {
    return `ids=${options.idsFilter ? `[${options.idsFilter.join('; ')}]` : 'any'}, includeDeleted=${options.includeDeleted}, throwIfNotAllFound=${options.unresolvedEntityPolicy}`;
  }

  private validateAndPrepareResolveOptions(options: AcsysDraftEntitiesResolveOptions, idsMustBeSpecified: boolean) {
    // prevent accidently pulling entire table into memory - such a request is not expected and probably mistaken
    if(idsMustBeSpecified && options.idsFilter === undefined) {
      this.logger.error(`(AcsysDraftEntitiesResolver) incorrect arguments - expected input list of ids to filter, ${this.formatResolveOptionsLog(options)}`);
      throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'unknown server error', 'error-page');
    }

    options.includeDeleted ??= false;
    options.unresolvedEntityPolicy ??= (options.idsFilter === undefined ? UnresolvedEntityThrowingCondition.ThrowOnlyOnRequestedIdNotFound : UnresolvedEntityThrowingCondition.ThrowAnyNotFound);
    
    if(options.idsFilter === undefined && options.unresolvedEntityPolicy === UnresolvedEntityThrowingCondition.ThrowAnyNotFound) {
      this.logger.error(`(AcsysDraftEntitiesResolver) incorrect arguments for resolving entities - ThrowAnyNotFound assumes input list of ids to filter, ${this.formatResolveOptionsLog(options)}`);
      throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'unknown server error', 'error-page');
    }

    if(!options.exceptionFactory) {
      options.exceptionFactory = (args) => {
        this.logger.warn('(AcsysDraftEntitiesResolver) some of entities not found while resolving', undefined, args);
        return new AppException(AppExceptionCodeEnum.OBJECT_NOT_FOUND, 'object not found', 'error-page');
      };
    }

    if(options.idsFilter?.length) {
      options.idsFilter = uniq(options.idsFilter);
    }
  }

  private buildWhereIdQueryFilter(options: AcsysDraftEntitiesResolveOptions): { in?: EntityId[] | undefined, isDeleted?: boolean | undefined } {
    return {
      ...(options.idsFilter ? { id: { in: options.idsFilter } } : {}),
      ...(options.includeDeleted ? {} : { isDeleted: false })
    };
  }

  private buildNestedEntitiesResolveOptions(idsFilter: EntityId[] | undefined, currentOptions: AcsysDraftEntitiesResolveOptions): AcsysDraftEntitiesResolveOptions {
    let throwingCondition: UnresolvedEntityThrowingCondition;
    if(idsFilter !== undefined) {
      switch(currentOptions.unresolvedEntityPolicy) {
        case UnresolvedEntityThrowingCondition.ThrowAnyNotFound:
          throwingCondition = UnresolvedEntityThrowingCondition.ThrowAnyNotFound;
          break;
        default:
          throwingCondition = UnresolvedEntityThrowingCondition.ExcludeFromResult;
          break;
      }
    } else {
      throwingCondition = UnresolvedEntityThrowingCondition.ExcludeFromResult;
    }

    return {
      exceptionFactory: currentOptions.exceptionFactory,
      idsFilter: idsFilter !== undefined ? uniq(idsFilter) : undefined,
      includeDeleted: currentOptions.includeDeleted,
      unresolvedEntityPolicy: throwingCondition
    };
  };

  private buildResolveResult<TEntity extends IEntity>(options: AcsysDraftEntitiesResolveOptions, itemList: TEntity[]): AcsysDraftEntitiesResolveResult<TEntity> {
    const itemIds = new Set<EntityId>(itemList.map(i => i.id));
    return {
      items: new Map(itemList.map(i => [i.id, i])),
      notFoundIds: options.idsFilter !== undefined ? (options.idsFilter.filter(id => !itemIds.has(id))) : undefined
    };
  };

  private throwOnRequestEntityNotFoundIfNeeded<TEntityItem extends { id: EntityId }>(options: AcsysDraftEntitiesResolveOptions, entityModel: EntityModel, drafts: TEntityItem[] | undefined, published: TEntityItem[] | undefined) {
    if(options.unresolvedEntityPolicy === UnresolvedEntityThrowingCondition.ExcludeFromResult || options.idsFilter === undefined) {
      return;
    }

    if(((drafts?.length ?? 0) + (published?.length ?? 0)) !== options.idsFilter.length) {
      const foundIds = new Set<EntityId>([...((drafts ?? []).map(d => d.id)), ...(published ?? []).map(v => v.id)]);
      throw options.exceptionFactory!({ 
        options,
        notFoundEntities: {
          ids: options.idsFilter.filter(id => !foundIds.has(id)),
          model: entityModel
        }
       });
    }
  };

  private throwOnNestedEntityNotFoundIfNeeded(options: AcsysDraftEntitiesResolveOptions, id: EntityId, entityModel: EntityModel) {
    if(options.unresolvedEntityPolicy !== UnresolvedEntityThrowingCondition.ThrowAnyNotFound || options.idsFilter === undefined) {
      return;
    }

    throw options.exceptionFactory!({ 
      options,
      notFoundEntities: {
        ids: [id],
        model: entityModel
      }
     });
  };

  public async resolveLocalizeableValues(options: AcsysDraftEntitiesResolveOptions): Promise<AcsysDraftEntitiesResolveResult<ILocalizableValue & IEntity>> {
    this.logger.debug(`(AcsysDraftEntitiesResolver) resolving localizeable values, ${this.formatResolveOptionsLog(options)}`);

    if(!!options.idsFilter && options.idsFilter.length === 0) {
      this.logger.debug(`(AcsysDraftEntitiesResolver) localizeable values resolved, ${this.formatResolveOptionsLog(options)} - empty ids filter`);
      return {
        items: new Map<EntityId, ILocalizableValue & IEntity>([]),
        notFoundIds: undefined
      };
    }
    this.validateAndPrepareResolveOptions(options, true);

    this.logger.debug(`(AcsysDraftEntitiesResolver) resolving localizeable values - querying drafts`);
    const drafts = await this.dbRepository.acsysDraftsLocalizeableValue.findMany({
      where: this.buildWhereIdQueryFilter(options),
      select: {
        id: true,
        en: true,
        fr: true,
        ru: true
      }
    });
    let published: (typeof drafts) | undefined;
    if(drafts.length !== options.idsFilter!.length) {
      this.logger.debug(`(AcsysDraftEntitiesResolver) resolving localizeable values - querying published`);
      published = await this.dbRepository.localizeableValue.findMany({
        where: this.buildWhereIdQueryFilter(options),
        select: {
          id: true,
          en: true,
          fr: true,
          ru: true
        }
      });
    }
    this.throwOnRequestEntityNotFoundIfNeeded(options, 'LocalizeableValue', drafts, published);

    const itemList = [
      ...drafts.map(d => {
        return <ILocalizableValue & IEntity> {
          en: d.en,
          fr: d.fr,
          ru: d.ru,
          id: d.id,
          previewMode: true
        };
      }),
      ...(published ?? []).map(v => {
        return <ILocalizableValue & IEntity> {
          en: v.en,
          fr: v.fr,
          ru: v.ru,
          id: v.id,
          previewMode: false
        };
      })
    ];
    const result = this.buildResolveResult(options, itemList);

    this.logger.debug(`(AcsysDraftEntitiesResolver) localizeable values resolved, ${this.formatResolveOptionsLog(options)}, ${this.formatResolveResultLog(options, result)}`);
    return result;
  }

  public async resolveImageCategories(options: AcsysDraftEntitiesResolveOptions): Promise<AcsysDraftEntitiesResolveResult<IImageCategoryInfo & IEntity>> {
    this.logger.debug(`(AcsysDraftEntitiesResolver) resolving categories, ${this.formatResolveOptionsLog(options)}`);

    if(!!options.idsFilter && options.idsFilter.length === 0) {
      this.logger.debug(`(AcsysDraftEntitiesResolver) categories resolved, ${this.formatResolveOptionsLog(options)} - empty ids filter`);
      return {
        items: new Map<EntityId, IImageCategoryInfo & IEntity>([]),
        notFoundIds: undefined
      };
    }
    this.validateAndPrepareResolveOptions(options, false);

    this.logger.debug(`(AcsysDraftEntitiesResolver) resolving categories - querying`);
    const queryResult = await this.dbRepository.imageCategory.findMany({
      where: {
        id: (options.idsFilter ? { in: options.idsFilter } : {})
      },
      select: {
        id: true,
        kind: true,
        height: true,
        width: true
      }
    });
    this.throwOnRequestEntityNotFoundIfNeeded(options, 'ImageCategory', [], queryResult);

    const itemList = queryResult.map(d => {
        return <IImageCategoryInfo & IEntity>{
          id: d.id,
          kind: lookupValueOrThrow(ImageCategory, d.kind),
          height: d.height,
          width: d.width
        };
      });
    const result = this.buildResolveResult(options, itemList);

    this.logger.debug(`(AcsysDraftEntitiesResolver) image categories resolved, ${this.formatResolveOptionsLog(options)}, ${this.formatResolveResultLog(options, result)}`);
    return result;
  }

  public async resolveFileInfos(options: AcsysDraftEntitiesResolveOptions): Promise<AcsysDraftEntitiesResolveResult<IFileInfo>> {
    this.logger.debug(`(AcsysDraftEntitiesResolver) resolving file infos, ${this.formatResolveOptionsLog(options)}`);

    if(!!options.idsFilter && options.idsFilter.length === 0) {
      this.logger.debug(`(AcsysDraftEntitiesResolver) file infos resolved, ${this.formatResolveOptionsLog(options)} - empty ids filter`);
      return {
        items: new Map<EntityId, IFileInfo>([]),
        notFoundIds: undefined
      };
    }
    this.validateAndPrepareResolveOptions(options, true);

    const fileInfos = await this.fileLogic.findFiles(options.idsFilter!);
    this.throwOnRequestEntityNotFoundIfNeeded(options, 'File', [], fileInfos);
    const result = this.buildResolveResult(options, fileInfos);

    this.logger.debug(`(AcsysDraftEntitiesResolver) file infos resolved, ${this.formatResolveOptionsLog(options)}, ${this.formatResolveResultLog(options, result)}`);
    return result;
  }

  public async resolveCountries(options: AcsysDraftEntitiesResolveOptions): Promise<AcsysDraftEntitiesResolveResult<ICountry>> {
    this.logger.debug(`(AcsysDraftEntitiesResolver) resolving countries, ${this.formatResolveOptionsLog(options)}`);
    
    if(!!options.idsFilter && options.idsFilter.length === 0) {
      this.logger.debug(`(AcsysDraftEntitiesResolver) countries resolved, ${this.formatResolveOptionsLog(options)} - empty ids filter`);
      return {
        items: new Map<EntityId, ICity>([]),
        notFoundIds: undefined
      };
    }
    this.validateAndPrepareResolveOptions(options, false);

    this.logger.debug(`(AcsysDraftEntitiesResolver) resolving countries - querying`);
    const queryResult = (await this.dbRepository.country.findMany({
      where: this.buildWhereIdQueryFilter(options),
      select: { 
        id: true,
        nameStrId: true,
        createdUtc: true,
        modifiedUtc: true,
        isDeleted: true,
      }
    }));
    this.throwOnRequestEntityNotFoundIfNeeded(options, 'Country', [], queryResult);
    const allUnresolved = queryResult;

    const nameStrIds = allUnresolved.map(x => x.nameStrId);

    this.logger.debug(`(AcsysDraftEntitiesResolver) resolving countries - names`);
    const resolvedNames = await this.resolveLocalizeableValues(this.buildNestedEntitiesResolveOptions(nameStrIds, options));
    
    const itemList: ICountry[] = [];
    for(let i = 0; i < allUnresolved.length; i++) {
      const unresolved = allUnresolved[i];
      const name = resolvedNames.items.get(unresolved.nameStrId);
      if(!name) {
        this.throwOnNestedEntityNotFoundIfNeeded(options, unresolved.nameStrId, 'LocalizeableValue');
        continue;
      };
      
      itemList.push({
        createdUtc: unresolved.createdUtc,
        isDeleted: unresolved.isDeleted,
        modifiedUtc: unresolved.modifiedUtc,
        id: unresolved.id,
        name
      });
    }
    const result = this.buildResolveResult(options, itemList);
    
    this.logger.debug(`(AcsysDraftEntitiesResolver) countries resolved, ${this.formatResolveOptionsLog(options)}, ${this.formatResolveResultLog(options, result)}`);
    return result;
  }

  public async resolveCities(options: AcsysDraftEntitiesResolveOptions): Promise<AcsysDraftEntitiesResolveResult<ICity>> {
    this.logger.debug(`(AcsysDraftEntitiesResolver) resolving cities, ${this.formatResolveOptionsLog(options)}`);
    
    if(!!options.idsFilter && options.idsFilter.length === 0) {
      this.logger.debug(`(AcsysDraftEntitiesResolver) cities resolved, ${this.formatResolveOptionsLog(options)} - empty ids filter`);
      return {
        items: new Map<EntityId, ICity>([]),
        notFoundIds: undefined
      };
    }
    this.validateAndPrepareResolveOptions(options, false);

    this.logger.debug(`(AcsysDraftEntitiesResolver) resolving cities - querying drafts`);
    const drafts = (await this.dbRepository.acsysDraftsCity.findMany({
      where: this.buildWhereIdQueryFilter(options),
      select: { 
        ...(omit(CityInfoQuery.select, ['country', 'nameStr'])),
        countryId: true,
        nameStrId: true,
        isDeleted: true
      }
    }));
    let published: (typeof drafts) | undefined;
    if(options.idsFilter === undefined || drafts.length !== options.idsFilter.length) {
      this.logger.debug(`(AcsysDraftEntitiesResolver) resolving cities - querying published`);
      published = await this.dbRepository.city.findMany({
        where: this.buildWhereIdQueryFilter(options),
        select: { 
          ...(omit(CityInfoQuery.select, ['country', 'nameStr'])),
          countryId: true,
          nameStrId: true,
          isDeleted: true
        }
      });
    }
    this.throwOnRequestEntityNotFoundIfNeeded(options, 'City', drafts, published);
    const allUnresolved = [...(drafts ?? []), ...(published ?? [])];

    const nameStrIds = allUnresolved.map(x => x.nameStrId);
    const countryIds = allUnresolved.map(x => x.countryId);

    this.logger.debug(`(AcsysDraftEntitiesResolver) resolving cities - names`);
    const resolvedNames = await this.resolveLocalizeableValues(this.buildNestedEntitiesResolveOptions(nameStrIds, options));
    this.logger.debug(`(AcsysDraftEntitiesResolver) resolving cities - countries`);
    const resolvedCountries = await this.resolveCountries(this.buildNestedEntitiesResolveOptions(countryIds, options));
    
    const draftIds = new Set<EntityId>(drafts.map(d => d.id));
    const itemList: ICity[] = [];
    for(let i = 0; i < allUnresolved.length; i++) {
      const unresolved = allUnresolved[i];
      const name = resolvedNames.items.get(unresolved.nameStrId);
      if(!name) {
        this.throwOnNestedEntityNotFoundIfNeeded(options, unresolved.nameStrId, 'LocalizeableValue');
        continue;
      };
      const country = resolvedCountries.items.get(unresolved.countryId);
      if(!country) {
        this.throwOnNestedEntityNotFoundIfNeeded(options, unresolved.countryId, 'Country');
        continue;
      };
      
      itemList.push({
        country,
        name,
        createdUtc: unresolved.createdUtc,
        id: unresolved.id,
        geo: {
          lat: mapDbGeoCoord(unresolved.lat),
          lon: mapDbGeoCoord(unresolved.lon)
        },
        isDeleted: unresolved.isDeleted,
        modifiedUtc: unresolved.modifiedUtc,
        slug: unresolved.slug,
        utcOffsetMin: unresolved.utcOffsetMin,
        previewMode: draftIds.has(unresolved.id) 
      });
    }
    const result = this.buildResolveResult(options, itemList);
    
    this.logger.debug(`(AcsysDraftEntitiesResolver) cities resolved, ${this.formatResolveOptionsLog(options)}, ${this.formatResolveResultLog(options, result)}`);
    return result;
  }

  public async resolveImageFileInfos(options: AcsysDraftEntitiesResolveOptions): Promise<AcsysDraftEntitiesResolveResult<IImageInfo>> {
    this.logger.debug(`(AcsysDraftEntitiesResolver) resolving image file infos, ${this.formatResolveOptionsLog(options)}`);

    if(!!options.idsFilter && options.idsFilter.length === 0) {
      this.logger.debug(`(AcsysDraftEntitiesResolver) image file infos resolved, ${this.formatResolveOptionsLog(options)} - empty ids filter`);
      return {
        items: new Map<EntityId, IImageInfo>([]),
        notFoundIds: undefined
      };
    }
    this.validateAndPrepareResolveOptions(options, true);

    this.logger.debug(`(AcsysDraftEntitiesResolver) resolving image file infos - querying drafts`);
    const drafts = await this.dbRepository.acsysDraftsImage.findMany({
      where: this.buildWhereIdQueryFilter(options),
      select: {
        ...(omit(ImageInfoQuery.select, ['category'])),
        categoryId: true,
        ownerId: true,
        stubCssStyle: true
      }
    });
    let published: (typeof drafts) | undefined;
    if(drafts.length !== options.idsFilter!.length) {
      this.logger.debug(`(AcsysDraftEntitiesResolver) resolving image file infos - querying published`);
      published = await this.dbRepository.image.findMany({
        where: this.buildWhereIdQueryFilter(options),
        select: {
          ...(omit(ImageInfoQuery.select, ['category'])),
          categoryId: true,
          ownerId: true,
          stubCssStyle: true
        }
      });
    }
    this.throwOnRequestEntityNotFoundIfNeeded(options, 'Image', drafts, published);
    const allUnresolved = [...(drafts ?? []), ...(published ?? [])];

    const fileIds = allUnresolved.map(x => x.fileId);
    const categoryIds = allUnresolved.map(x => x.categoryId);

    this.logger.debug(`(AcsysDraftEntitiesResolver) resolving image file infos - files`);
    const resolvedFiles = await this.resolveFileInfos(this.buildNestedEntitiesResolveOptions(fileIds, options));    
    this.logger.debug(`(AcsysDraftEntitiesResolver) resolving image file infos - categories`);
    const resolvedImageCategories = await this.resolveImageCategories(this.buildNestedEntitiesResolveOptions(categoryIds, options));

    const draftIds = new Set<EntityId>(drafts.map(d => d.id));
    const itemList: IImageInfo[] = [];
    for(let i = 0; i < allUnresolved.length; i++) {
      const unresolved = allUnresolved[i];
      const fileInfo = resolvedFiles.items.get(unresolved.fileId);
      if(!fileInfo) {
        this.throwOnNestedEntityNotFoundIfNeeded(options, unresolved.fileId, 'File');
        continue;
      };

      const imageCategory = resolvedImageCategories.items.get(unresolved.categoryId);
      if(!imageCategory) {
        this.throwOnNestedEntityNotFoundIfNeeded(options, unresolved.categoryId, 'ImageCategory');
        continue;
      };

      itemList.push({
        ...MapImageInfo({
          ...unresolved,
          category: imageCategory
        }),
        file: fileInfo,
        previewMode: draftIds.has(unresolved.id) 
      });
    }
    const result = this.buildResolveResult(options, itemList);
   
    this.logger.debug(`(AcsysDraftEntitiesResolver) image file infos resolved, ${this.formatResolveOptionsLog(options)}, ${this.formatResolveResultLog(options, result)}`);
    return result;
  }

  public async resolveAirports(options: AcsysDraftEntitiesResolveOptions): Promise<AcsysDraftEntitiesResolveResult<IAirport>> {
    this.logger.debug(`(AcsysDraftEntitiesResolver) resolving airports, ${this.formatResolveOptionsLog(options)}`);
    
    if(!!options.idsFilter && options.idsFilter.length === 0) {
      this.logger.debug(`(AcsysDraftEntitiesResolver) airports resolved, ${this.formatResolveOptionsLog(options)} - empty ids filter`);
      return {
        items: new Map<EntityId, IAirport>([]),
        notFoundIds: undefined
      };
    }
    this.validateAndPrepareResolveOptions(options, false);

    this.logger.debug(`(AcsysDraftEntitiesResolver) resolving airports - querying drafts`);
    const drafts = (await this.dbRepository.acsysDraftsAirport.findMany({
      where: this.buildWhereIdQueryFilter(options),
      select: {
        cityId: true,
        lon: true,
        lat: true,
        id: true,
        nameStrId: true,
        createdUtc: true,
        modifiedUtc: true,
        isDeleted: true
      }
    }));

    let published: (typeof drafts) | undefined;
    if(options.idsFilter === undefined || drafts.length !== options.idsFilter.length) {
      this.logger.debug(`(AcsysDraftEntitiesResolver) resolving airports - querying published`);
      published = await this.dbRepository.airport.findMany({
        where: this.buildWhereIdQueryFilter(options),
        select: {
          cityId: true,
          lon: true,
          lat: true,
          id: true,
          nameStrId: true,
          createdUtc: true,
          modifiedUtc: true,
          isDeleted: true
        }
      });
    }
    this.throwOnRequestEntityNotFoundIfNeeded(options, 'Airport', drafts, published);
    const allUnresolved = [...(drafts ?? []), ...(published ?? [])];

    const localizeableValueIds = allUnresolved.map(x => x.nameStrId);
    const cityIds = allUnresolved.map(x => x.cityId);

    this.logger.debug(`(AcsysDraftEntitiesResolver) resolving airports - names`);
    const resolvedNames = await this.resolveLocalizeableValues(this.buildNestedEntitiesResolveOptions(localizeableValueIds, options));
    this.logger.debug(`(AcsysDraftEntitiesResolver) resolving airports - cities`);
    const resolvedCities = await this.resolveCities(this.buildNestedEntitiesResolveOptions(cityIds, options));
    
    const draftIds = new Set<EntityId>(drafts.map(d => d.id));
    const itemList: IAirport[] = [];
    for(let i = 0; i < allUnresolved.length; i++) {
      const unresolved = allUnresolved[i];
      const name = resolvedNames.items.get(unresolved.nameStrId);
      if(!name) {
        this.throwOnNestedEntityNotFoundIfNeeded(options, unresolved.nameStrId, 'LocalizeableValue');
        continue;
      };
      const city = resolvedCities.items.get(unresolved.cityId);
      if(!city) {
        this.throwOnNestedEntityNotFoundIfNeeded(options, unresolved.cityId, 'City');
        continue;
      };

      itemList.push({
        city,
        name,
        geo: {
          lat: mapDbGeoCoord(unresolved.lat),
          lon: mapDbGeoCoord(unresolved.lon)
        },
        createdUtc: unresolved.createdUtc,
        modifiedUtc: unresolved.modifiedUtc,
        id: unresolved.id,
        isDeleted: unresolved.isDeleted,
        previewMode: draftIds.has(unresolved.id) 
      });
    }
    const result = this.buildResolveResult(options, itemList);
    
    this.logger.debug(`(AcsysDraftEntitiesResolver) airports resolved, ${this.formatResolveOptionsLog(options)}, ${this.formatResolveResultLog(options, result)}`);
    return result;
  }

  public async resolveAirlineCompanies(options: AcsysDraftEntitiesResolveOptions): Promise<AcsysDraftEntitiesResolveResult<IAirlineCompany>> {
    this.logger.debug(`(AcsysDraftEntitiesResolver) resolving airline companies, ${this.formatResolveOptionsLog(options)}`);
    
    if(!!options.idsFilter && options.idsFilter.length === 0) {
      this.logger.debug(`(AcsysDraftEntitiesResolver) airline companies resolved, ${this.formatResolveOptionsLog(options)} - empty ids filter`);
      return {
        items: new Map<EntityId, IAirlineCompany>([]),
        notFoundIds: undefined
      };
    }
    this.validateAndPrepareResolveOptions(options, false);

    this.logger.debug(`(AcsysDraftEntitiesResolver) resolving airline companies - querying drafts`);
    const drafts = (await this.dbRepository.acsysDraftsAirlineCompany.findMany({
      where: this.buildWhereIdQueryFilter(options),
      select: {
        id: true,
        nameStrId: true,
        cityId: true,
        logoImageId: true,
        numReviews: true,
        reviewScore: true,
        createdUtc: true,
        modifiedUtc: true,
        isDeleted: true
      }
    }));
    let published: (typeof drafts) | undefined;
    if(options.idsFilter === undefined || drafts.length !== options.idsFilter.length) {
      this.logger.debug(`(AcsysDraftEntitiesResolver) resolving airline companies - querying published`);
      published = await this.dbRepository.airlineCompany.findMany({
        where: this.buildWhereIdQueryFilter(options),
        select: {
          id: true,
          nameStrId: true,
          cityId: true,
          logoImageId: true,
          numReviews: true,
          reviewScore: true,
          createdUtc: true,
          modifiedUtc: true,
          isDeleted: true
        }
      });
    }
    this.throwOnRequestEntityNotFoundIfNeeded(options, 'AirlineCompany', drafts, published);
    const allUnresolved = [...(drafts ?? []), ...(published ?? [])];

    const localizeableValueIds = allUnresolved.map(x => x.nameStrId);
    const logoImageIds = allUnresolved.map(x => x.logoImageId);
    const cityIds = allUnresolved.map(x => x.cityId);

    this.logger.debug(`(AcsysDraftEntitiesResolver) resolving airline companies - names`);
    const resolvedNames = await this.resolveLocalizeableValues(this.buildNestedEntitiesResolveOptions(localizeableValueIds, options));
    this.logger.debug(`(AcsysDraftEntitiesResolver) resolving airline companies - logo images`);
    const resolvedLogoImages = await this.resolveImageFileInfos(this.buildNestedEntitiesResolveOptions(logoImageIds, options));
    this.logger.debug(`(AcsysDraftEntitiesResolver) resolving airline companies - cities`);
    const resolvedCities = await this.resolveCities(this.buildNestedEntitiesResolveOptions(cityIds, options));
    
    const draftIds = new Set<EntityId>(drafts.map(d => d.id));
    const itemList: IAirlineCompany[] = [];
    for(let i = 0; i < allUnresolved.length; i++) {
      const unresolved = allUnresolved[i];
      const name = resolvedNames.items.get(unresolved.nameStrId);
      if(!name) {
        this.throwOnNestedEntityNotFoundIfNeeded(options, unresolved.nameStrId, 'LocalizeableValue');
        continue;
      };
      const logoImage = resolvedLogoImages.items.get(unresolved.logoImageId);
      if(!logoImage) {
        this.throwOnNestedEntityNotFoundIfNeeded(options, unresolved.logoImageId, 'Image');
        continue;
      };
      const city = resolvedCities.items.get(unresolved.cityId);
      if(!city) {
        this.throwOnNestedEntityNotFoundIfNeeded(options, unresolved.cityId, 'City');
        continue;
      };

      itemList.push({
        city,
        name,
        logoImage,
        createdUtc: unresolved.createdUtc,
        modifiedUtc: unresolved.modifiedUtc,
        id: unresolved.id,
        isDeleted: unresolved.isDeleted,
        reviewSummary: {
          numReviews: unresolved.numReviews,
          score: parseInt(unresolved.reviewScore)
        },
        previewMode: draftIds.has(unresolved.id) 
      });
    }
    const result = this.buildResolveResult(options, itemList);
    
    this.logger.debug(`(AcsysDraftEntitiesResolver) airline companies resolved, ${this.formatResolveOptionsLog(options)}, ${this.formatResolveResultLog(options, result)}`);
    return result;
  }

  public async resolveAirplaneImages(options: AcsysDraftEntitiesResolveOptions): Promise<AcsysDraftEntitiesResolveResult<AirplaneImageResolveItem>> { 
    this.logger.debug(`(AcsysDraftEntitiesResolver) resolving airplane images, ${this.formatResolveOptionsLog(options)}`);

    if(!!options.idsFilter && options.idsFilter.length === 0) {
      this.logger.debug(`(AcsysDraftEntitiesResolver) airplane images resolved, ${this.formatResolveOptionsLog(options)} - empty ids filter`);
      return {
        items: new Map<EntityId, AirplaneImageResolveItem>([]),
        notFoundIds: undefined
      };
    }
    this.validateAndPrepareResolveOptions(options, false);

    const queryWhereFilter = {
      ...(options.idsFilter ? { airplaneId: { in: options.idsFilter } } : {}),
      ...(options.includeDeleted ? {} : { isDeleted: false })
    };

    this.logger.debug(`(AcsysDraftEntitiesResolver) resolving airplane images - querying drafts`);
    const drafts = (await this.dbRepository.acsysDraftsAirplaneImage.findMany({
      where: queryWhereFilter,
      select: {
        id: true,
        airplaneId: true,
        imageId: true,
        kind: true,
        orderNum: true,
        createdUtc: true,
        modifiedUtc: true,
        isDeleted: true
      }
    }));
    this.logger.debug(`(AcsysDraftEntitiesResolver) resolving airplane images - querying published`);
    const published = await this.dbRepository.airplaneImage.findMany({
      where: queryWhereFilter,
      select: {
        id: true,
        airplaneId: true,
        imageId: true,
        kind: true,
        orderNum: true,
        createdUtc: true,
        modifiedUtc: true,
        isDeleted: true
      }
    });

    const allUnresolved = [...(drafts ?? []), ...(published ?? [])];

    const imageIds = allUnresolved.map(x => x.imageId);
    this.logger.debug(`(AcsysDraftEntitiesResolver) resolving airplane images - Image entities`);
    const resolvedImages = await this.resolveImageFileInfos(this.buildNestedEntitiesResolveOptions(imageIds, options));

    const draftIds = new Set<EntityId>(drafts.map(d => d.id));
    const itemList: AirplaneImageResolveItem[] = [];
    for(let i = 0; i < allUnresolved.length; i++) {
      const unresolved = allUnresolved[i];
      const image = resolvedImages.items.get(unresolved.imageId);
      if(!image) {
        this.throwOnNestedEntityNotFoundIfNeeded(options, unresolved.imageId, 'Image');
        continue;
      };
    
      itemList.push({
        image: {
          slug: image.slug,
          timestamp: image.file.modifiedUtc.getTime(),
        },
        airplaneId: unresolved.airplaneId,
        kind: unresolved.kind.toString().toLowerCase() as AirplaneImageKind,
        order: unresolved.orderNum,
        createdUtc: unresolved.createdUtc,
        modifiedUtc: unresolved.modifiedUtc,
        id: unresolved.id,
        isDeleted: unresolved.isDeleted,
        previewMode: draftIds.has(unresolved.id) 
      });
    }
    const result = this.buildResolveResult(options, itemList);
    
    this.logger.debug(`(AcsysDraftEntitiesResolver) airplane images resolved, ${this.formatResolveOptionsLog(options)}, ${this.formatResolveResultLog(options, result)}`);
    return result;
  }

  public async resolveAuthFormImages(options: AcsysDraftEntitiesResolveOptions): Promise<AcsysDraftEntitiesResolveResult<IAuthFormImageInfo>> { 
    this.logger.debug(`(AcsysDraftEntitiesResolver) resolving auth form images, ${this.formatResolveOptionsLog(options)}`);

    if(!!options.idsFilter && options.idsFilter.length === 0) {
      this.logger.debug(`(AcsysDraftEntitiesResolver) auth form images resolved, ${this.formatResolveOptionsLog(options)} - empty ids filter`);
      return {
        items: new Map<EntityId, IAuthFormImageInfo>([]),
        notFoundIds: undefined
      };
    }
    this.validateAndPrepareResolveOptions(options, false);

    this.logger.debug(`(AcsysDraftEntitiesResolver) resolving auth form images - querying drafts`);
    const drafts = (await this.dbRepository.acsysDraftsAuthFormImage.findMany({
      where: this.buildWhereIdQueryFilter(options),
      select: {
        id: true,
        imageId: true,
        orderNum: true,
        createdUtc: true,
        modifiedUtc: true,
        isDeleted: true
      }
    }));
    this.logger.debug(`(AcsysDraftEntitiesResolver) resolving auth form images - querying published`);
    const published = await this.dbRepository.authFormImage.findMany({
      where: this.buildWhereIdQueryFilter(options),
      select: {
        id: true,
        imageId: true,
        orderNum: true,
        createdUtc: true,
        modifiedUtc: true,
        isDeleted: true
      }
    });

    const allUnresolved = [...(drafts ?? []), ...(published ?? [])];

    const imageIds = allUnresolved.map(x => x.imageId);
    this.logger.debug(`(AcsysDraftEntitiesResolver) resolving auth form images - Image entities`);
    const resolvedImages = await this.resolveImageFileInfos(this.buildNestedEntitiesResolveOptions(imageIds, options));

    const draftIds = new Set<EntityId>(drafts.map(d => d.id));
    const itemList: IAuthFormImageInfo[] = [];
    for(let i = 0; i < allUnresolved.length; i++) {
      const unresolved = allUnresolved[i];
      const image = resolvedImages.items.get(unresolved.imageId);
      if(!image) {
        this.throwOnNestedEntityNotFoundIfNeeded(options, unresolved.imageId, 'Image');
        continue;
      };
    
      itemList.push({
        image: {
          slug: image.slug,
          timestamp: image.file.modifiedUtc.getTime(),
        },
        order: unresolved.orderNum,
        createdUtc: unresolved.createdUtc,
        modifiedUtc: unresolved.modifiedUtc,
        id: unresolved.id,
        isDeleted: unresolved.isDeleted,
        previewMode: draftIds.has(unresolved.id) 
      });
    }
    const result = this.buildResolveResult(options, itemList);
    
    this.logger.debug(`(AcsysDraftEntitiesResolver) auth form images resolved, ${this.formatResolveOptionsLog(options)}, ${this.formatResolveResultLog(options, result)}`);
    return result;
  }

  public async resolveAirplanes(options: AcsysDraftEntitiesResolveOptions): Promise<AcsysDraftEntitiesResolveResult<IAirplane>> {
    this.logger.debug(`(AcsysDraftEntitiesResolver) resolving airplanes, ${this.formatResolveOptionsLog(options)}`);

    if(!!options.idsFilter && options.idsFilter.length === 0) {
      this.logger.debug(`(AcsysDraftEntitiesResolver) airplanes resolved, ${this.formatResolveOptionsLog(options)} - empty ids filter`);
      return {
        items: new Map<EntityId, IAirplane>([]),
        notFoundIds: undefined
      };
    }
    this.validateAndPrepareResolveOptions(options, false);

    this.logger.debug(`(AcsysDraftEntitiesResolver) resolving airplanes - querying drafts`);
    const drafts = (await this.dbRepository.acsysDraftsAirplane.findMany({
      where: this.buildWhereIdQueryFilter(options),
      select: {
        id: true,
        nameStrId: true,
        createdUtc: true,
        modifiedUtc: true,
        isDeleted: true
      }
    }));
    let published: (typeof drafts) | undefined;
    if(options.idsFilter === undefined || drafts.length !== options.idsFilter.length) {
      this.logger.debug(`(AcsysDraftEntitiesResolver) resolving airplanes - querying published`);
      published = await this.dbRepository.airplane.findMany({
        where: this.buildWhereIdQueryFilter(options),
        select: {
          id: true,
          nameStrId: true,
          createdUtc: true,
          modifiedUtc: true,
          isDeleted: true
        }
      });
    }
    this.throwOnRequestEntityNotFoundIfNeeded(options, 'Airplane', drafts, published);
    const allUnresolved = [...(drafts ?? []), ...(published ?? [])];

    const nameStrIds = allUnresolved.map(x => x.nameStrId);
    this.logger.debug(`(AcsysDraftEntitiesResolver) resolving airplanes - names`);
    const resolvedNames = await this.resolveLocalizeableValues(this.buildNestedEntitiesResolveOptions(nameStrIds, options));

    const airplaneIds = allUnresolved.map(x => x.id);
    this.logger.debug(`(AcsysDraftEntitiesResolver) resolving airplanes - airplane images`);
    const resolvedAirplaneImages = (await this.resolveAirplaneImages(this.buildNestedEntitiesResolveOptions(airplaneIds, options)));
    const airplaneImagesMap = new Map(toPairs(groupBy(
      Array.from(resolvedAirplaneImages.items.values()),
      i => i.airplaneId
    )));

    const draftIds = new Set<EntityId>(drafts.map(d => d.id));
    const itemList: IAirplane[] = [];
    for(let i = 0; i < allUnresolved.length; i++) {
      const unresolved = allUnresolved[i];
      const name = resolvedNames.items.get(unresolved.nameStrId);
      if(!name) {
        this.throwOnNestedEntityNotFoundIfNeeded(options, unresolved.nameStrId, 'LocalizeableValue');
        continue;
      };
      const images = airplaneImagesMap.get(unresolved.id);
      if(!images?.length) { // at least 1 airplane image must be present
        this.throwOnNestedEntityNotFoundIfNeeded(options, unresolved.id, 'AirplaneImage');
        continue;
      }
    
      itemList.push({
        name,
        images,
        createdUtc: unresolved.createdUtc,
        modifiedUtc: unresolved.modifiedUtc,
        id: unresolved.id,
        isDeleted: unresolved.isDeleted,
        previewMode: draftIds.has(unresolved.id) 
      });
    }
    const result = this.buildResolveResult(options, itemList);
    
    this.logger.debug(`(AcsysDraftEntitiesResolver) airplanes resolved, ${this.formatResolveOptionsLog(options)}, ${this.formatResolveResultLog(options, result)}`);
    return result;
  }

  public async resolveCompanyReviews(options: AcsysDraftEntitiesResolveOptions): Promise<AcsysDraftEntitiesResolveResult<ICompanyReview & IEntity>> {
    this.logger.debug(`(AcsysDraftEntitiesResolver) resolving company reviews, ${this.formatResolveOptionsLog(options)}`);
    
    if(!!options.idsFilter && options.idsFilter.length === 0) {
      this.logger.debug(`(AcsysDraftEntitiesResolver) company reviews resolved, ${this.formatResolveOptionsLog(options)} - empty ids filter`);
      return {
        items: new Map<EntityId, ICompanyReview>([]),
        notFoundIds: undefined
      };
    }
    this.validateAndPrepareResolveOptions(options, false);

    this.logger.debug(`(AcsysDraftEntitiesResolver) resolving company reviews - querying drafts`);
    const drafts = (await this.dbRepository.acsysDraftsCompanyReview.findMany({
      where: this.buildWhereIdQueryFilter(options),
      select: { 
        id: true,
        headerStrId: true,
        bodyStrId: true,
        personNameStrId: true,
        imageId: true,
        modifiedUtc: true
      }
    }));
    let published: (typeof drafts) | undefined;
    if(options.idsFilter === undefined || drafts.length !== options.idsFilter.length) {
      this.logger.debug(`(AcsysDraftEntitiesResolver) resolving company reviews - querying published`);
      published = await this.dbRepository.companyReview.findMany({
        where: this.buildWhereIdQueryFilter(options),
        select: { 
          id: true,
          headerStrId: true,
          bodyStrId: true,
          personNameStrId: true,
          imageId: true,
          modifiedUtc: true
        }
      });
    }
    this.throwOnRequestEntityNotFoundIfNeeded(options, 'CompanyReview', drafts, published);
    const allUnresolved = [...(drafts ?? []), ...(published ?? [])];

    const textingIds =  flatten(allUnresolved.map(x => [x.headerStrId, x.bodyStrId, x.personNameStrId]));
    const imageIds = allUnresolved.map(x => x.imageId);
  
    this.logger.debug(`(AcsysDraftEntitiesResolver) resolving company reviews - textings`);
    const resolvedTextings = await this.resolveLocalizeableValues(this.buildNestedEntitiesResolveOptions(textingIds, options));
    this.logger.debug(`(AcsysDraftEntitiesResolver) resolving company reviews - images`);
    const resolvedImages = await this.resolveImageFileInfos(this.buildNestedEntitiesResolveOptions(imageIds, options));
    
    const draftIds = new Set<EntityId>(drafts.map(d => d.id));
    const itemList: (ICompanyReview & IEntity)[] = [];
    for(let i = 0; i < allUnresolved.length; i++) {
      const unresolved = allUnresolved[i];
      const headerStr = resolvedTextings.items.get(unresolved.headerStrId);
      if(!headerStr) {
        this.throwOnNestedEntityNotFoundIfNeeded(options, unresolved.headerStrId, 'LocalizeableValue');
        continue;
      };
      const bodyStr = resolvedTextings.items.get(unresolved.bodyStrId);
      if(!bodyStr) {
        this.throwOnNestedEntityNotFoundIfNeeded(options, unresolved.bodyStrId, 'LocalizeableValue');
        continue;
      };
      const personNameStr = resolvedTextings.items.get(unresolved.personNameStrId);
      if(!personNameStr) {
        this.throwOnNestedEntityNotFoundIfNeeded(options, unresolved.personNameStrId, 'LocalizeableValue');
        continue;
      };
      const image = resolvedImages.items.get(unresolved.imageId);
      if(!image) {
        this.throwOnNestedEntityNotFoundIfNeeded(options, unresolved.imageId, 'Image');
        continue;
      };
      
      itemList.push({
        body: bodyStr,
        header: headerStr,
        userName: personNameStr,
        id: unresolved.id,
        imgSlug: image.slug,
        timestamp: Math.max(image.file.modifiedUtc.getTime(), unresolved.modifiedUtc.getTime()),
        previewMode: draftIds.has(unresolved.id)
      });
    }
    const result = this.buildResolveResult(options, itemList);
    
    this.logger.debug(`(AcsysDraftEntitiesResolver) cities resolved, ${this.formatResolveOptionsLog(options)}, ${this.formatResolveResultLog(options, result)}`);
    return result;
  }
  
  public async resolveMailTemplates(options: AcsysDraftEntitiesResolveOptions): Promise<AcsysDraftEntitiesResolveResult<ILocalizableValue & IEntity>> {
    this.logger.debug(`(AcsysDraftEntitiesResolver) resolving mail templates, ${this.formatResolveOptionsLog(options)}`);
    
    if(!!options.idsFilter && options.idsFilter.length === 0) {
      this.logger.debug(`(AcsysDraftEntitiesResolver) mail templates resolved, ${this.formatResolveOptionsLog(options)} - empty ids filter`);
      return {
        items: new Map<EntityId, ILocalizableValue & IEntity>([]),
        notFoundIds: undefined
      };
    }
    this.validateAndPrepareResolveOptions(options, false);

    this.logger.debug(`(AcsysDraftEntitiesResolver) resolving mail templates - querying drafts`);
    const drafts = (await this.dbRepository.acsysDraftsMailTemplate.findMany({
      where: this.buildWhereIdQueryFilter(options),
      select: { 
        id: true,
        templateStrId: true,
        modifiedUtc: true
      }
    }));
    let published: (typeof drafts) | undefined;
    if(options.idsFilter === undefined || drafts.length !== options.idsFilter.length) {
      this.logger.debug(`(AcsysDraftEntitiesResolver) resolving mail templates - querying published`);
      published = await this.dbRepository.mailTemplate.findMany({
        where: this.buildWhereIdQueryFilter(options),
        select: { 
          id: true,
          templateStrId: true,
          modifiedUtc: true
        }
      });
    }
    this.throwOnRequestEntityNotFoundIfNeeded(options, 'MailTemplate', drafts, published);
    const allUnresolved = [...(drafts ?? []), ...(published ?? [])];

    const templateStrIds =  allUnresolved.map(x => x.templateStrId);
    this.logger.debug(`(AcsysDraftEntitiesResolver) resolving mail templates - template refs`);
    const resolvedTemplateStrs = await this.resolveLocalizeableValues(this.buildNestedEntitiesResolveOptions(templateStrIds, options));
    
    const draftIds = new Set<EntityId>(drafts.map(d => d.id));
    const itemList: (ILocalizableValue & IEntity)[] = [];
    for(let i = 0; i < allUnresolved.length; i++) {
      const unresolved = allUnresolved[i];
      const templateStr = resolvedTemplateStrs.items.get(unresolved.templateStrId);
      if(!templateStr) {
        this.throwOnNestedEntityNotFoundIfNeeded(options, unresolved.templateStrId, 'LocalizeableValue');
        continue;
      };
      
      itemList.push({
        ...templateStr,
        id: unresolved.id,
        previewMode: draftIds.has(unresolved.id)
      });
    }
    const result = this.buildResolveResult(options, itemList);
    
    this.logger.debug(`(AcsysDraftEntitiesResolver) mail templates resolved, ${this.formatResolveOptionsLog(options)}, ${this.formatResolveResultLog(options, result)}`);
    return result;
  }

  public async resolveFlights(options: AcsysDraftEntitiesResolveOptions): Promise<AcsysDraftEntitiesResolveResult<IFlight>> {
    this.logger.debug(`(AcsysDraftEntitiesResolver) resolving flights, ${this.formatResolveOptionsLog(options)}`);
    
    if(!!options.idsFilter && options.idsFilter.length === 0) {
      this.logger.debug(`(AcsysDraftEntitiesResolver) flights resolved, ${this.formatResolveOptionsLog(options)} - empty ids filter`);
      return {
        items: new Map<EntityId, IFlight>([]),
        notFoundIds: undefined
      };
    }
    this.validateAndPrepareResolveOptions(options, true);

    this.logger.debug(`(AcsysDraftEntitiesResolver) resolving flights - querying drafts`);
    const drafts = (await this.dbRepository.acsysDraftsFlight.findMany({
      where: this.buildWhereIdQueryFilter(options),
      select: {
        id: true,
        airlineCompanyId: true,
        airplaneId: true,
        arrivalAirportId: true,
        departmentAirportId: true,
        arrivalUtcPosix: true,
        departmentUtcPosix: true,
        isDeleted: true,
        createdUtc: true,
        modifiedUtc: true,
        dataHash: true
      }
    }));
    let published: (typeof drafts) | undefined;
    if(options.idsFilter === undefined || drafts.length !== options.idsFilter.length) {
      this.logger.debug(`(AcsysDraftEntitiesResolver) resolving flights - querying published`);
      published = await this.dbRepository.flight.findMany({
        where: this.buildWhereIdQueryFilter(options),
        select: {
          id: true,
          airlineCompanyId: true,
          airplaneId: true,
          arrivalAirportId: true,
          departmentAirportId: true,
          arrivalUtcPosix: true,
          departmentUtcPosix: true,
          isDeleted: true,
          createdUtc: true,
          modifiedUtc: true,
          dataHash: true
        }
      });
    }
    this.throwOnRequestEntityNotFoundIfNeeded(options, 'Flight', drafts, published);
    const allUnresolved = [...(drafts ?? []), ...(published ?? [])];

    const airlineCompanyIds = uniq(allUnresolved.map(x => x.airlineCompanyId));
    const airplaneIds = uniq(allUnresolved.map(x => x.airplaneId));
    const airportIds = uniq(flatten([...allUnresolved.map(x => x.arrivalAirportId), allUnresolved.map(x => x.departmentAirportId)]));

    this.logger.debug(`(AcsysDraftEntitiesResolver) resolving flights - airline companies`);
    const resolvedAirlineCompanies = await this.resolveAirlineCompanies(this.buildNestedEntitiesResolveOptions(airlineCompanyIds, options));
    this.logger.debug(`(AcsysDraftEntitiesResolver) resolving flights - airplanes`);
    const resolvedAirplanes = await this.resolveAirplanes(this.buildNestedEntitiesResolveOptions(airplaneIds, options));
    this.logger.debug(`(AcsysDraftEntitiesResolver) resolving flights - airports`);
    const resolvedAirports = await this.resolveAirports(this.buildNestedEntitiesResolveOptions(airportIds, options));
    
    const draftIds = new Set<EntityId>(drafts.map(d => d.id));
    const itemList: IFlight[] = [];
    for(let i = 0; i < allUnresolved.length; i++) {
      const unresolved = allUnresolved[i];
      const airlineCompany = resolvedAirlineCompanies.items.get(unresolved.airlineCompanyId);
      if(!airlineCompany) {
        this.throwOnNestedEntityNotFoundIfNeeded(options, unresolved.airlineCompanyId, 'AirlineCompany');
        continue;
      };
      const airplane = resolvedAirplanes.items.get(unresolved.airplaneId);
      if(!airplane) {
        this.throwOnNestedEntityNotFoundIfNeeded(options, unresolved.airplaneId, 'Airplane');
        continue;
      };
      const departAirport = resolvedAirports.items.get(unresolved.departmentAirportId);
      if(!departAirport) {
        this.throwOnNestedEntityNotFoundIfNeeded(options, unresolved.departmentAirportId, 'Airport');
        continue;
      };
      const arriveAirport = resolvedAirports.items.get(unresolved.arrivalAirportId);
      if(!arriveAirport) {
        this.throwOnNestedEntityNotFoundIfNeeded(options, unresolved.arrivalAirportId, 'Airport');
        continue;
      };

      itemList.push({
        airlineCompany,
        airplane,
        arriveAirport,
        departAirport,
        createdUtc: unresolved.createdUtc,
        modifiedUtc: unresolved.modifiedUtc,
        id: unresolved.id,
        isDeleted: unresolved.isDeleted,
        arriveTimeUtc: mapDbDate(unresolved.arrivalUtcPosix),
        departTimeUtc: mapDbDate(unresolved.departmentUtcPosix),
        dataHash: unresolved.dataHash,
        previewMode: draftIds.has(unresolved.id) 
      });
    }
    const result = this.buildResolveResult(options, itemList);
    
    this.logger.debug(`(AcsysDraftEntitiesResolver) flights resolved, ${this.formatResolveOptionsLog(options)}, ${this.formatResolveResultLog(options, result)}`);
    return result;
  }

  public async resolveFlightOffers(options: AcsysDraftEntitiesResolveOptions): Promise<AcsysDraftEntitiesResolveResult<IFlightOffer>> {
    this.logger.debug(`(AcsysDraftEntitiesResolver) resolving flight offers, ${this.formatResolveOptionsLog(options)}`);
    
    if(!!options.idsFilter && options.idsFilter.length === 0) {
      this.logger.debug(`(AcsysDraftEntitiesResolver) flight offers resolved, ${this.formatResolveOptionsLog(options)} - empty ids filter`);
      return {
        items: new Map<EntityId, IFlightOffer>([]),
        notFoundIds: undefined
      };
    }
    this.validateAndPrepareResolveOptions(options, true);

    this.logger.debug(`(AcsysDraftEntitiesResolver) resolving flight offers - querying drafts`);
    const drafts = (await this.dbRepository.acsysDraftsFlightOffer.findMany({
      where: this.buildWhereIdQueryFilter(options),
      select: {
        id: true,
        isDeleted: true,
        modifiedUtc: true,
        createdUtc: true,
        departFlightId: true,
        returnFlightId: true,
        class: true,
        numPassengers: true,
        totalPrice: true,
        dataHash: true
      }
    }));
    let published: (typeof drafts) | undefined;
    if(options.idsFilter === undefined || drafts.length !== options.idsFilter.length) {
      this.logger.debug(`(AcsysDraftEntitiesResolver) resolving flight offers - querying published`);
      published = await this.dbRepository.flightOffer.findMany({
        where: this.buildWhereIdQueryFilter(options),
        select: {
          id: true,
          isDeleted: true,
          modifiedUtc: true,
          createdUtc: true,
          departFlightId: true,
          returnFlightId: true,
          class: true,
          numPassengers: true,
          totalPrice: true,
          dataHash: true
        }
      });
    }
    this.throwOnRequestEntityNotFoundIfNeeded(options, 'FlightOffer', drafts, published);
    const allUnresolved = [...(drafts ?? []), ...(published ?? [])];

    const flightIds = uniq([...allUnresolved.map(x => x.departFlightId), ...allUnresolved.filter(x=> !!x.returnFlightId).map(x => x.returnFlightId!)]);
    this.logger.debug(`(AcsysDraftEntitiesResolver) resolving flight offers - flights`);
    const resolvedFlights = await this.resolveFlights(this.buildNestedEntitiesResolveOptions(flightIds, options));
    
    const draftIds = new Set<EntityId>(drafts.map(d => d.id));
    const itemList: IFlightOffer[] = [];
    for(let i = 0; i < allUnresolved.length; i++) {
      const unresolved = allUnresolved[i];
      const departFlight = resolvedFlights.items.get(unresolved.departFlightId);
      if(!departFlight) {
        this.throwOnNestedEntityNotFoundIfNeeded(options, unresolved.departFlightId, 'Flight');
        continue;
      };

      let arriveFlight: EntityDataAttrsOnly<IFlight> | undefined;
      if(unresolved.returnFlightId) {
        arriveFlight = resolvedFlights.items.get(unresolved.returnFlightId);
        if(!arriveFlight) {
          this.throwOnNestedEntityNotFoundIfNeeded(options, unresolved.returnFlightId, 'Flight');
          continue;
        };
      }
      
      itemList.push({
        createdUtc: unresolved.createdUtc,
        modifiedUtc: unresolved.modifiedUtc,
        id: unresolved.id,
        isDeleted: unresolved.isDeleted,
        class: unresolved.class as FlightClass,
        departFlight,
        arriveFlight,
        dataHash: unresolved.dataHash,
        isFavourite: false,
        kind: 'flights',
        numPassengers: unresolved.numPassengers,
        totalPrice: new Decimal(unresolved.totalPrice),
        previewMode: draftIds.has(unresolved.id) 
      });
    }
    const result = this.buildResolveResult(options, itemList);
    
    this.logger.debug(`(AcsysDraftEntitiesResolver) flight offers resolved, ${this.formatResolveOptionsLog(options)}, ${this.formatResolveResultLog(options, result)}`);
    return result;
  }

  public async resolveStayImages(options: AcsysDraftEntitiesResolveOptions): Promise<AcsysDraftEntitiesResolveResult<HotelImageResolveItem>> { 
    this.logger.debug(`(AcsysDraftEntitiesResolver) resolving stay images, ${this.formatResolveOptionsLog(options)}`);

    if(!!options.idsFilter && options.idsFilter.length === 0) {
      this.logger.debug(`(AcsysDraftEntitiesResolver) stay images resolved, ${this.formatResolveOptionsLog(options)} - empty ids filter`);
      return {
        items: new Map<EntityId, HotelImageResolveItem>([]),
        notFoundIds: undefined
      };
    }
    this.validateAndPrepareResolveOptions(options, true);

    const queryWhereFilter = {
      ...(options.idsFilter ? { hotelId: { in: options.idsFilter } } : {}),
      ...(options.includeDeleted ? {} : { isDeleted: false })
    };

    this.logger.debug(`(AcsysDraftEntitiesResolver) resolving stay images - querying drafts`);
    const drafts = (await this.dbRepository.acsysDraftsHotelImage.findMany({
      where: queryWhereFilter,
      select: {
        id: true,
        hotelId: true,
        imageId: true,
        serviceLevel: true,
        orderNum: true,
        createdUtc: true,
        modifiedUtc: true,
        isDeleted: true
      }
    }));
    this.logger.debug(`(AcsysDraftEntitiesResolver) resolving stay images - querying published`);
    const published = await this.dbRepository.hotelImage.findMany({
      where: queryWhereFilter,
      select: {
        id: true,
        hotelId: true,
        imageId: true,
        serviceLevel: true,
        orderNum: true,
        createdUtc: true,
        modifiedUtc: true,
        isDeleted: true
      }
    });

    const allUnresolved = [...(drafts ?? []), ...(published ?? [])];

    const imageIds = allUnresolved.map(x => x.imageId);
    this.logger.debug(`(AcsysDraftEntitiesResolver) resolving stay images - Image entities`);
    const resolvedImages = await this.resolveImageFileInfos(this.buildNestedEntitiesResolveOptions(imageIds, options));

    const draftIds = new Set<EntityId>(drafts.map(d => d.id));
    const itemList: HotelImageResolveItem[] = [];
    for(let i = 0; i < allUnresolved.length; i++) {
      const unresolved = allUnresolved[i];
      const image = resolvedImages.items.get(unresolved.imageId);
      if(!image) {
        this.throwOnNestedEntityNotFoundIfNeeded(options, unresolved.imageId, 'Image');
        continue;
      };
    
      itemList.push({
        image,
        hotelId: unresolved.hotelId,
        serviceLevel: unresolved.serviceLevel?.toString() as StayServiceLevel,
        order: unresolved.orderNum,
        createdUtc: unresolved.createdUtc,
        modifiedUtc: unresolved.modifiedUtc,
        id: unresolved.id,
        isDeleted: unresolved.isDeleted,
        previewMode: draftIds.has(unresolved.id) 
      });
    }
    const result = this.buildResolveResult(options, itemList);
    
    this.logger.debug(`(AcsysDraftEntitiesResolver) stay images resolved, ${this.formatResolveOptionsLog(options)}, ${this.formatResolveResultLog(options, result)}`);
    return result;
  }

  public async resolveStayDescriptions(options: AcsysDraftEntitiesResolveOptions): Promise<AcsysDraftEntitiesResolveResult<HoteDescriptionResolveItem>> { 
    this.logger.debug(`(AcsysDraftEntitiesResolver) resolving stay description, ${this.formatResolveOptionsLog(options)}`);

    if(!!options.idsFilter && options.idsFilter.length === 0) {
      this.logger.debug(`(AcsysDraftEntitiesResolver) stay description resolved, ${this.formatResolveOptionsLog(options)} - empty ids filter`);
      return {
        items: new Map<EntityId, HoteDescriptionResolveItem>([]),
        notFoundIds: undefined
      };
    }
    this.validateAndPrepareResolveOptions(options, true);

    const queryWhereFilter = {
      ...(options.idsFilter ? { hotelId: { in: options.idsFilter } } : {}),
      ...(options.includeDeleted ? {} : { isDeleted: false })
    };

    this.logger.debug(`(AcsysDraftEntitiesResolver) resolving stay description - querying drafts`);
    const drafts = (await this.dbRepository.acsysDraftsHotelDescription.findMany({
      where: queryWhereFilter,
      select: {
        id: true,
        hotelId: true,
        paragraphKind: true,
        textStrId: true,
        orderNum: true,
        createdUtc: true,
        modifiedUtc: true,
        isDeleted: true
      }
    }));
    this.logger.debug(`(AcsysDraftEntitiesResolver) resolving stay description - querying published`);
    const published = await this.dbRepository.hotelDescription.findMany({
      where: queryWhereFilter,
      select: {
        id: true,
        hotelId: true,
        paragraphKind: true,
        textStrId: true,
        orderNum: true,
        createdUtc: true,
        modifiedUtc: true,
        isDeleted: true
      }
    });

    const allUnresolved = [...(drafts ?? []), ...(published ?? [])];

    const textStrIds = allUnresolved.map(x => x.textStrId);
    this.logger.debug(`(AcsysDraftEntitiesResolver) resolving stay description - texts`);
    const resolvedTexts = await this.resolveLocalizeableValues(this.buildNestedEntitiesResolveOptions(textStrIds, options));

    const draftIds = new Set<EntityId>(drafts.map(d => d.id));
    const itemList: HoteDescriptionResolveItem[] = [];
    for(let i = 0; i < allUnresolved.length; i++) {
      const unresolved = allUnresolved[i];
      const textStr = resolvedTexts.items.get(unresolved.textStrId);
      if(!textStr) {
        this.throwOnNestedEntityNotFoundIfNeeded(options, unresolved.textStrId, 'LocalizeableValue');
        continue;
      };
    
      itemList.push({
        hotelId: unresolved.hotelId,
        paragraphKind: unresolved.paragraphKind.toString() as StayDescriptionParagraphType,
        textStr,
        order: unresolved.orderNum,
        createdUtc: unresolved.createdUtc,
        modifiedUtc: unresolved.modifiedUtc,
        id: unresolved.id,
        isDeleted: unresolved.isDeleted,
        previewMode: draftIds.has(unresolved.id) 
      });
    }
    const result = this.buildResolveResult(options, itemList);
    
    this.logger.debug(`(AcsysDraftEntitiesResolver) stay description resolved, ${this.formatResolveOptionsLog(options)}, ${this.formatResolveResultLog(options, result)}`);
    return result;
  }

  public async resolveStays(options: AcsysDraftEntitiesResolveOptions): Promise<AcsysDraftEntitiesResolveResult<IStay>> {
    this.logger.debug(`(AcsysDraftEntitiesResolver) resolving stays, ${this.formatResolveOptionsLog(options)}`);
    
    if(!!options.idsFilter && options.idsFilter.length === 0) {
      this.logger.debug(`(AcsysDraftEntitiesResolver) stays resolved, ${this.formatResolveOptionsLog(options)} - empty ids filter`);
      return {
        items: new Map<EntityId, IStay>([]),
        notFoundIds: undefined
      };
    }
    this.validateAndPrepareResolveOptions(options, false);

    this.logger.debug(`(AcsysDraftEntitiesResolver) resolving stays - querying drafts`);
    const drafts = (await this.dbRepository.acsysDraftsHotel.findMany({
      where: this.buildWhereIdQueryFilter(options),
      select: {
        id: true,
        cityId: true,
        lat: true,
        lon: true,
        nameStrId: true,
        slug: true,
        isDeleted: true,
        createdUtc: true,
        modifiedUtc: true
      }
    }));
    let published: (typeof drafts) | undefined;
    if(options.idsFilter === undefined || drafts.length !== options.idsFilter.length) {
      this.logger.debug(`(AcsysDraftEntitiesResolver) resolving stays - querying published`);
      published = await this.dbRepository.hotel.findMany({
        where: this.buildWhereIdQueryFilter(options),
        select: {
          id: true,
          cityId: true,
          lat: true,
          lon: true,
          nameStrId: true,
          slug: true,
          isDeleted: true,
          createdUtc: true,
          modifiedUtc: true
        }
      });
    }
    this.throwOnRequestEntityNotFoundIfNeeded(options, 'Hotel', drafts, published);
    const allUnresolved = [...(drafts ?? []), ...(published ?? [])];

    const cityIds = uniq(allUnresolved.map(x => x.cityId));
    const nameStrIds = uniq(allUnresolved.map(x => x.nameStrId));

    this.logger.debug(`(AcsysDraftEntitiesResolver) resolving stays - cities`);
    const resolvedCities = await this.resolveCities(this.buildNestedEntitiesResolveOptions(cityIds, options));
    this.logger.debug(`(AcsysDraftEntitiesResolver) resolving stays - names`);
    const resolvedNames = await this.resolveLocalizeableValues(this.buildNestedEntitiesResolveOptions(nameStrIds, options));
    const stayIds = allUnresolved.map(x => x.id);

    this.logger.debug(`(AcsysDraftEntitiesResolver) resolving stays - stay images`);
    const resolveStayImages = (await this.resolveStayImages(this.buildNestedEntitiesResolveOptions(stayIds, options)));
    const stayImagesMap = new Map(toPairs(groupBy(
      Array.from(resolveStayImages.items.values()), 
      i => i.hotelId
    )));

    const resolvedStayDescriptions = (await this.resolveStayDescriptions(this.buildNestedEntitiesResolveOptions(stayIds, options)));
    this.logger.debug(`(AcsysDraftEntitiesResolver) resolving stays - stay descriptions`);
    const stayDescriptionsMap = new Map(toPairs(groupBy(
      Array.from(resolvedStayDescriptions.items.values()), 
      i => i.hotelId
    )));
    
    const draftIds = new Set<EntityId>(drafts.map(d => d.id));
    const itemList: IStay[] = [];
    for(let i = 0; i < allUnresolved.length; i++) {
      const unresolved = allUnresolved[i];
      const city = resolvedCities.items.get(unresolved.cityId);
      if(!city) {
        this.throwOnNestedEntityNotFoundIfNeeded(options, unresolved.cityId, 'City');
        continue;
      };
      const name = resolvedNames.items.get(unresolved.nameStrId);
      if(!name) {
        this.throwOnNestedEntityNotFoundIfNeeded(options, unresolved.nameStrId, 'LocalizeableValue');
        continue;
      };
      const images = stayImagesMap.get(unresolved.id);
      if(!images?.length) { // at least 1 stay image must be present
        this.throwOnNestedEntityNotFoundIfNeeded(options, unresolved.id, 'HotelImage');
        continue;
      }
      const description = stayDescriptionsMap.get(unresolved.id);
      if(!description?.length) { // at least 1 stay description must be present
        this.throwOnNestedEntityNotFoundIfNeeded(options, unresolved.id, 'HotelDescription');
        continue;
      }

      itemList.push({
        city,
        name,
        slug: unresolved.slug,
        geo: {
          lat: mapDbGeoCoord(unresolved.lat),
          lon: mapDbGeoCoord(unresolved.lon)
        },
        images: orderBy(images.map(img => {
          return <IStayImageShort>{
            order: img.order,
            slug: img.image.slug,
            timestamp: img.modifiedUtc.getTime(),
            serviceLevel: img.serviceLevel
          };
        }), img => img.order, 'asc'),
        description,
        reviews: [], // ignoring reviews in preview mode
        createdUtc: unresolved.createdUtc,
        modifiedUtc: unresolved.modifiedUtc,
        id: unresolved.id,
        isDeleted: unresolved.isDeleted,
        previewMode: draftIds.has(unresolved.id) 
      });
    }
    const result = this.buildResolveResult(options, itemList);
    
    this.logger.debug(`(AcsysDraftEntitiesResolver) stays resolved, ${this.formatResolveOptionsLog(options)}, ${this.formatResolveResultLog(options, result)}`);
    return result;
  }

  public async resolveStayOffers(options: AcsysDraftEntitiesResolveOptions): Promise<AcsysDraftEntitiesResolveResult<IStayOfferDetails>> {
    this.logger.debug(`(AcsysDraftEntitiesResolver) resolving stay offers, ${this.formatResolveOptionsLog(options)}`);
    
    if(!!options.idsFilter && options.idsFilter.length === 0) {
      this.logger.debug(`(AcsysDraftEntitiesResolver) stay offers resolved, ${this.formatResolveOptionsLog(options)} - empty ids filter`);
      return {
        items: new Map<EntityId, IStayOfferDetails>([]),
        notFoundIds: undefined
      };
    }
    this.validateAndPrepareResolveOptions(options, true);

    this.logger.debug(`(AcsysDraftEntitiesResolver) resolving stay offers - querying drafts`);
    const drafts = (await this.dbRepository.acsysDraftsStayOffer.findMany({
      where: this.buildWhereIdQueryFilter(options),
      select: {
        id: true,
        isDeleted: true,
        modifiedUtc: true,
        createdUtc: true,
        checkInPosix: true,
        checkOutPosix: true,
        hotelId: true,
        numGuests: true,
        numRooms: true,
        totalPrice: true,
        dataHash: true
      }
    }));
    let published: (typeof drafts) | undefined;
    if(options.idsFilter === undefined || drafts.length !== options.idsFilter.length) {
      this.logger.debug(`(AcsysDraftEntitiesResolver) resolving stay offers - querying published`);
      published = await this.dbRepository.stayOffer.findMany({
        where: this.buildWhereIdQueryFilter(options),
        select: {
          id: true,
          isDeleted: true,
          modifiedUtc: true,
          createdUtc: true,
          checkInPosix: true,
          checkOutPosix: true,
          hotelId: true,
          numGuests: true,
          numRooms: true,
          totalPrice: true,
          dataHash: true
        }
      });
    }
    this.throwOnRequestEntityNotFoundIfNeeded(options, 'StayOffer', drafts, published);
    const allUnresolved = [...(drafts ?? []), ...(published ?? [])];

    const hotelIds = uniq(allUnresolved.map(x => x.hotelId));
    this.logger.debug(`(AcsysDraftEntitiesResolver) resolving stay offers - hotels`);
    const resolvedStays = await this.resolveStays(this.buildNestedEntitiesResolveOptions(hotelIds, options));
    
    const draftIds = new Set<EntityId>(drafts.map(d => d.id));
    const itemList: IStayOfferDetails[] = [];
    for(let i = 0; i < allUnresolved.length; i++) {
      const unresolved = allUnresolved[i];
      const hotel = resolvedStays.items.get(unresolved.hotelId);
      if(!hotel) {
        this.throwOnNestedEntityNotFoundIfNeeded(options, unresolved.hotelId, 'Hotel');
        continue;
      };
      const photo = hotel.images.find(x => x.order === 0);
      if(!photo) {
        this.logger.warn(`(AcsysDraftEntitiesResolver) hotel does not contain main photo, hotelId=${hotel.id}, ${this.formatResolveOptionsLog(options)}`);
        throw new AppException(AppExceptionCodeEnum.OBJECT_NOT_FOUND, 'hotel main photo not found', 'error-page');
      };
      
      itemList.push({
        createdUtc: unresolved.createdUtc,
        modifiedUtc: unresolved.modifiedUtc,
        checkIn: mapDbDate(unresolved.checkInPosix),
        checkOut: mapDbDate(unresolved.checkOutPosix),
        numGuests: unresolved.numGuests,
        numRooms: unresolved.numRooms,
        stay: {
          city: hotel.city,
          geo: hotel.geo,
          id: hotel.id,
          name: hotel.name,
          photo,
          slug: hotel.slug,
          reviewSummary: { // ignore reviews in preview mode
            numReviews: 0,
            score: DefaultStayReviewScore
          },
          description: hotel.description,
          images: hotel.images
        },
        prices: { // ignore precice price computation in preview mode
          Base: new Decimal(100),
          CityView1: new Decimal(200),
          CityView2: new Decimal(300),
          CityView3: new Decimal(400)
        },
        id: unresolved.id,
        isDeleted: unresolved.isDeleted,
        dataHash: unresolved.dataHash,
        isFavourite: false,
        kind: 'stays',
        totalPrice: new Decimal(unresolved.totalPrice),
        previewMode: draftIds.has(unresolved.id) 
      });
    }
    const result = this.buildResolveResult(options, itemList);
    
    this.logger.debug(`(AcsysDraftEntitiesResolver) stay offers resolved, ${this.formatResolveOptionsLog(options)}, ${this.formatResolveResultLog(options, result)}`);
    return result;
  }
}
