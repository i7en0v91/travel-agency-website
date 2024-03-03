import { H3Event } from 'h3';
import onHeaders from 'on-headers';
import { WebApiRoutes } from '../../../shared/constants';
import { AppException, AppExceptionCodeEnum } from '../../../shared/exceptions';
import type { EntityId } from '../../../shared/interfaces';
import { type ITravelDetailsDto } from './../../dto';
import { defineWebApiEventHandler } from './../../utils/webapi-event-handler';

function readCityIdParameter (event : H3Event): EntityId {
  const query = getQuery(event);
  const cityIdParam = query.cityId as string;
  if ((cityIdParam?.length ?? 0) === 0) {
    throw new AppException(AppExceptionCodeEnum.BAD_REQUEST, 'city [id] parameter was not specified in query', 'error-stub');
  }
  let cityId = 0;
  try {
    cityId = parseInt(cityIdParam);
  } catch (err: any) {
    throw new AppException(AppExceptionCodeEnum.BAD_REQUEST, 'failed to parse city [id] parameter', 'error-stub');
  }
  if (!cityId) {
    throw new AppException(AppExceptionCodeEnum.BAD_REQUEST, 'city [id] parameter has invalid format', 'error-stub');
  }
  return cityId;
}

export default defineWebApiEventHandler(async (event : H3Event) => {
  const cityId = readCityIdParameter(event);
  const citiesLogic = ServerServicesLocator.getCitiesLogic();
  const flightsLogic = ServerServicesLocator.getFlightsLogic();

  const travelDetails = await citiesLogic.getTravelDetails(cityId);
  const price = (await flightsLogic.getFlightPromoPrice(cityId)).toNumber();
  handleCacheHeaders(event, {
    maxAge: WebApiRoutes.OneHourCacheLatency,
    modifiedTime: new Date(travelDetails.city.modifiedUtc.setMilliseconds(0)),
    cacheControls: ['must-revalidate']
  });
  onHeaders(event.node.res, () => {
    setHeader(event, 'content-type', 'application/json');
  });

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
