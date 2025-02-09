import { type IStaySearchHistory, SessionStaySearchHistory } from '@golobe-demo/shared';
import { defineWebApiEventHandler } from '../../../utils/webapi-event-handler';
import type { ISearchedCityHistoryDto } from '../../../api-definitions';
import { getUserSessionValue } from '../../../utils/user-session';
import type { H3Event } from 'h3';
import { destr } from 'destr';
import { getCommonServices, getServerServices } from '../../../../helpers/service-accessors';

export default defineWebApiEventHandler(async (event : H3Event) => {
  const logger = getCommonServices().getLogger();
  const citiesLogic = getServerServices()!.getCitiesLogic();

  handleCacheHeaders(event, {
    cacheControls: ['no-cache'],
    maxAge: 0
  });
  setHeader(event, 'content-type', 'application/json');

  const result: ISearchedCityHistoryDto[] = [];
  const searchedCities = destr<IStaySearchHistory | undefined>(await getUserSessionValue(event, SessionStaySearchHistory));
  if (searchedCities?.popularCityIds?.length) {
    const popularCities = await citiesLogic.getPopularCities(event.context.preview.mode);
    const searchedItems = searchedCities!.popularCityIds.map(cid => popularCities.find(c => c.id === cid)).filter(c => c);
    for (let i = 0; i < searchedItems.length; i++) {
      const item = searchedItems[i];
      result.push(item!);
    }
    if (result.length < searchedCities.popularCityIds.length) {
      logger.warn(`(api:stay-search-history) not all searched cities from user session found in popular cities, result ids=[${result.map(c => c.id).join(', ')}], history ids=[${searchedCities.popularCityIds.join(', ')}]`);
    }
    logger.verbose(`(api:stay-search-history) returning stay search history items, count=${result.length}`);
  } else {
    logger.verbose('(api:stay-search-history) stay search history is empty');
  }

  return result;
}, { logResponseBody: false, authorizedOnly: false });
