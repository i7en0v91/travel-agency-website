import { type EntityId, AppException, AppExceptionCodeEnum } from '@golobe-demo/shared';
import { extractUserIdFromSession } from './../../../../../server/utils/auth';
import { defineWebApiEventHandler, getLogger as getWebApiLogger } from '../../../../utils/webapi-event-handler';
import type { IStayReviewsDto } from '../../../../api-definitions';
import { mapStayReview } from '../../../../utils/dto-mappers';
import { getServerSession } from '#auth';
import type { H3Event } from 'h3';
import { getServerServices } from '../../../../../helpers/service-accessors';

export default defineWebApiEventHandler(async (event : H3Event) => {
  const logger = getWebApiLogger();
  const staysLogic = getServerServices()!.getStaysLogic();

  const stayParam = getRouterParams(event)?.id?.toString() ?? '';
  const stayId: EntityId | undefined = stayParam;
  if(!(stayId?.length ?? 0)) {
    logger.warn('stay id parameter was not specified', undefined, { param: stayParam });
    throw new AppException(
      AppExceptionCodeEnum.BAD_REQUEST,
      'failed to parse stay id parameter',
      'error-stub'
    );
  }

  let reviews = await staysLogic.getStayReviews(stayId);

  const authSession = await getServerSession(event);
  const userId = extractUserIdFromSession(authSession);
  if (userId) {
    logger.debug('checking user review', { stayId, userId });
    const userReview = reviews.find(r => r.user.id === userId);
    if (userReview) {
      logger.verbose('moving user review to top', { stayId, userId, reviewId: userReview.id });
      reviews.splice(reviews.indexOf(userReview), 1);
      reviews = [userReview, ...reviews];
    }
  }

  handleCacheHeaders(event, {
    cacheControls: ['no-cache'],
    maxAge: 0
  });
  setHeader(event, 'content-type', 'application/json');

  const result: IStayReviewsDto = {
    reviews: reviews.map(mapStayReview)
  };
  return result;
}, { logResponseBody: false, authorizedOnly: false });
