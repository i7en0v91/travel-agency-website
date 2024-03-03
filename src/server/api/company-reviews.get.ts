import { H3Event } from 'h3';
import onHeaders from 'on-headers';
import { defineWebApiEventHandler } from '../utils/webapi-event-handler';
import { WebApiRoutes } from '../../shared/constants';
import { type ICompanyReviewDto } from '../dto';

export default defineWebApiEventHandler(async (event : H3Event) => {
  const companyReviewsLogic = ServerServicesLocator.getCompanyReviewsLogic();
  const companyReviews = await companyReviewsLogic.getReviews();
  const modifiedSince = new Date(Math.max(...companyReviews.map(r => r.timestamp)));
  modifiedSince.setMilliseconds(0);
  handleCacheHeaders(event, {
    maxAge: WebApiRoutes.OneDayCacheLatency,
    modifiedTime: modifiedSince,
    cacheControls: ['must-revalidate']
  });

  onHeaders(event.node.res, () => {
    const response = event.node.res;
    response.setHeader('content-type', 'application/json');
  });

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
