import { type H3Event } from 'h3';
import PDFDocument from 'pdfkit';
import { type ParsedURL, parseURL, stringifyQuery, stringifyParsedURL } from 'ufo';
import blobStream from 'blob-stream';
import range from 'lodash-es/range';
import { type IAppLogger } from '../shared/applogger';
import { type EntityId, type IAppAssetsProvider, type EntityDataAttrsOnly, type DocumentCommonParams, type IDocumentCreator, type IFlightOffer, type IOfferBooking, type IStayOfferDetails } from '../shared/interfaces';
import { AppException, AppExceptionCodeEnum } from '../shared/exceptions';
import { getBytes } from '../shared/rest-utils';
import { type IServerI18n } from './../server-logic/helpers/i18n';
import AppConfig from './../appconfig';
import { type Theme, type Locale, PdfBulletSize, PdfFontRegularFile, PdfFontParagraphTitleSize, PdfFontMediumFile, PdfFontMainTitleSize, PdfFontSemiboldFile, PdfDocMargins, PdfImgWidth, OgImagePathSegment, PagePath, DefaultLocale, PdfPaperWidth, PdfPaperHeight, PdfFontPrimarySize, HeaderVaryRenderCache } from './../shared/constants';
import { readBlobStream } from './../shared/streaming';
import { getI18nResName2, getI18nResName3 } from './../shared/i18n';
import { eraseTimeOfDay, getLocalizeableValue, } from './../shared/common';
import fromPairs from 'lodash-es/fromPairs';
import random from 'lodash-es/random';
import { murmurHash } from 'ohash';

export class DocumentCreator implements IDocumentCreator {
  private logger: IAppLogger;
  private appAssetsProvider: IAppAssetsProvider;
  private serverI18n: IServerI18n;

  public static inject = ['appAssetsProvider', 'serverI18n', 'logger'] as const;
  constructor (appAssetsProvider: IAppAssetsProvider, serverI18n: IServerI18n, logger: IAppLogger) {
    this.logger = logger;
    this.appAssetsProvider = appAssetsProvider;
    this.serverI18n = serverI18n;
  }

  getLanguageCode = (locale: Locale): string => {
    return `${locale}-${locale.toUpperCase()}`;
  };

  getTicketImageUrl = (bookingId: EntityId, isSecondPage: boolean, locale: Locale, theme: Theme): ParsedURL => {
    const urlParams: ParsedURL = {
      ...parseURL(AppConfig.siteUrl),
      pathname: `/${OgImagePathSegment}${locale === DefaultLocale ? '' : `${locale}/`}${PagePath.BookingDetails}/${bookingId}/og.png`,
      search: stringifyQuery({
        theme,
        isSecondPage
      })
    };
    return urlParams;
  };

  downloadImgData = async (imgUrl: ParsedURL, theme: Theme, isSecondPage: boolean, event: H3Event | undefined): Promise<Buffer> => {
    this.logger.debug(`(DocumentCreator) downloading image, url=${stringifyParsedURL(imgUrl)}, theme=${theme}, isSecondPage=${isSecondPage}, event=${!!event}`);
    const cacheSkippingTag = murmurHash(random(1.0, true).toString(), new Date().getTime()).toString();
    const imgBytes = await getBytes(imgUrl.pathname, { theme, isSecondPage }, fromPairs([[HeaderVaryRenderCache, cacheSkippingTag]]), 'no-store',  true, event, 'throw');
    if (!imgBytes?.length) {
      this.logger.warn(`(DocumentCreator) failed to download image, url=${stringifyParsedURL(imgUrl)}, theme=${theme}, isSecondPage=${isSecondPage}`);
      throw new AppException(AppExceptionCodeEnum.DOCUMENT_GENERATION_FAILED, 'failed to download image', 'error-stub');
    }
    this.logger.debug(`(DocumentCreator) image download completed, url=${stringifyParsedURL(imgUrl)}, theme=${theme}, isSecondPage=${isSecondPage}, size=${imgBytes.length}`);
    return imgBytes;
  };

  fillPdfPage = async (imgUrl: ParsedURL, isSecondPage: boolean, theme: Theme, locale: Locale, $pdf: PDFKit.PDFDocument, event: H3Event | undefined): Promise<void> => {
    this.logger.debug(`(DocumentCreator) adding pdf page, url=${stringifyParsedURL(imgUrl)}, theme=${theme}, locale=${locale}, event=${!!event}`);

    const MoveDownStep = 0.5;

    const backgroundColor = theme === 'light' ? 'white' : '#2B2B2B';
    const fontColor = theme === 'light' ? '#112211' : 'white';
    $pdf.rect(0, 0, PdfPaperWidth, PdfPaperHeight).fill(backgroundColor);
    $pdf.fontSize(PdfFontPrimarySize);

    const imgBytes = await this.downloadImgData(imgUrl, theme, isSecondPage, event);
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

    this.logger.debug(`(DocumentCreator) adding page text, url=${stringifyParsedURL(imgUrl)}, theme=${theme}, locale=${locale}`);
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
        return this.serverI18n.getLocalizedResource(getI18nResName3('bookingTnC', 'payments', `paragraph${i + 1}` as any), locale).replaceAll(/\{\s*companyName\s*\}/g, AppConfig.booking.companyName);
      }), { listType: 'bullet', bulletRadius: PdfBulletSize });

    $pdf.moveDown(2 * MoveDownStep);
    $pdf.font(PdfFontMediumFile)
      .fontSize(PdfFontParagraphTitleSize)
      .text(this.serverI18n.getLocalizedResource(getI18nResName3('bookingTnC', 'contactUs', 'title'), locale));
    $pdf.moveDown(MoveDownStep);
    $pdf.font(PdfFontRegularFile)
      .fontSize(PdfFontPrimarySize)
      .text(this.serverI18n.getLocalizedResource(getI18nResName3('bookingTnC', 'contactUs', 'directions'), locale).replaceAll(/\{\s*siteUrl\s*\}/g, AppConfig.booking.siteUrl));
    this.logger.debug(`(DocumentCreator) pdf page added, url=${stringifyParsedURL(imgUrl)}`);
  };

  async getBookingTicket (booking: IOfferBooking<IFlightOffer | IStayOfferDetails>, params: DocumentCommonParams, event: H3Event | undefined): Promise<Buffer> {
    this.logger.verbose(`(DocumentCreator) generating document, bookingId=${booking.id}, theme=${params.theme}, locale=${params.locale}, event=${!!event}`);
    this.logger.always(`(DocumentCreator) document generation started, bookingId=${booking.id}, theme=${params.theme}, locale=${params.locale}`);

    const languageCode = this.getLanguageCode(params.locale);
    const hasTwoPages = booking.offer.kind === 'flights' && !!(booking.offer as EntityDataAttrsOnly<IFlightOffer>).arriveFlight;

    const subject = getLocalizeableValue(booking.offer.kind === 'flights' ? (booking.offer as EntityDataAttrsOnly<IFlightOffer>).departFlight.airlineCompany.name : (booking.offer as EntityDataAttrsOnly<IStayOfferDetails>).stay.name, params.locale);
    const docOptions: PDFKit.PDFDocumentOptions = {
      autoFirstPage: true,
      lang: languageCode,
      margins: PdfDocMargins,
      info: {
        Author: AppConfig.booking.siteUrl,
        CreationDate: eraseTimeOfDay(new Date()),
        Creator: AppConfig.booking.siteUrl,
        Title: this.serverI18n.getLocalizedResource(getI18nResName3('ticket', 'pdf', 'title'), params.locale),
        Subject: subject
      },
      size: [PdfPaperWidth, PdfPaperHeight] /// a4
    };
    this.logger.debug(`(DocumentCreator) generating document with the following options, bookingId=${booking.id}, theme=${params.theme}, locale=${params.locale}, hasTwoPages=${hasTwoPages}, langCode=${languageCode}`);
    const $pdf = new PDFDocument(docOptions);

    const fontsToRegister = [PdfFontRegularFile, PdfFontMediumFile, PdfFontSemiboldFile];
    for (let i = 0; i < fontsToRegister.length; i++) {
      const fontName = fontsToRegister[i];
      this.logger.debug(`(DocumentCreator) registering font, bookingId=${booking.id}, fontFileName=${fontName}`);
      const fontBytes = await this.appAssetsProvider.getPdfFont(fontName);
      if (!fontBytes) {
        this.logger.warn(`(DocumentCreator) document generation failed - font file not available, fileName=${fontName}, bookingId=${booking.id}, theme=${params.theme}, locale=${params.locale}`);
        throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'document generation failed', 'error-stub');
      }
      await $pdf.registerFont(fontName, fontBytes);
      this.logger.debug(`(DocumentCreator) font registered, bookingId=${booking.id}, fontFileName=${fontName}`);
    }

    const bookingId = booking.id;
    await this.fillPdfPage(this.getTicketImageUrl(bookingId, false, params.locale, params.theme), false, params.theme, params.locale, $pdf, event);
    if (hasTwoPages) {
      await $pdf.addPage(docOptions);
      await this.fillPdfPage(this.getTicketImageUrl(bookingId, true, params.locale, params.theme), true, params.theme, params.locale, $pdf, event);
    }

    this.logger.debug(`(DocumentCreator) serializing document to byte array, bookingId=${booking.id}, theme=${params.theme}, locale=${params.locale}`);
    const stream = $pdf.pipe(blobStream());
    $pdf.end();

    const bytes = await readBlobStream(stream, this.logger);

    this.logger.verbose(`(DocumentCreator) document generated, bookingId=${booking.id}, theme=${params.theme}, locale=${params.locale}, size=${bytes.length}`);
    this.logger.always(`(DocumentCreator) document generation completed, bookingId=${booking.id}, theme=${params.theme}, locale=${params.locale}`);
    return bytes;
  }
}
