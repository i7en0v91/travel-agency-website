import type { H3Event } from 'h3';
import orderBy from 'lodash-es/orderBy';
import startCase from 'lodash-es/startCase';
import isString from 'lodash-es/isString';
import castArray from 'lodash-es/castArray';
import { defineWebApiEventHandler } from '../utils/webapi-event-handler';
import { AppException, AppExceptionCodeEnum } from '../../shared/exceptions';
import { type CacheEntityType, type EntityId, type IEntityCacheItem, type IEntityCacheSlugItem } from '../../shared/interfaces';
import { validateObject } from '../../shared/validation';
import { EntityCacheQuerySchema } from './../dto';
import AppConfig from './../../appconfig';

function sortResultByRequestOrder (items: IEntityCacheItem[], requestParamsOrder: EntityId[] | string[]): IEntityCacheItem[] {
  if (!items.length) {
    return items;
  }
  const getItemIndex = (item: IEntityCacheItem) => (isString(requestParamsOrder[0]) ? (<string[]>requestParamsOrder).indexOf(((item as any) as IEntityCacheSlugItem).slug) : (<EntityId[]>requestParamsOrder).indexOf(item.id));
  return orderBy(items.map((i) => { return { item: i, idx: getItemIndex(i) }; }), ['idx'], ['asc']).map(i => i.item);
}

export default defineWebApiEventHandler(async (event : H3Event) => {
  const logger = ServerServicesLocator.getLogger();
  const entityCacheLogic = ServerServicesLocator.getEntityCacheLogic();
  const query = getQuery(event);

  if (!query) {
    logger.warn(`(api:entity-cache) entity cache query is empty, url=${event.node.req.url}`, undefined, query);
    throw new AppException(
      AppExceptionCodeEnum.BAD_REQUEST,
      'entity cache query parameters were not specified',
      'error-stub'
    );
  }

  const validationError = validateObject(query, EntityCacheQuerySchema);
  if (validationError) {
    logger.warn(`(api:entity-cache) entity cache query does not match schema, url=${event.node.req.url}, msg=${validationError.message}, issues=${validationError.errors?.join('; ') ?? '[empty]'}]`, undefined, query);
    throw new AppException(AppExceptionCodeEnum.BAD_REQUEST, 'entity cache query arguments has invalid format', 'error-stub');
  }

  const requestParams = EntityCacheQuerySchema.cast(query);
  if (!requestParams.ids && !requestParams.slugs) {
    logger.warn(`(api:entity-cache) entity cache query does not contain neither ID nor slug, url=${event.node.req.url}`, undefined, query);
    throw new AppException(AppExceptionCodeEnum.BAD_REQUEST, 'entity cache query arguments has invalid format', 'error-stub');
  }
  requestParams.type = <CacheEntityType>startCase(requestParams.type);

  const idsOrSlugs = (requestParams.slugs ? (castArray(requestParams.slugs) as string[]) : (castArray(requestParams.ids) as number[]));
  let items = await entityCacheLogic.get(idsOrSlugs, requestParams.type);
  items = sortResultByRequestOrder(items, idsOrSlugs);

  let httpCacheMaxAge = ((AppConfig.caching.clientRuntime.expirationsSeconds as any)[requestParams.type.toLowerCase()] as number) ?? AppConfig.caching.clientRuntime.expirationsSeconds.default;
  httpCacheMaxAge = Math.round(httpCacheMaxAge * 2 / 3); // a bit lower cache time on server to prevent potentially unpredicted behavior at expiration boundary time
  handleCacheHeaders(event, {
    maxAge: httpCacheMaxAge
  });
  setHeader(event, 'content-type', 'application/json');

  return items;
}, { logResponseBody: true, authorizedOnly: false });
