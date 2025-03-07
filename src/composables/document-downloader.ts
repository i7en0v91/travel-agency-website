import { getPagePath, QueryPagePreviewModeParam, PreviewModeParamEnabledValue, getValueForFlightDayFormatting, type Theme, type Locale, getI18nResName2, type EntityId, type EntityDataAttrsOnly, type IFlightOffer, type IStayOfferDetails, type IStayOffer, AppException, AppExceptionCodeEnum, isElectronBuild, QueryInternalRequestParam, AppPage } from '@golobe-demo/shared';
import { defaultErrorHandler } from './../helpers/exceptions';
import { ApiEndpointBookingDownload } from './../server/api-definitions';
import type { IModalWaiter } from './../composables/modal-waiter';
import { saveAs } from 'file-saver';
import { getBytes } from './../helpers/rest-utils';
import { usePreviewState } from './../composables/preview-state';
import { withQuery } from 'ufo';
import set from 'lodash-es/set';
import { getCommonServices } from '../helpers/service-accessors';
import { getSystemServicesFacade } from '../helpers/electron';

globalThis.Blob = globalThis.Blob || Blob;
globalThis.Buffer = globalThis.Buffer || Buffer;

export interface IDocumentDownloader {
  download: (bookingId: EntityId, offer: EntityDataAttrsOnly<IFlightOffer | IStayOfferDetails | IStayOffer>, firstName: string | undefined, lastName: string | undefined, locale: Locale, theme: Theme) => Promise<void>
}

export function useDocumentDownloader (modalWaiter: IModalWaiter): IDocumentDownloader {
  const logger = getCommonServices().getLogger().addContextProps({ component: 'UseDocumentDownloader' });

  const { d, t } = useI18n();
  const { enabled } = usePreviewState();
  const navLinkBuilder = useNavLinkBuilder();
  
  const getFileName = (offer: EntityDataAttrsOnly<IFlightOffer | IStayOfferDetails | IStayOffer>, firstName?: string, lastName?: string): string => {
    const removeSysChars = (file: string): string => file.replaceAll(/[\s]/g, '').replaceAll(/[./\\]/g, '-');
  
    const userName = removeSysChars(`${firstName ?? ''} ${(lastName ?? '').length > 0 ? `${lastName!.substring(0, 1).toUpperCase()}` : ''}`);
  
    let dateFrom: Date;
    let dateTo: Date | undefined;
    if (offer.kind === 'flights') {
      const flightOffer = offer as EntityDataAttrsOnly<IFlightOffer>;
      dateFrom = getValueForFlightDayFormatting(flightOffer.departFlight.departTimeUtc, flightOffer.departFlight.departAirport.city.utcOffsetMin);
      if (flightOffer.arriveFlight) {
        dateTo = getValueForFlightDayFormatting(flightOffer.arriveFlight.departTimeUtc, flightOffer.arriveFlight.departAirport.city.utcOffsetMin);
      }
    } else {
      const stayOffer = offer as EntityDataAttrsOnly<IStayOffer>;
      dateFrom = stayOffer.checkIn;
      dateTo = stayOffer.checkOut;
    }
    const dateStr = removeSysChars(`${d(dateFrom, 'numeric')}${dateTo ? `_${(d(dateTo, 'numeric'))}` : ''}`);  
    const ext = isElectronBuild() ? 'jpeg' : 'pdf';

    return `${t(getI18nResName2('bookingCommon', 'docFileNamePrefix'))}_${userName}_${dateStr}.${ext}`;
  };

  const downloadFromServer = async (bookingId: EntityId, theme: Theme, locale: Locale): Promise<Blob> => {
    const path = `/${ApiEndpointBookingDownload(bookingId)}`;
    const searchQuery = {
      theme,
      locale,
      ...(enabled ? set({}, QueryPagePreviewModeParam, PreviewModeParamEnabledValue) : {})
    };
    const documentBytes = await getBytes(path, searchQuery, undefined, 'no-store', true, undefined, 'throw');
    if (!documentBytes?.byteLength) {
      logger.warn('failed to download document', undefined, { bookingId, locale, theme });
      throw new AppException(AppExceptionCodeEnum.DOCUMENT_GENERATION_FAILED, 'failed to download document', 'error-stub');
    }
    return new Blob(new Array(documentBytes));
  };

  const renderOffscreenImage = async (bookingId: EntityId, locale: Locale): Promise<Blob> => {
    const query = { 
      ...set({}, QueryInternalRequestParam, 1),
      ...(enabled ? set({}, QueryPagePreviewModeParam, PreviewModeParamEnabledValue) : {})
    }; 
    const path = withQuery(navLinkBuilder.buildLink(`/${getPagePath(AppPage.BookingDetails)}/${bookingId}`, locale), query);
    const systemServicesFacade = getSystemServicesFacade();
    const result = await systemServicesFacade.renderPageToImage(path);
    return new Blob([result]);
  };

  const download = async(bookingId: EntityId, offer: EntityDataAttrsOnly<IFlightOffer | IStayOfferDetails | IStayOffer>, firstName: string | undefined, lastName: string | undefined, locale: Locale, theme: Theme): Promise<void> => {
    if(!import.meta.client) {
      logger.warn('applicable only on client-side', undefined, { bookingId, locale, theme });
      throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'operation not available', 'error-page');
    }

    logger.verbose('starting download', { bookingId, locale, theme });
    try {
      modalWaiter.show(true);
      
      const fileName = getFileName(offer, firstName, lastName);
      const documentBlob = await (isElectronBuild() ? renderOffscreenImage(bookingId, locale) : downloadFromServer(bookingId, theme, locale));
      saveAs(documentBlob as any, fileName );
      logger.verbose('download completed', { bookingId, locale, theme, size: documentBlob.size });
    } catch (err: any) {
      logger.warn('failed to download document', err, { bookingId, locale, theme });
      const e = AppException.isAppException(err) ? err : new AppException(AppExceptionCodeEnum.DOCUMENT_GENERATION_FAILED, 'failed to generate document', 'error-stub');
      defaultErrorHandler(e, {});
    } finally {
      await modalWaiter.show(false);
    }
  };

  return {
    download
  };
}
