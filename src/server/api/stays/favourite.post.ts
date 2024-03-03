import { H3Event } from 'h3';
import onHeaders from 'on-headers';
import isString from 'lodash-es/isString';
import { defineWebApiEventHandler } from '../../utils/webapi-event-handler';
import { type IToggleFavouriteOfferResultDto, ToggleFavouriteOfferDtoSchema } from '../../dto';
import type { EntityId } from '../../../shared/interfaces';
import { getServerSession } from '#auth';

export default defineWebApiEventHandler(async (event : H3Event) => {
  const staysLogic = ServerServicesLocator.getStaysLogic();

  const offerId = (ToggleFavouriteOfferDtoSchema.cast(await readBody(event))).offerId;

  const authSession = await getServerSession(event);
  let userId : EntityId | undefined = (authSession as any)?.id as EntityId;
  if (userId && isString(userId)) {
    userId = parseInt(userId);
  }

  const isFavourite = await staysLogic.toggleFavourite(offerId, userId);

  onHeaders(event.node.res, () => {
    setHeader(event, 'content-type', 'application/json');
  });

  const result: IToggleFavouriteOfferResultDto = {
    isFavourite
  };
  return result;
}, { logResponseBody: true, authorizedOnly: true, validationSchema: ToggleFavouriteOfferDtoSchema });
