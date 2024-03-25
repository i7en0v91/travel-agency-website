import { H3Event } from 'h3';
import { WebApiRoutes } from '../../shared/constants';
import { defineWebApiEventHandler } from './../utils/webapi-event-handler';
import { type IPopularCityDto } from './../dto';

export default defineWebApiEventHandler(async (event : H3Event) => {
  const citiesLogic = ServerServicesLocator.getCitiesLogic();
  const flightsLogic = ServerServicesLocator.getFlightsLogic();

  if (process.env.NODE_ENV !== 'development') {
    handleCacheHeaders(event, {
      maxAge: WebApiRoutes.OneDayCacheLatency
    });
  }

  setHeader(event, 'content-type', 'application/json');

  const popularCityItems = await citiesLogic.getPopularCities();
  const result: IPopularCityDto[] = [];
  for (let i = 0; i < popularCityItems.length; i++) {
    const item = popularCityItems[i];
    const promoPrice = await flightsLogic.getFlightPromoPrice(item.id);
    result.push({
      promoPrice: promoPrice.toNumber(),
      ...item
    });
  }

  return result;
}, { logResponseBody: false, authorizedOnly: false });
