import { H3Event } from 'h3';
import isString from 'lodash-es/isString';
import { defineWebApiEventHandler } from '../../../utils/webapi-event-handler';
import { type EntityId } from '../../../../shared/interfaces';
import { type ICreateOrUpdateStayReviewDto, type IModifyStayReviewResultDto, CreateOrUpdateStayReviewDtoSchema } from '../../../dto';
import { AppException, AppExceptionCodeEnum } from '../../../../shared/exceptions';
import { getServerSession } from '#auth';

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

  let stayId: number | undefined;
  try {
    stayId = parseInt(stayParam);
  } catch (err: any) {
    logger.warn(`(api:stay-reviews-post) failed to parse stay id: param=${stayParam}`);
    throw new AppException(
      AppExceptionCodeEnum.BAD_REQUEST,
      'failed to parse stay id parameter',
      'error-stub'
    );
  }

  const authSession = await getServerSession(event);
  let userId : EntityId | undefined = (authSession as any)?.id as EntityId;
  if (!userId) {
    logger.warn(`(api:stay-reviews-post) unauthorized attempt: stayId=${stayId}`);
    throw new AppException(
      AppExceptionCodeEnum.FORBIDDEN,
      'only authorized users can edit stay\'s reviews',
      'error-stub'
    );
  }

  if (isString(userId)) {
    userId = parseInt(userId);
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
