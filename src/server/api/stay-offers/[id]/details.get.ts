import { H3Event } from 'h3';
import isString from 'lodash-es/isString';
import { defineWebApiEventHandler } from '../../../utils/webapi-event-handler';
import { WebApiRoutes } from '../../../../shared/constants';
import { type EntityId } from '../../../../shared/interfaces';
import { AppException, AppExceptionCodeEnum } from '../../../../shared/exceptions';
import { mapStayOffer } from '../../../utils/mappers';
import { getServerSession } from '#auth';

export default defineWebApiEventHandler(async (event : H3Event) => {
  const logger = ServerServicesLocator.getLogger();
  const staysLogic = ServerServicesLocator.getStaysLogic();

  const offerParam = getRouterParams(event)?.id?.toString() ?? '';
  if (!offerParam) {
    logger.warn(`(api:stay-details) stay offer id paramer was not speicifed: path=${event.path}`);
    throw new AppException(
      AppExceptionCodeEnum.BAD_REQUEST,
      'offerId parameter was not specified',
      'error-page'
    );
  }

  let offerId: number | undefined;
  try {
    offerId = parseInt(offerParam);
  } catch (err: any) {
    logger.warn(`(api:stay-details) failed to parse stay offer id: param=${offerParam}`);
    throw new AppException(
      AppExceptionCodeEnum.BAD_REQUEST,
      'failed to parse offerId parameter',
      'error-page'
    );
  }

  const authSession = await getServerSession(event);
  let userId : EntityId | undefined = (authSession as any)?.id as EntityId;
  if (userId && isString(userId)) {
    userId = parseInt(userId);
  }

  const stayOffer = await staysLogic.getStayOffer(offerId, userId ?? 'guest');

  handleCacheHeaders(event, {
    maxAge: WebApiRoutes.OneHourCacheLatency
  });
  setHeader(event, 'content-type', 'application/json');

  return mapStayOffer(stayOffer);
}, { logResponseBody: true, authorizedOnly: false });
