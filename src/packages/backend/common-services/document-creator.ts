import { type DocumentCommonParams, QueryPageTimestampParam, eraseTimeOfDay, getLocalizeableValue, getI18nResName2, getI18nResName3, PdfBulletSize, PdfFontRegularFile, PdfFontParagraphTitleSize, PdfFontMediumFile, PdfFontMainTitleSize, PdfFontSemiboldFile, PdfDocMargins, PdfImgWidth, OgImagePathSegment, DefaultLocale, PdfPaperWidth, PdfPaperHeight, PdfFontPrimarySize, AppConfig, AppException, AppExceptionCodeEnum, QueryInternalRequestParam, OgImageExt, AppPage, type Theme, type Locale, type EntityId, type EntityDataAttrsOnly, type IFlightOffer, type IOfferBooking, type IStayOfferDetails, type IAppLogger, getPagePath, type Timestamp } from '@golobe-demo/shared';
import type { IServerI18n, IAppAssetsProvider, IDocumentCreator, IHtmlPageCacheCleaner } from './../types';
import type { H3Event } from 'h3';
import PDFDocument from 'pdfkit';
import { type ParsedURL, parseURL, stringifyQuery, stringifyParsedURL } from 'ufo';
import { Minipass } from 'minipass';
import range from 'lodash-es/range';
import set from 'lodash-es/set';
import isDate from 'lodash-es/isDate';
import replace from 'lodash-es/replace';
import isString from 'lodash-es/isString';

export class DocumentCreator implements IDocumentCreator {
  private readonly logger: IAppLogger;
  private readonly appAssetsProvider: IAppAssetsProvider;
  private readonly serverI18n: IServerI18n;
  private readonly htmlPageCacheCleaner: IHtmlPageCacheCleaner;
  
  public static inject = ['appAssetsProvider', 'htmlPageCacheCleaner', 'serverI18n', 'logger'] as const;
  constructor (appAssetsProvider: IAppAssetsProvider, htmlPageCacheCleaner: IHtmlPageCacheCleaner, serverI18n: IServerI18n, logger: IAppLogger) {
    this.logger = logger.addContextProps({ component: 'DocumentCreator' });
    this.appAssetsProvider = appAssetsProvider;
    this.serverI18n = serverI18n;
    this.htmlPageCacheCleaner = htmlPageCacheCleaner;
  }

  getLanguageCode = (locale: Locale): string => {
    return `${locale}-${locale.toUpperCase()}`;
  };

  getTicketImageUrl = (bookingId: EntityId, isSecondPage: boolean, locale: Locale, theme: Theme, htmlPageTimestamp: Timestamp | undefined): ParsedURL => {
    let query = set({
      theme,
      isSecondPage: isSecondPage ? '1' : '0'
    }, QueryInternalRequestParam, 1);
    if(htmlPageTimestamp !== undefined) {
      query = set(query, QueryPageTimestampParam, htmlPageTimestamp);
    }

    const urlParams: ParsedURL = {
      ...parseURL(AppConfig.siteUrl),
      pathname: `/${OgImagePathSegment}${locale === DefaultLocale ? '' : `${locale}/`}${getPagePath(AppPage.BookingDetails)}/${bookingId}/og.${OgImageExt}`,
      search: stringifyQuery(query)
    };
    return urlParams;
  };

  downloadImgData = async (imgUrl: ParsedURL, theme: Theme, isSecondPage: boolean, htmlPageTimestamp: Timestamp | undefined, imageDownloadFn: (url: string, query: any) => Promise<Buffer | undefined>, event: H3Event | undefined): Promise<Buffer> => {
    this.logger.debug('downloading image', { url: stringifyParsedURL(imgUrl), theme, isSecondPage, event: !!event });
    let query = set({ theme, isSecondPage: isSecondPage ? '1' : '0' }, QueryInternalRequestParam, 1);
    if(htmlPageTimestamp !== undefined) {
      query = set(query, QueryPageTimestampParam, htmlPageTimestamp);
    }
    const imgBytes = await imageDownloadFn(imgUrl.pathname, query);
    if (!imgBytes?.length) {
      this.logger.warn('failed to download image', undefined, { url: stringifyParsedURL(imgUrl), theme, isSecondPage });
      throw new AppException(AppExceptionCodeEnum.DOCUMENT_GENERATION_FAILED, 'failed to download image', 'error-stub');
    }
    this.logger.debug('image download completed', { url: stringifyParsedURL(imgUrl), theme, isSecondPage, size: imgBytes.length });
    return imgBytes;
  };

  fillPdfPage = async (imgUrl: ParsedURL, isSecondPage: boolean, theme: Theme, locale: Locale, htmlPageTimestamp: Timestamp | undefined, $pdf: PDFKit.PDFDocument, imageDownloadFn: (url: string, query: any) => Promise<Buffer | undefined>, event: H3Event | undefined): Promise<void> => {
    this.logger.debug('adding pdf page', { url: stringifyParsedURL(imgUrl), theme, locale, event: !!event });

    const MoveDownStep = 0.5;

    const backgroundColor = theme === 'light' ? 'white' : '#111827';
    const fontColor = theme === 'light' ? '#112211' : 'white';
    $pdf.rect(0, 0, PdfPaperWidth, PdfPaperHeight).fill(backgroundColor);
    $pdf.fontSize(PdfFontPrimarySize);

    const imgBytes = await this.downloadImgData(imgUrl, theme, isSecondPage, htmlPageTimestamp, imageDownloadFn, event);
    const imgRatio = AppConfig.ogImage.screenSize.width / AppConfig.ogImage.screenSize.height;
    const imgHeight = Math.ceil(PdfImgWidth / imgRatio);

    $pdf.image(imgBytes, (PdfPaperWidth - PdfImgWidth) / 2, PdfDocMargins.top,
      {
        width: PdfImgWidth,
        height: imgHeight,
        align: 'center',
        valign: 'top'
      } as any);

    const imageBottomPaddingAdjustment = imgHeight * 0.2; // empty space at the bottom of rendered ogImage
    $pdf.moveDown((imgHeight - imageBottomPaddingAdjustment) / PdfFontPrimarySize);

    this.logger.debug('adding page text', { url: stringifyParsedURL(imgUrl), theme, locale });
    $pdf.fillColor(fontColor);
    $pdf.font(PdfFontSemiboldFile)
      .fontSize(PdfFontMainTitleSize)
      .text(this.serverI18n.getLocalizedResource(getI18nResName2('bookingTnC', 'title'), locale));
    $pdf.moveDown(2 * MoveDownStep);

    $pdf.font(PdfFontMediumFile)
      .fontSize(PdfFontParagraphTitleSize)
      .text(this.serverI18n.getLocalizedResource(getI18nResName3('bookingTnC', 'payments', 'title'), locale));
    $pdf.moveDown(MoveDownStep);
    $pdf.font(PdfFontRegularFile)
      .fontSize(PdfFontPrimarySize)
      .list(range(0, 3).map((i) => {
        const termsTemplate = this.serverI18n.getLocalizedResource(getI18nResName3('bookingTnC', 'payments', `paragraph${i + 1}` as any), locale);
        return replace(termsTemplate, /\{\s*companyName\s*\}/g, AppConfig.booking.companyName);
      }), { listType: 'bullet', bulletRadius: PdfBulletSize });

    $pdf.moveDown(2 * MoveDownStep);
    $pdf.font(PdfFontMediumFile)
      .fontSize(PdfFontParagraphTitleSize)
      .text(this.serverI18n.getLocalizedResource(getI18nResName3('bookingTnC', 'contactUs', 'title'), locale));
    $pdf.moveDown(MoveDownStep);
    $pdf.font(PdfFontRegularFile)
      .fontSize(PdfFontPrimarySize)
      .text(replace(this.serverI18n.getLocalizedResource(getI18nResName3('bookingTnC', 'contactUs', 'directions'), locale), /\{\s*siteUrl\s*\}/g, AppConfig.booking.siteUrl));
    this.logger.debug('pdf page added', { url: stringifyParsedURL(imgUrl) });
  };

  async getBookingPageTimestamp(bookingId: EntityId): Promise<Timestamp> {
    const timestampRaw = await this.htmlPageCacheCleaner.getPageTimestamp(AppPage.BookingDetails, bookingId, true);
    if(isString(timestampRaw)) {
      this.logger.error('unexpected booking page timestamp', undefined, { bookingId, timestamp: timestampRaw });
      throw new AppException(AppExceptionCodeEnum.DOCUMENT_GENERATION_FAILED, 'document generation failed', 'error-stub');
    }
    return isDate(timestampRaw) ? timestampRaw.getTime() : timestampRaw;
  }

  async getBookingTicket (booking: IOfferBooking<IFlightOffer | IStayOfferDetails>, params: DocumentCommonParams, imageDownloadFn: (url: string, query: any) => Promise<Buffer | undefined>, event: H3Event | undefined): Promise<Buffer> {
    this.logger.verbose('generating document', { bookingId: booking.id, theme: params.theme, locale: params.locale, event: !!event });
    this.logger.always('document generation started', { bookingId: booking.id, theme: params.theme, locale: params.locale });

    const languageCode = this.getLanguageCode(params.locale);
    const hasTwoPages = booking.offer.kind === 'flights' && !!(booking.offer as EntityDataAttrsOnly<IFlightOffer>).arriveFlight;

    const subject = getLocalizeableValue(booking.offer.kind === 'flights' ? (booking.offer as EntityDataAttrsOnly<IFlightOffer>).departFlight.airlineCompany.name : (booking.offer as EntityDataAttrsOnly<IStayOfferDetails>).stay.name, params.locale);
    const docDate = eraseTimeOfDay(new Date());
    const ticketTitle = this.serverI18n.getLocalizedResource(getI18nResName3('ticket', 'pdf', 'title'), params.locale);
    const docOptions: PDFKit.PDFDocumentOptions = {
      autoFirstPage: true,
      lang: languageCode,
      margins: PdfDocMargins,
      info: {
        Author: AppConfig.booking.siteUrl,
        CreationDate: docDate,
        Creator: AppConfig.booking.siteUrl,
        Title: ticketTitle,
        Subject: subject
      },
      size: [PdfPaperWidth, PdfPaperHeight] /// a4
    };

    let bytes: Buffer | undefined;
    try {
      this.logger.debug('generating document with the following options', { bookingId: booking.id, theme: params.theme, locale: params.locale, hasTwoPages, langCode: languageCode });
      const $pdf = new PDFDocument(docOptions);

      const fontsToRegister = [PdfFontRegularFile, PdfFontMediumFile, PdfFontSemiboldFile];
      for (let i = 0; i < fontsToRegister.length; i++) {
        const fontName = fontsToRegister[i];
        this.logger.debug('registering font', { bookingId: booking.id, fontFileName: fontName });
        const fontBytes = await this.appAssetsProvider.getPdfFont(fontName);
        if (!fontBytes) {
          this.logger.warn('document generation failed - font file not available', undefined, { fileName: fontName, bookingId: booking.id, theme: params.theme, locale: params.locale });
          throw new AppException(AppExceptionCodeEnum.DOCUMENT_GENERATION_FAILED, 'document generation failed', 'error-stub');
        }
        await $pdf.registerFont(fontName, fontBytes);
        this.logger.debug('font registered', { bookingId: booking.id, fontFileName: fontName });
      }
  
      const bookingId = booking.id;
      const isPreviewMode = event?.context.preview.mode;
      
      let timestamp: Timestamp | undefined;
      if(!isPreviewMode) {
        await this.htmlPageCacheCleaner.invalidatePage('immediate', AppPage.BookingDetails, bookingId);
        timestamp = await this.getBookingPageTimestamp(bookingId);
      }
      await this.fillPdfPage(this.getTicketImageUrl(bookingId, false, params.locale, params.theme, timestamp), false, params.theme, params.locale, timestamp, $pdf, imageDownloadFn, event);
      if (hasTwoPages) {
        await $pdf.addPage(docOptions);
        if(!isPreviewMode) {
          await this.htmlPageCacheCleaner.invalidatePage('immediate', AppPage.BookingDetails, bookingId);
          timestamp = await this.getBookingPageTimestamp(bookingId);
        }
        await this.fillPdfPage(this.getTicketImageUrl(bookingId, true, params.locale, params.theme, timestamp), true, params.theme, params.locale, timestamp, $pdf, imageDownloadFn, event);
      }
  
      this.logger.debug('serializing document to byte array', { bookingId: booking.id, theme: params.theme, locale: params.locale });
      const collector = new Minipass({ encoding: 'buffer' });
      $pdf.pipe(collector);
      $pdf.end();
      bytes = await collector.concat();
      await collector.destroy();
      this.logger.verbose('document generated', { bookingId: booking.id, theme: params.theme, locale: params.locale, size: bytes.length });
    } catch(err: any) {
      this.logger.warn('document generation failed', err, { bookingId: booking.id, theme: params.theme, locale: params.locale, options: docOptions });
      throw err;
    }
    
    this.logger.always('document generation completed', { bookingId: booking.id, theme: params.theme, locale: params.locale });
    return bytes;
  }
}
