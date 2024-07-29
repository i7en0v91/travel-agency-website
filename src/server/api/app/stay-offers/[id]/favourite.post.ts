import type { H3Event } from 'h3';
import { defineWebApiEventHandler } from '../../../../utils/webapi-event-handler';
import { type IToggleFavouriteOfferResultDto } from '../../../../dto';
import type { EntityId } from '../../../../../shared/interfaces';
import { AppException, AppExceptionCodeEnum } from '../../../../../shared/exceptions';
import { getServerSession } from '#auth';
import { extractUserIdFromSession } from './../../../../../server/utils/auth';

export default defineWebApiEventHandler(async (event : H3Event) => {
  const logger = ServerServicesLocator.getLogger();
  const staysLogic = ServerServicesLocator.getStaysLogic();

  const offerParam = getRouterParams(event)?.id?.toString() ?? '';
  if (!offerParam) {
    logger.warn(`(api:stay-favourite) stay offer id paramer was not speicifed: path=${event.path}`);
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
    logger.warn('(api:stay-favourite) failed to obtain user id');
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
