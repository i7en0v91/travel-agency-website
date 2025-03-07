import { AppPage, getPagePath, AppConfig, CheckInOutDateUrlFormat } from '@golobe-demo/shared'; 
import dayjs from 'dayjs';
import { getCommonServices } from '../helpers/service-accessors';

/**
 * Ensures that checkIn & checkOut date parameters are present in {@link AppPage.FindStays} url query.
 * Redirects to appropriate URL with default date range filled if parameters missed
 */
export default defineNuxtRouteMiddleware(async (to) => {
  if(!to.path.includes(getPagePath(AppPage.FindStays))) {
    return;
  }

  const logger = getCommonServices().getLogger().addContextProps({ component: 'RedirectionsSearchStaysDate' });
  if(!!to.query.checkIn && !!to.query.checkOut) {
    logger.debug('redirect not needed', { checkIn: to.query.checkIn, checkOut: to.query.checkOut });
    return;
  }
  
  const checkIn = dayjs().local().format(CheckInOutDateUrlFormat);
  const checkOut = dayjs().local().add(AppConfig.autoInputDatesRangeDays, 'day').format(CheckInOutDateUrlFormat);
  logger.verbose('date range is not specified for searech stay offers page, using default range', { checkIn, checkOut });
  to.query.checkIn = checkIn;
  to.query.checkOut = checkOut;
  return await navigateTo(to);
});