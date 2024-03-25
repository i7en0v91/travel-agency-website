import { H3Event } from 'h3';
import toPairs from 'lodash-es/toPairs';
import dayjs from 'dayjs';
import max from 'lodash-es/max';
import { defineWebApiEventHandler } from '../../utils/webapi-event-handler';
import { WebApiRoutes } from '../../../shared/constants';
import { ImageCategory } from '../../../shared/interfaces';
import { AppException, AppExceptionCodeEnum } from '../../../shared/exceptions';
import { type IImageDetailsDto } from '../../dto';

export default defineWebApiEventHandler(async (event : H3Event) => {
  const imageLogic = ServerServicesLocator.getImageLogic();

  const query = getQuery(event);
  const categoryParam = query?.category?.toString();

  if (!categoryParam) {
    throw new AppException(
      AppExceptionCodeEnum.BAD_REQUEST,
      'category parameter was not specified',
      'error-stub'
    );
  }

  const category = categoryParam as ImageCategory;
  if (!category || !Object.values(ImageCategory).includes(category)) {
    throw new AppException(
      AppExceptionCodeEnum.BAD_REQUEST,
      `category parameter was not (correctly) specified: category=${category}`,
      'error-stub'
    );
  }

  const imageInfos = await imageLogic.getAllImagesByCategory(category);
  const modifiedSince = max(imageInfos.map(x => x.file.modifiedUtc)) ?? dayjs().utc().toDate();
  modifiedSince.setMilliseconds(0);
  handleCacheHeaders(event, {
    maxAge: WebApiRoutes.ImageCacheLatency,
    modifiedTime: modifiedSince,
    cacheControls: ['must-revalidate']
  });

  setHeader(event, 'content-type', 'application/json');

  const result: IImageDetailsDto[] = imageInfos.map((imageInfo) => {
    return {
      slug: imageInfo.slug,
      stubCssStyle: toPairs(imageInfo.stubCssStyle).map(p => [p[0], p[1].toString()]),
      invertForDarkTheme: imageInfo.invertForDarkTheme
    };
  });
  return result;
}, { logResponseBody: false, authorizedOnly: false });
