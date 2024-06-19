import type { H3Event } from 'h3';
import { defineWebApiEventHandler } from '../../../utils/webapi-event-handler';
import { type ICreateOrUpdateStayReviewDto, type IModifyStayReviewResultDto, CreateOrUpdateStayReviewDtoSchema } from '../../../dto';
import { AppException, AppExceptionCodeEnum } from '../../../../shared/exceptions';
import { getServerSession } from '#auth';
import { extractUserIdFromSession } from './../../../../server/utils/auth';
import { type EntityId } from './../../../../shared/interfaces';

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
      'stay id parameter not specified',
      'error-stub'
    );
  }

  const authSession = await getServerSession(event);
  const userId = extractUserIdFromSession(authSession);
  if (!userId) {
    logger.warn(`(api:stay-reviews-post) unauthorized attempt: stayId=${stayId}`);
    throw new AppException(
      AppExceptionCodeEnum.FORBIDDEN,
      'only authorized users can edit stay\'s reviews',
      'error-stub'
    );
  }

  const createOrUpdateStayReviewDto = await readBody(event) as ICreateOrUpdateStayReviewDto;
  const reviewId = await staysLogic.createOrUpdateReview(stayId, createOrUpdateStayReviewDto.textOrHtml, createOrUpdateStayReviewDto.score, userId);

  handleCacheHeaders(event, {
    cacheControls: ['no-cache'],
    maxAge: 0
  });
  setHeader(event, 'content-type', 'application/json');

  const result: IModifyStayReviewResultDto = {
    reviewId
  };
  return result;
}, { logResponseBody: true, authorizedOnly: true, validationSchema: CreateOrUpdateStayReviewDtoSchema });
