import { H3Event } from 'h3';
import onHeaders from 'on-headers';
import { WebApiRoutes } from '../../shared/constants';
import { defineWebApiEventHandler } from './../utils/webapi-event-handler';
import { type IPopularCityDto } from './../dto';

export default defineWebApiEventHandler(async (event : H3Event) => {
  const citiesLogic = ServerServicesLocator.getCitiesLogic();

  if (process.env.NODE_ENV !== 'development') {
    handleCacheHeaders(event, {
      maxAge: WebApiRoutes.OneDayCacheLatency
    });
  }

  onHeaders(event.node.res, () => {
    setHeader(event, 'content-type', 'application/json');
  });

  const popularCityItems = await citiesLogic.getPopularCities();
  return popularCityItems.map((item) => {
    const mapped: IPopularCityDto = {
      promoPrice: 350, // TODO: implement some pricing logic
      ...item
    };
    return mapped;
  });
}, { logResponseBody: false, authorizedOnly: false });
