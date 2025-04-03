import type { IStayOffer, IFlightOffer, EntityDataAttrsOnly } from '@golobe-demo/shared';
import { getLogger as getWebApiLogger, defineWebApiEventHandler } from '../../utils/webapi-event-handler';
import { type ILoadOffersResultDto, LoadOffersDtoSchema } from '../../api-definitions';
import { mapSearchedFlightOffer, mapSearchedStayOffer } from '../../utils/dto-mappers';
import type { H3Event } from 'h3';
import { getServerServices } from '../../../helpers/service-accessors';

export default defineWebApiEventHandler(async (event : H3Event) => {
  const logger = getWebApiLogger();
  const serverServices = getServerServices()!;
  const flightsLogic = serverServices.getFlightsLogic();
  const staysLogic = serverServices.getStaysLogic();

  logger.debug('parsing stay offers search query from HTTP body');
  const requestDto = LoadOffersDtoSchema.cast(await readBody(event));
  const requestedIds = requestDto.ids;

  let flightOffers: EntityDataAttrsOnly<IFlightOffer>[] = [];
  let stayOffers: EntityDataAttrsOnly<IStayOffer>[] = [];
  if(requestedIds.length) {
    flightOffers = await flightsLogic.findOffers(requestedIds, event.context.preview.mode);
    stayOffers = await staysLogic.findOffers(requestedIds, event.context.preview.mode);
  }
  
  handleCacheHeaders(event, {
    cacheControls: ['no-cache'] // list of requested offer ids is passed in HTTP body, so caching is not possible
  });
  setHeader(event, 'content-type', 'application/json');

  const result: ILoadOffersResultDto = {
    flights: {
      entities: mapSearchFlightOfferResultEntities({
        pagedItems: flightOffers,
        totalCount: flightOffers.length
      }),
      items: flightOffers.map(mapSearchedFlightOffer)
    },
    stays: {
      entities: mapSearchStayOfferResultEntities({
        pagedItems: stayOffers,
        totalCount: stayOffers.length
      }),
      items: stayOffers.map(mapSearchedStayOffer)
    } 
  };
  return result;
}, { logResponseBody: false, authorizedOnly: false });
