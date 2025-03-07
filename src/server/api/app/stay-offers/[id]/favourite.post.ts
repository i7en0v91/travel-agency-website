import { AppException, AppExceptionCodeEnum, type EntityId } from '@golobe-demo/shared';
import { extractUserIdFromSession } from './../../../../../server/utils/auth';
import { defineWebApiEventHandler } from '../../../../utils/webapi-event-handler';
import type { IToggleFavouriteOfferResultDto } from '../../../../api-definitions';
import type { H3Event } from 'h3';
import { getServerSession } from '#auth';
import { getCommonServices, getServerServices } from '../../../../../helpers/service-accessors';


export default defineWebApiEventHandler(async (event : H3Event) => {
  const logger = getCommonServices().getLogger().addContextProps({ component: 'WebApi' });
  const staysLogic = getServerServices()!.getStaysLogic();

  const offerParam = getRouterParams(event)?.id?.toString() ?? '';
  if (!offerParam) {
    logger.warn('stay offer id paramer was not speicifed', undefined, { path: event.path });
    throw new AppException(
      AppExceptionCodeEnum.BAD_REQUEST,
      'offerId parameter was not specified',
      'error-stub'
    );
  }

  const offerId: EntityId | undefined = offerParam;
  const authSession = await getServerSession(event);
  const userId = await extractUserIdFromSession(authSession);
  if(!userId) {
    logger.warn('failed to obtain user id');
    throw new AppException(
      AppExceptionCodeEnum.BAD_REQUEST,
      'failed to obtain user id',
      'error-stub'
    );
  }
  const isFavourite = await staysLogic.toggleFavourite(offerId, userId);

  setHeader(event, 'content-type', 'application/json');

  const result: IToggleFavouriteOfferResultDto = {
    isFavourite
  };
  return result;
}, { logResponseBody: true, authorizedOnly: true });
