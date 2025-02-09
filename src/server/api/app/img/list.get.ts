import { AppConfig, AppException, AppExceptionCodeEnum, ImageCategory } from '@golobe-demo/shared';
import { defineWebApiEventHandler } from '../../../utils/webapi-event-handler';
import type { IImageDetailsDto } from '../../../api-definitions';
import type { H3Event } from 'h3';
import toPairs from 'lodash-es/toPairs';
import dayjs from 'dayjs';
import max from 'lodash-es/max';
import { getServerServices } from '../../../../helpers/service-accessors';

export default defineWebApiEventHandler(async (event : H3Event) => {
  const imageLogic = getServerServices()!.getImageLogic();

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

  const imageInfo = await imageLogic.getAllImagesByCategory(category, false, event.context.preview.mode);
  const categoryImages = await imageLogic.resolveImageFiles(imageInfo, event, event.context.preview.mode);
  const modifiedSince = max(categoryImages.map(x => x.file.modifiedUtc)) ?? dayjs().utc().toDate();
  modifiedSince.setMilliseconds(0);
  handleCacheHeaders(event, (AppConfig.caching.intervalSeconds && !event.context.preview.mode) ? 
    {
      maxAge: AppConfig.caching.intervalSeconds,
      modifiedTime: modifiedSince,
      cacheControls: ['must-revalidate']
    } : {
      cacheControls: ['no-cache']
    }
  );

  setHeader(event, 'content-type', 'application/json');

  const result: IImageDetailsDto[] = categoryImages.map((imageInfo) => {
    return {
      slug: imageInfo.slug,
      stubCssStyle: toPairs(imageInfo.stubCssStyle).map(p => [p[0], p[1].toString()]),
      invertForDarkTheme: imageInfo.invertForDarkTheme
    };
  });
  return result;
}, { logResponseBody: false, authorizedOnly: false });
