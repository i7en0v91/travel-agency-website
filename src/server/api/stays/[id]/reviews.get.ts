import type { H3Event } from 'h3';
import { defineWebApiEventHandler } from '../../../utils/webapi-event-handler';
import { type IStayReviewsDto } from '../../../dto';
import { AppException, AppExceptionCodeEnum } from '../../../../shared/exceptions';
import { mapStayReview } from './../../../utils/mappers';
import { type EntityId } from './../../../../shared/interfaces';
import { getServerSession } from '#auth';
import { extractUserIdFromSession } from './../../../../server/utils/auth';

export default defineWebApiEventHandler(async (event : H3Event) => {
  const logger = ServerServicesLocator.getLogger();
  const staysLogic = ServerServicesLocator.getStaysLogic();

  const stayParam = getRouterParams(event)?.id?.toString() ?? '';
  if (!stayParam) {
    logger.warn(`(api:stay-reviews-post) stay id paramer was not speicifed: path=${event.path}`);
    throw new AppException(
      AppExceptionCodeEnum.BAD_REQUEST,
      'stay id parameter was not specified',
      'error-stub'
    );
  }

  const stayId: EntityId | undefined = stayParam;
  if(!stayId) {
    logger.warn(`(api:stay-reviews-post) stay id parameter was not specified: param=${stayParam}`);
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
    logger.debug(`(api:stay-reviews-post) checking user review: stayId=${stayId}, userId=${userId}`);
    const userReview = reviews.find(r => r.user.id === userId);
    if (userReview) {
      logger.verbose(`(api:stay-reviews-post) moving user review to top: stayId=${stayId}, userId=${userId}, reviewId=${userReview.id}`);
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
