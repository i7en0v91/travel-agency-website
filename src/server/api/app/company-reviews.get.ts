import { AppConfig } from '@golobe-demo/shared';
import type { H3Event } from 'h3';
import { defineWebApiEventHandler } from '../../utils/webapi-event-handler';
import type { ICompanyReviewDto } from '../../api-definitions';
import { getServerServices } from '../../../helpers/service-accessors';

export default defineWebApiEventHandler(async (event : H3Event) => {
  const companyReviewsLogic = getServerServices()!.getCompanyReviewsLogic();
  const companyReviews = await companyReviewsLogic.getReviews(event.context.preview.mode);
  const modifiedSince = new Date(Math.max(...companyReviews.map(r => r.timestamp)));
  modifiedSince.setMilliseconds(0);
  handleCacheHeaders(event, (AppConfig.caching.intervalSeconds && !event.context.preview.mode) ? 
    {
      maxAge: AppConfig.caching.intervalSeconds,
      modifiedTime: modifiedSince,
      cacheControls: ['must-revalidate']
    } : {
      cacheControls: ['no-cache']
    });

  setHeader(event, 'content-type', 'application/json');

  return companyReviews.map((item) => {
    const mapped: ICompanyReviewDto = {
      header: item.header,
      body: item.body,
      userName: item.userName,
      img: item.imgSlug
        ? {
            slug: item.imgSlug,
            timestamp: item.timestamp
          }
        : undefined,
      id: item.id
    };
    return mapped;
  });
}, { logResponseBody: false, authorizedOnly: false });
