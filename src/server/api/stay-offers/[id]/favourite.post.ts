import { H3Event } from 'h3';
import isString from 'lodash-es/isString';
import { defineWebApiEventHandler } from '../../../utils/webapi-event-handler';
import { type IToggleFavouriteOfferResultDto } from '../../../dto';
import type { EntityId } from '../../../../shared/interfaces';
import { AppException, AppExceptionCodeEnum } from '../../../../shared/exceptions';
import { getServerSession } from '#auth';

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

  let offerId: number | undefined;
  try {
    offerId = parseInt(offerParam);
  } catch (err: any) {
    logger.warn(`(api:stay-favourite) failed to parse stay offer id: param=${offerParam}`);
    throw new AppException(
      AppExceptionCodeEnum.BAD_REQUEST,
      'failed to parse offerId parameter',
      'error-stub'
    );
  }

  const authSession = await getServerSession(event);
  let userId : EntityId | undefined = (authSession as any)?.id as EntityId;
  if (userId && isString(userId)) {
    userId = parseInt(userId);
  }

  const isFavourite = await staysLogic.toggleFavourite(offerId, userId);

  setHeader(event, 'content-type', 'application/json');

  const result: IToggleFavouriteOfferResultDto = {
    isFavourite
  };
  return result;
}, { logResponseBody: true, authorizedOnly: true });
