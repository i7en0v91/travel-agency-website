import type { H3Event } from 'h3';
import orderBy from 'lodash-es/orderBy';
import startCase from 'lodash-es/startCase';
import castArray from 'lodash-es/castArray';
import { defineWebApiEventHandler } from '../../utils/webapi-event-handler';
import { AppException, AppExceptionCodeEnum } from '../../../shared/exceptions';
import { type CacheEntityType, type EntityId, type IEntityCacheItem, type IEntityCacheSlugItem } from '../../../shared/interfaces';
import { validateObject } from '../../../shared/validation';
import { EntityCacheQuerySchema } from '../../dto';
import AppConfig from '../../../appconfig';

function sortResultByRequestOrder <TItem extends IEntityCacheItem>(items: TItem[], idParamsOrder: EntityId[] | undefined, slugParamsOrder: string[] | undefined): TItem[] {
  if (!items.length) {
    return items;
  }
  const getItemIndex = (item: IEntityCacheItem) => ((slugParamsOrder?.length ?? 0) > 0 ? slugParamsOrder!.indexOf(((item as any) as IEntityCacheSlugItem).slug) : idParamsOrder!.indexOf(item.id));
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

  let items: Awaited<ReturnType<typeof entityCacheLogic.get>>;
  if(requestParams.slugs) {
    items = await entityCacheLogic.get([], castArray(requestParams.slugs), requestParams.type, event.context.preview.mode);
    items = sortResultByRequestOrder(items, undefined, castArray(requestParams.slugs));
  } else {
    items = await entityCacheLogic.get(castArray(requestParams.ids) as EntityId[], [], requestParams.type, event.context.preview.mode);
    items = sortResultByRequestOrder(items, castArray(requestParams.ids), undefined);
  }

  let httpCacheMaxAge = ((AppConfig.caching.clientRuntime.expirationsSeconds as any)[requestParams.type.toLowerCase()] as number) ?? AppConfig.caching.clientRuntime.expirationsSeconds.default;
  httpCacheMaxAge = Math.round(httpCacheMaxAge * 2 / 3); // a bit lower cache time on server to prevent potentially unpredicted behavior at expiration boundary time
  handleCacheHeaders(event, !event.context.preview.mode ? { maxAge: httpCacheMaxAge} : { cacheControls: ['no-cache'] });
  setHeader(event, 'content-type', 'application/json');

  return items;
}, { logResponseBody: true, authorizedOnly: false });
