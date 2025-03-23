import { QueryPagePreviewModeParam, AppConfig, validateObject, type CacheEntityType, type EntityId, type IEntityCacheItem, type IEntityCacheSlugItem, AppException, AppExceptionCodeEnum } from '@golobe-demo/shared';
import { defineWebApiEventHandler, getLogger as getWebApiLogger } from '../../utils/webapi-event-handler';
import { EntityCacheQuerySchema } from '../../api-definitions';
import type { H3Event } from 'h3';
import orderBy from 'lodash-es/orderBy';
import startCase from 'lodash-es/startCase';
import castArray from 'lodash-es/castArray';
import omit from 'lodash-es/omit';
import { getServerServices } from '../../../helpers/service-accessors';

function sortResultByRequestOrder <TItem extends IEntityCacheItem>(items: TItem[], idParamsOrder: EntityId[] | undefined, slugParamsOrder: string[] | undefined): TItem[] {
  if (!items.length) {
    return items;
  }
  const getItemIndex = (item: IEntityCacheItem) => ((slugParamsOrder?.length ?? 0) > 0 ? slugParamsOrder!.indexOf(((item as any) as IEntityCacheSlugItem).slug) : idParamsOrder!.indexOf(item.id));
  return orderBy(items.map((i) => { return { item: i, idx: getItemIndex(i) }; }), ['idx'], ['asc']).map(i => i.item);
}

export default defineWebApiEventHandler(async (event : H3Event) => {
  const logger = getWebApiLogger();
  const entityCacheLogic = getServerServices()!.getEntityCacheLogic();
  const query = getQuery(event);

  if (!query) {
    logger.warn('entity cache query is empty', undefined, { url: event.node.req.url });
    throw new AppException(
      AppExceptionCodeEnum.BAD_REQUEST,
      'entity cache query parameters were not specified',
      'error-stub'
    );
  }

  const validationError = await validateObject(omit(query, QueryPagePreviewModeParam), EntityCacheQuerySchema);
  if (validationError) {
    logger.warn('entity cache query does not match schema', undefined, { ...(query), ...{ url: event.node.req.url, msg: validationError.message } });
    throw new AppException(AppExceptionCodeEnum.BAD_REQUEST, 'entity cache query arguments has invalid format', 'error-stub');
  }

  const requestParams = EntityCacheQuerySchema.cast(query);
  if (!requestParams.ids && !requestParams.slugs) {
    logger.warn('entity cache query does not contain neither ID nor slug', undefined, { ...(query), ...{ url: event.node.req.url } });
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

  let httpCacheMaxAge = ((AppConfig.caching.entities.expiration as any)[requestParams.type.toLowerCase()] as number) ?? AppConfig.caching.entities.expiration.default;
  httpCacheMaxAge = Math.round(httpCacheMaxAge * 2 / 3); // a bit lower cache time on server to prevent potentially unpredicted behavior at expiration boundary time
  handleCacheHeaders(event, !event.context.preview.mode ? { maxAge: httpCacheMaxAge} : { cacheControls: ['no-cache'] });
  setHeader(event, 'content-type', 'application/json');

  return items;
}, { logResponseBody: true, authorizedOnly: false });
