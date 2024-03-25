import { H3Event } from 'h3';
import { validateObject } from '../../../shared/validation';
import { WebApiRoutes } from '../../../shared/constants';
import { AppException, AppExceptionCodeEnum } from '../../../shared/exceptions';
import { defineWebApiEventHandler } from './../../utils/webapi-event-handler';
import { CitiesSearchQuerySchema, type IListItemDto } from './../../dto';

export default defineWebApiEventHandler(async (event : H3Event) => {
  const logger = ServerServicesLocator.getLogger();
  const citiesLogic = ServerServicesLocator.getCitiesLogic();
  const query = getQuery(event);

  if (!query) {
    logger.warn(`(api:cities-search) cities search query is empty, url=${event.node.req.url}`, undefined, query);
    throw new AppException(
      AppExceptionCodeEnum.BAD_REQUEST,
      'search query parameters were not specified',
      'error-stub'
    );
  }

  const validationError = validateObject(query, CitiesSearchQuerySchema);
  if (validationError) {
    logger.warn(`(api:cities-search) cities search query does not match schema, url=${event.node.req.url}, msg=${validationError.message}, issues=${validationError.errors?.join('; ') ?? '[empty]'}]`, undefined, query);
    throw new AppException(AppExceptionCodeEnum.BAD_REQUEST, 'search query arguments has invalid format', 'error-stub');
  }

  const searchParams = CitiesSearchQuerySchema.cast(query);
  const searchResults = await citiesLogic.search(searchParams);

  if (process.env.NODE_ENV !== 'development') {
    handleCacheHeaders(event, {
      maxAge: WebApiRoutes.OneDayCacheLatency
    });
  }

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
