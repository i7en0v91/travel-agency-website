import { type EntityId, AppException, AppExceptionCodeEnum } from '@golobe-demo/shared';
import { type ICreateOrUpdateStayReviewDto, type IModifyStayReviewResultDto, CreateOrUpdateStayReviewDtoSchema } from '../../../../api-definitions';
import { defineWebApiEventHandler } from '../../../../utils/webapi-event-handler';
import { extractUserIdFromSession } from './../../../../../server/utils/auth';
import { getServerSession } from '#auth';
import type { H3Event } from 'h3';
import { getCommonServices, getServerServices } from '../../../../../helpers/service-accessors';

export default defineWebApiEventHandler(async (event : H3Event) => {
  const logger = getCommonServices().getLogger().addContextProps({ component: 'WebApi' });
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

  const authSession = await getServerSession(event);
  const userId = extractUserIdFromSession(authSession);
  if (!userId) {
    logger.warn('unauthorized attempt', undefined, stayId);
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
