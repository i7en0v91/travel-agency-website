import type { H3Event } from 'h3';
import { defineWebApiEventHandler } from '../../../../utils/webapi-event-handler';
import { type EntityId } from '../../../../../shared/interfaces';
import { AppException, AppExceptionCodeEnum } from '../../../../../shared/exceptions';
import { type IModifyStayReviewResultDto } from '../../../../dto';
import { getServerSession } from '#auth';
import { extractUserIdFromSession } from './../../../../../server/utils/auth';

export default defineWebApiEventHandler(async (event : H3Event) => {
  const logger = ServerServicesLocator.getLogger();
  const staysLogic = ServerServicesLocator.getStaysLogic();

  const stayParam = getRouterParams(event)?.id?.toString() ?? '';
  const stayId: EntityId | undefined = stayParam;
  if(!(stayId?.length ?? 0)) {
    logger.warn(`(api:stay-reviews-delete) stay id parameter was not specified: param=${stayParam}`);
    throw new AppException(
      AppExceptionCodeEnum.BAD_REQUEST,
      'failed to parse stay id parameter',
      'error-stub'
    );
  }

  const authSession = await getServerSession(event);
  const userId = extractUserIdFromSession(authSession);
  if (!userId) {
    logger.warn(`(api:stay-reviews-delete) unauthorized attempt: stayId=${stayId}`);
    throw new AppException(
      AppExceptionCodeEnum.FORBIDDEN,
      'only authorized users can edit stay\'s reviews',
      'error-stub'
    );
  }


  const reviewId = await staysLogic.deleteReview(stayId, userId);

  handleCacheHeaders(event, {
    cacheControls: ['no-cache'],
    maxAge: 0
  });
  setHeader(event, 'content-type', 'application/json');

  const result: Partial<IModifyStayReviewResultDto> = {
    reviewId
  };
  return result;
}, { logResponseBody: true, authorizedOnly: true });
