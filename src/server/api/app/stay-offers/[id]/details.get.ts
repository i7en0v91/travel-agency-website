import { AppConfig, AppException, AppExceptionCodeEnum, type EntityId } from '@golobe-demo/shared';
import { extractUserIdFromSession } from './../../../../../server/utils/auth';
import { defineWebApiEventHandler } from '../../../../utils/webapi-event-handler';
import { mapStayOffer } from '../../../../utils/dto-mappers';
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
      'error-page'
    );
  }

  const offerId: EntityId | undefined = offerParam;
  const authSession = await getServerSession(event);
  const userId = extractUserIdFromSession(authSession);
  const stayOffer = await staysLogic.getStayOffer(offerId, userId ?? 'guest', event.context.preview.mode);

  handleCacheHeaders(event, (AppConfig.caching.intervalSeconds && !event.context.preview.mode) ? 
    {
      maxAge: AppConfig.caching.intervalSeconds,
    } : {
      cacheControls: ['no-cache']
    }
  );
  setHeader(event, 'content-type', 'application/json');

  return mapStayOffer(stayOffer);
}, { logResponseBody: true, authorizedOnly: false });
