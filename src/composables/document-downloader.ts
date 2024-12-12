import { QueryPagePreviewModeParam, PreviewModeParamEnabledValue, getValueForFlightDayFormatting, type Theme, type Locale, getI18nResName2, type EntityId, type EntityDataAttrsOnly, type IFlightOffer, type IStayOfferDetails, type IStayOffer, AppException, AppExceptionCodeEnum } from '@golobe-demo/shared';
import { defaultErrorHandler } from './../helpers/exceptions';
import { ApiEndpointBookingDownload } from './../server/api-definitions';
import { type IModalWaiter } from './../composables/modal-waiter';
import { saveAs } from 'file-saver';
import { getBytes } from './../helpers/rest-utils';
import { usePreviewState } from './../composables/preview-state';
import set from 'lodash-es/set';
import { getCommonServices } from '../helpers/service-accessors';

globalThis.Blob = globalThis.Blob || Blob;
globalThis.Buffer = globalThis.Buffer || Buffer;

export interface IDocumentDownloader {
  download: (bookingId: EntityId, offer: EntityDataAttrsOnly<IFlightOffer | IStayOfferDetails | IStayOffer>, firstName: string | undefined, lastName: string | undefined, locale: Locale, theme: Theme) => Promise<void>
}

export function useDocumentDownloader (modalWaiter: IModalWaiter): IDocumentDownloader {
  const logger = getCommonServices().getLogger();

  const { d, t } = useI18n();
  const { enabled } = usePreviewState();
  
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
  
    return `${t(getI18nResName2('bookingCommon', 'docFileNamePrefix'))}_${userName}_${dateStr}.pdf`;
  };

  const download = async(bookingId: EntityId, offer: EntityDataAttrsOnly<IFlightOffer | IStayOfferDetails | IStayOffer>, firstName: string | undefined, lastName: string | undefined, locale: Locale, theme: Theme): Promise<void> => {
    if(!import.meta.client) {
      logger.warn(`(document-downloader) applicable only on client-side, bookingId=${bookingId}, locale=${locale}, theme=${theme}`);
      throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'operation not available', 'error-page');
    }

    logger.verbose(`(document-downloader) starting download, bookingId=${bookingId}, locale=${locale}, theme=${theme}`);
    try {
      modalWaiter.show(true);
      
      const fileName = getFileName(offer, firstName, lastName);
      const path = `/${ApiEndpointBookingDownload(bookingId)}`;
      const searchQuery = {
        theme,
        locale,
        ...(enabled ? set({}, QueryPagePreviewModeParam, PreviewModeParamEnabledValue) : {})
      };
      const imgBytes = await getBytes(path, searchQuery, undefined, 'no-store', true, undefined, 'throw');
      if (!imgBytes?.byteLength) {
        logger.warn(`(document-downloader) failed to download document, bookingId=${bookingId}, locale=${locale}, theme=${theme}`);
        throw new AppException(AppExceptionCodeEnum.DOCUMENT_GENERATION_FAILED, 'failed to download document', 'error-stub');
      }
      const imgBlob = new Blob(new Array(imgBytes));
      saveAs(imgBlob as any, `${fileName}`);
      logger.verbose(`(document-downloader) download completed, bookingId=${bookingId}, locale=${locale}, theme=${theme}, size=${imgBlob.size}`);
    } catch (err: any) {
      logger.warn(`(document-downloader) failed to download document, bookingId=${bookingId}, locale=${locale}, theme=${theme}`, err);
      const e = AppException.isAppException(err) ? err : new AppException(AppExceptionCodeEnum.DOCUMENT_GENERATION_FAILED, 'failed to generate document', 'error-stub');
      defaultErrorHandler(e);
    } finally {
      await modalWaiter.show(false);
    }
  };

  return {
    download
  };
}
