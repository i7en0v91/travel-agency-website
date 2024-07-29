import type { H3Event } from 'h3';
import { defineWebApiEventHandler } from '../../utils/webapi-event-handler';
import { type IPopularCityDto } from '../../dto';
import AppConfig from '../../../appconfig';

export default defineWebApiEventHandler(async (event : H3Event) => {
  const citiesLogic = ServerServicesLocator.getCitiesLogic();
  const flightsLogic = ServerServicesLocator.getFlightsLogic();

  handleCacheHeaders(event, 
    (AppConfig.caching.intervalSeconds && !event.context.preview.mode) ? 
      { maxAge: AppConfig.caching.intervalSeconds } : 
      { cacheControls: ['no-cache'] }
  );
  setHeader(event, 'content-type', 'application/json');

  const popularCityItems = await citiesLogic.getPopularCities(event.context.preview.mode);
  const result: IPopularCityDto[] = [];
  for (let i = 0; i < popularCityItems.length; i++) {
    const item = popularCityItems[i];
    const promoPrice = await flightsLogic.getFlightPromoPrice(item.id, event.context.preview.mode);
    result.push({
      promoPrice: promoPrice.toNumber(),
      ...item
    });
  }

  return result;
}, { logResponseBody: false, authorizedOnly: false });
