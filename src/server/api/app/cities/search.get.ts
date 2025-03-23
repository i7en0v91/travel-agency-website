import { QueryPagePreviewModeParam, AppConfig, AppException, AppExceptionCodeEnum, validateObject } from '@golobe-demo/shared';
import { CitiesSearchQuerySchema, type IListItemDto } from '../../../api-definitions';
import { defineWebApiEventHandler, getLogger as getWebApiLogger } from './../../../utils/webapi-event-handler';
import omit from 'lodash-es/omit';
import type { H3Event } from 'h3';
import { getServerServices } from '../../../../helpers/service-accessors';

export default defineWebApiEventHandler(async (event : H3Event) => {
  const serverServices = getServerServices()!;
  const logger = getWebApiLogger();
  const citiesLogic = serverServices.getCitiesLogic();
  const query = getQuery(event);

  if (!query) {
    logger.warn('cities search query is empty', undefined, { url: event.node.req.url });
    throw new AppException(
      AppExceptionCodeEnum.BAD_REQUEST,
      'search query parameters were not specified',
      'error-stub'
    );
  }

  const validationError = await validateObject(omit(query, QueryPagePreviewModeParam), CitiesSearchQuerySchema);
  if (validationError) {
    logger.warn('cities search query does not match schema', undefined, { ...(query), ...{ url: event.node.req.url, msg: validationError.message } });
    throw new AppException(AppExceptionCodeEnum.BAD_REQUEST, 'search query arguments has invalid format', 'error-stub');
  }

  const searchParams = CitiesSearchQuerySchema.cast(query);
  const searchResults = await citiesLogic.search(searchParams);

  handleCacheHeaders(event, 
    (AppConfig.caching.intervalSeconds && !event.context.preview.mode) ? 
      { maxAge: AppConfig.caching.intervalSeconds } : 
      { cacheControls: ['no-cache'] }
  );
  setHeader(event, 'content-type', 'application/json');

  return searchResults.map((r) => {
    const mapped: IListItemDto = {
      displayName: r.displayName,
      slug: r.slug,
      id: r.id
    };
    return mapped;
  });
}, { logResponseBody: false, authorizedOnly: false });
