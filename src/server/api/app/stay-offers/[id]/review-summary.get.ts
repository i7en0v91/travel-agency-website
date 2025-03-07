import { type EntityId, AppException, AppExceptionCodeEnum } from '@golobe-demo/shared';
import { defineWebApiEventHandler } from '../../../../utils/webapi-event-handler';
import type { IReviewSummaryDto } from '../../../../api-definitions';
import type { H3Event } from 'h3';
import { getCommonServices, getServerServices } from '../../../../../helpers/service-accessors';

export default defineWebApiEventHandler(async (event : H3Event) => {
  const logger = getCommonServices().getLogger().addContextProps({ component: 'WebApi' });
  const staysLogic = getServerServices()!.getStaysLogic();

  const offerParam = getRouterParams(event)?.id?.toString() ?? '';
  const stayOfferId: EntityId | undefined = offerParam;
  if(!(stayOfferId?.length ?? 0)) {
    logger.warn('stay id parameter was not specified', undefined, { param: offerParam });
    throw new AppException(
      AppExceptionCodeEnum.BAD_REQUEST,
      'failed to parse stay id parameter',
      'error-stub'
    );
  }

  const stayOffer = await staysLogic.getStayOffer(stayOfferId, 'guest', event.context.preview.mode);

  handleCacheHeaders(event, {
    cacheControls: ['no-cache'],
    maxAge: 0
  });
  setHeader(event, 'content-type', 'application/json');

  const stayReviewSummary = stayOffer.stay.reviewSummary;
  const result: IReviewSummaryDto = {
    numReviews: stayReviewSummary!.numReviews,
    score: stayReviewSummary!.score
  };
  return result;
}, { logResponseBody: true, authorizedOnly: false });
