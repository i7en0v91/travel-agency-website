import type { H3Event } from 'h3';
import { AppException, AppExceptionCodeEnum } from '../../../../shared/exceptions';
import type { EntityId } from '../../../../shared/interfaces';
import { type ITravelDetailsDto } from './../../../dto';
import { defineWebApiEventHandler } from './../../../utils/webapi-event-handler';
import AppConfig from './../../../../appconfig';

function readCityIdParameter (event : H3Event): EntityId {
  const query = getQuery(event);
  const cityIdParam = query.cityId as EntityId;
  if ((cityIdParam?.length ?? 0) === 0) {
    throw new AppException(AppExceptionCodeEnum.BAD_REQUEST, 'city [id] parameter was not specified in query', 'error-stub');
  }
  return cityIdParam;
}

export default defineWebApiEventHandler(async (event : H3Event) => {
  const cityId = readCityIdParameter(event);
  const citiesLogic = ServerServicesLocator.getCitiesLogic();
  const flightsLogic = ServerServicesLocator.getFlightsLogic();

  const travelDetails = await citiesLogic.getTravelDetails(cityId, event.context.preview.mode);
  const price = (await flightsLogic.getFlightPromoPrice(cityId, event.context.preview.mode)).toNumber();
  handleCacheHeaders(event, (AppConfig.caching.intervalSeconds && !event.context.preview.mode) ? 
    {
      maxAge: AppConfig.caching.intervalSeconds,
      modifiedTime: new Date(travelDetails.city.modifiedUtc.setMilliseconds(0)),
      cacheControls: ['must-revalidate']
    } : {
      cacheControls: ['no-cache']
    }
  );
  setHeader(event, 'content-type', 'application/json');

  const result: ITravelDetailsDto = {
    header: travelDetails.header,
    images: travelDetails.images,
    text: travelDetails.text,
    price,
    city: {
      id: travelDetails.city.id,
      slug: travelDetails.city.slug
    }
  };
  return result;
}, { logResponseBody: false, authorizedOnly: false });
