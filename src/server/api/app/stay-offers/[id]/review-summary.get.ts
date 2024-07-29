import type { H3Event } from 'h3';
import { defineWebApiEventHandler } from '../../../../utils/webapi-event-handler';
import { type IReviewSummaryDto } from '../../../../dto';
import { AppException, AppExceptionCodeEnum } from '../../../../../shared/exceptions';
import { type EntityId } from '../../../../../shared/interfaces';

export default defineWebApiEventHandler(async (event : H3Event) => {
  const logger = ServerServicesLocator.getLogger();
  const staysLogic = ServerServicesLocator.getStaysLogic();

  const offerParam = getRouterParams(event)?.id?.toString() ?? '';
  const stayOfferId: EntityId | undefined = offerParam;
  if(!(stayOfferId?.length ?? 0)) {
    logger.warn(`(api:stay-review-summary) stay id parameter was not specified: param=${offerParam}`);
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
