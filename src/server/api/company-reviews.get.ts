import type { H3Event } from 'h3';
import { defineWebApiEventHandler } from '../utils/webapi-event-handler';
import { type ICompanyReviewDto } from '../dto';
import AppConfig from './../../appconfig';

export default defineWebApiEventHandler(async (event : H3Event) => {
  const companyReviewsLogic = ServerServicesLocator.getCompanyReviewsLogic();
  const companyReviews = await companyReviewsLogic.getReviews();
  const modifiedSince = new Date(Math.max(...companyReviews.map(r => r.timestamp)));
  modifiedSince.setMilliseconds(0);
  handleCacheHeaders(event, 
    AppConfig.caching.htmlPageCachingSeconds ? {
      maxAge: AppConfig.caching.htmlPageCachingSeconds,
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
