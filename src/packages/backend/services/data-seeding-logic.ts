import { CREDENTIALS_TESTUSER_PROFILE as credentialsTestUserProfile, TEST_USER_PASSWORD, detectMimeType, AppConfig, lookupParentDirectory, type IImageData, type IAirplaneData, type IStayData, type IStayDescriptionData, type IStayReviewData, type IStayImageData, type PreviewMode, type FlightClass, type AirplaneImageKind, type EntityId, type ILocalizableValue, AuthProvider, ImageCategory, EmailTemplateEnum, isQuickStartEnv, AdminUserEmail, DefaultUserAvatarSlug, DefaultUserCoverSlug, MainTitleSlug, FlightsTitleSlug, StaysTitleSlug, AvailableLocaleCodes, DefaultLocale, type Theme, MimeTypeWebp, type IAppLogger, type CssPropertyList, isPublishEnv } from '@golobe-demo/shared';
import type { InitialDataSeedingStatus, IAirlineCompanyLogic, IAirplaneLogic, IAirportLogic, IAuthFormImageLogic, ICitiesLogic, ICompanyReviewsLogic, IGeoLogic, IImageCategoryLogic, IImageLogic, IMailTemplateLogic, IStaysLogic, IUserLogic, IDataSeedingLogic } from '../types';
import { getGlobalPrismaClient } from './../helpers/db';
import { readFile, writeFile, readdir, access } from 'fs/promises';
import slugify from 'slugify';
import { join, resolve, basename } from 'pathe';
import { Decimal } from 'decimal.js';
import { destr } from 'destr';
import mean from 'lodash-es/mean';
import fromPairs from 'lodash-es/fromPairs';
import orderBy from 'lodash-es/orderBy';
import set from 'lodash-es/set';
import template from 'lodash-es/template';
import { murmurHash } from 'ohash';
import { type H3Event } from 'h3';
import sharp from 'sharp';

interface ContextParams {
  logger: IAppLogger,
  contentDir: string,
  appDataDir: string,
  publicResDir: string,
  dbCountryMap?: Map<string, EntityId>,
  dbCityMap?: Map<string, EntityId>,
  dbAirportMap?: Map<string, EntityId>,
  event: H3Event
};

const StayNameTemplateParam = 'hotelName';

const SeedPreviewMode: PreviewMode = false;
const SeedDraftHotelSlug = isQuickStartEnv() ? 'stay-prague-02' : undefined;

const WorldMapDimDefs = {
  source: {
    width: 1230,
    height: 603
  },
  viewport: {
    x: 0,
    y: 0,
    width: 1230,
    height: 505
  },
  origin: {
    relative: {
      x: 1.0,
      y: 0.192371476
    },
    geo: {
      lon: -170.002101,
      lat: 66.179223
    }
  },
  step: {
    relative: {
      x: 0.000713008,
      y: 0.001258375
    },
    geo: {
      lon: 0.261885471,
      lat: 0.220925828
    }
  }
};

interface ICountryInfo {
  code: string,
  name: Partial<ILocalizableValue>
}

interface IAirportInfo {
  code: string,
  cityCode: string,
  lon: Decimal,
  lat: Decimal,
  name: Partial<ILocalizableValue>,
  cityInfo: any
}

interface ICityInfo {
  code: string,
  countryCode: string,
  population: number,
  name: Partial<ILocalizableValue>,
  airports: IAirportInfo[],
  lon?: Decimal,
  lat?: Decimal,
  utcOffsetMin: number,
  countryInfo: ICountryInfo
}

type HotelIdentityJson = {
  slug: string,
  citySlug: string,
  name: ILocalizableValue
};

type DescriptionFeatureJson = {
  caption: ILocalizableValue,
  text: ILocalizableValue
};

type DescriptionTemplatesJson = {
  title: ILocalizableValue,
  main: ILocalizableValue,
  footer: ILocalizableValue,
  features: DescriptionFeatureJson[]
};

type HotelsJson = {
  identities: HotelIdentityJson[],
  descriptionTemplates: DescriptionTemplatesJson,
  reviews: ILocalizableValue[],
  userNames: string[]
};

export class DataSeedingLogic implements IDataSeedingLogic {
  private readonly LoggingPrefix = '(DataSeedingLogic)';

  private readonly logger: IAppLogger;
  private readonly userLogic: IUserLogic;
  private readonly imageCategoryLogic: IImageCategoryLogic;
  private readonly imageLogic: IImageLogic;
  private readonly authFormImageLogic: IAuthFormImageLogic;
  private readonly mailTemplateLogic: IMailTemplateLogic;
  private readonly geoLogic: IGeoLogic;
  private readonly airportLogic: IAirportLogic;
  private readonly citiesLogic: ICitiesLogic;
  private readonly companyReviewsLogic: ICompanyReviewsLogic;
  private readonly airlineCompanyLogic: IAirlineCompanyLogic;
  private readonly airplaneLogic: IAirplaneLogic;
  private readonly staysLogic: IStaysLogic;

  public static inject = ['logger', 'userLogic', 'imageCategoryLogic', 'imageLogic', 'authFormImageLogic', 'mailTemplateLogic', 'geoLogic', 'airportLogic', 'citiesLogic', 'companyReviewsLogic', 'airlineCompanyLogic', 'airplaneLogic', 'staysLogic'] as const;
  constructor (logger: IAppLogger, 
    userLogic: IUserLogic, 
    imageCategoryLogic: IImageCategoryLogic,
    imageLogic: IImageLogic,
    authFormImageLogic: IAuthFormImageLogic,
    mailTemplateLogic: IMailTemplateLogic,
    geoLogic: IGeoLogic,
    airportLogic: IAirportLogic,
    citiesLogic: ICitiesLogic,
    companyReviewsLogic: ICompanyReviewsLogic,
    airlineCompanyLogic: IAirlineCompanyLogic,
    airplaneLogic: IAirplaneLogic,
    staysLogic: IStaysLogic
  ) {
    this.logger = logger;
    this.userLogic = userLogic;
    this.imageCategoryLogic = imageCategoryLogic;
    this.imageLogic = imageLogic;
    this.authFormImageLogic = authFormImageLogic;
    this.mailTemplateLogic = mailTemplateLogic;
    this.geoLogic = geoLogic;
    this.airportLogic = airportLogic;
    this.citiesLogic = citiesLogic;
    this.companyReviewsLogic = companyReviewsLogic;
    this.airlineCompanyLogic = airlineCompanyLogic;
    this.airplaneLogic = airplaneLogic;
    this.staysLogic = staysLogic;
  }

  hashString (value: string) {
    return murmurHash(Buffer.from(value).toString('base64'));
  }
  
  async checkFileExists (filePath: string): Promise<boolean> {
    try {
      await access(filePath);
      return true;
    } catch (err: any) {
      this.logger.debug(`${this.LoggingPrefix} cannot access file, probably does not exist (msg=${err?.message ?? ''})`);
      return false;
    }
  };
  
  async ensureUser (ctx: ContextParams, password: string, email: string, firstName: string, lastName: string, authProvider: AuthProvider, providerIdentity: string, avatarFileName: string | undefined): Promise<EntityId> {
    ctx.logger.info(`${this.LoggingPrefix} >>> ensuring user, providerIdentity=${providerIdentity}, providerType=${authProvider}, email=${email}, avatarFile=${avatarFileName}`);
  
    const userLogic = this.userLogic;
    const user = await userLogic.findUser(authProvider, providerIdentity, 'minimal');
    if (user) {
      ctx.logger.info(`${this.LoggingPrefix} ensuring user - completed - already exists, providerIdentity=${providerIdentity}, providerType=${authProvider}, email=${email}, id=${user.id}`);
      return user.id;
    }
    const userId = (await userLogic.registerUserByEmail(email, password, 'verified', firstName, lastName, 'light', 'en')) as EntityId;
  
    if (avatarFileName) {
      await this.ensureImageCategory(ctx, ImageCategory.UserAvatar, 512, 512);
      const filePath = join(ctx.contentDir, avatarFileName);
      const mime = detectMimeType(avatarFileName);
      const bytes = await readFile(filePath);
      await userLogic.uploadUserImage(userId, ImageCategory.UserAvatar, bytes, mime, basename(avatarFileName), ctx.event);
    }
  
    ctx.logger.info(`${this.LoggingPrefix} >>> user created, providerIdentity=${providerIdentity}, providerType=${authProvider}, email=${email}, id=${userId}`);
    return userId;
  }
  
  async ensureAppAdminUser (ctx: ContextParams) : Promise<void> {
    ctx.logger.info(`${this.LoggingPrefix} >>> ensuring admin user`);
    const password = process.env.APP_ADMIN_PWD;
    if (!password || password.length === 0) {
      ctx.logger.error(`${this.LoggingPrefix} Admin user password must be passed in APP_ADMIN_PWD env variable`);
      throw new Error('Admin user password must be passed in APP_ADMIN_PWD env variable');
    }
    await this.ensureUser(ctx, password, AdminUserEmail, 'app_admin', 'app_admin', AuthProvider.Email, AdminUserEmail, undefined);
  
    ctx.logger.info(`${this.LoggingPrefix} ensuring admin user - completed - created new`);
  }
  
  async ensureCredentialsTestUser (ctx: ContextParams) : Promise<void> {
    ctx.logger.info(`${this.LoggingPrefix} >>> ensuring credentials test user`);
    await this.ensureUser(ctx, TEST_USER_PASSWORD, credentialsTestUserProfile.email, credentialsTestUserProfile.firstName, credentialsTestUserProfile.lastName, AuthProvider.Email, credentialsTestUserProfile.email, undefined);
    ctx.logger.info(`${this.LoggingPrefix} >>> credentials test user ensured`);
  }
  
  async ensureImageCategory (ctx: ContextParams, type: ImageCategory, width: number, height: number) : Promise<EntityId> {
    ctx.logger.info(`${this.LoggingPrefix} >>> ensuring image category, type=${type}, width=${width}, height=${height}`);
  
    const imageCategoryLogic = this.imageCategoryLogic;
    const imageCategory = await imageCategoryLogic.findCategory(type);
    if (imageCategory) {
      ctx.logger.info(`${this.LoggingPrefix} >>> ensuring image category, type=${type} - completed - already exists`);
      return imageCategory.id;
    }
  
    const categoryId = await imageCategoryLogic.createCategory(type, width, height);
    ctx.logger.info(`${this.LoggingPrefix} >>> ensuring image category, type=${type} - completed - created new, id=${categoryId}`);
    return categoryId;
  }
  
  async extractImageRegion (ctx: ContextParams, bytes: Buffer, width: number, height: number, mimeType: 'webp' | 'jpeg'): Promise<Buffer> {
    ctx.logger.info(`${this.LoggingPrefix} extracting image region: width=${width}, height=${height}`);
    const sharpObj = sharp(bytes);
    const metadata = await sharpObj.metadata();
    if (!metadata.width || !metadata.height) {
      throw new Error('failed to parse image');
    }
  
    const widthToExtract = Math.min(width, metadata.width);
    const heightToExtract = Math.min(height, metadata.height);
    const extractedImageObj = sharpObj.extract({
      left: Math.round((metadata.width - widthToExtract) / 2),
      top: Math.round((metadata.height - heightToExtract) / 2),
      height: heightToExtract,
      width: widthToExtract
    });
  
    if (mimeType === 'webp') {
      return extractedImageObj.webp().toBuffer();
    } else {
      throw new Error('unsupported mime type');
    }
  }
  
  async ensureImage (ctx: ContextParams, contentFile: string, imageData: Partial<IImageData> & Pick<IImageData, 'mimeType' | 'slug' | 'category'>, previewMode: PreviewMode, regionOfImage?: { width: number, height: number }, invertForDarkTheme?: boolean): Promise<EntityId> {
    ctx.logger.info(`${this.LoggingPrefix} >>> ensuring image, fileName=${contentFile}, slug=${imageData.slug}, previewMode=${previewMode}`);
    imageData.originalName ??= basename(contentFile);
  
    const imageLogic = this.imageLogic;
    const imageEntity = await imageLogic.findImage(undefined, imageData.slug!, imageData.category!, ctx.event, previewMode);
    if (imageEntity) {
      ctx.logger.info(`${this.LoggingPrefix} >>> ensuring image, contentFile=${contentFile} - completed - already exists`);
      return imageEntity.id;
    }
  
    const srcFile = join(ctx.contentDir, contentFile);
    let bytes = await readFile(srcFile);
    if (regionOfImage) {
      if (imageData.mimeType.includes('webp')) {
        bytes = await this.extractImageRegion(ctx, bytes, regionOfImage.width, regionOfImage.height, 'webp');
      }
    }
  
    imageData.bytes = bytes;
    imageData.invertForDarkTheme = invertForDarkTheme;
    const imageId = (await imageLogic.createImage(imageData as IImageData, undefined, previewMode)).id;
    
    ctx.logger.info(`${this.LoggingPrefix} >>> ensuring image, contentFile=${contentFile}, previewMode=${previewMode} - completed - created new, id=${imageId}`);
    return imageId;
  }
  
  async addMainTitleImage (ctx: ContextParams, previewMode: PreviewMode) : Promise<void> {
    ctx.logger.info(`${this.LoggingPrefix} >>> creating main title image, previewMode=${previewMode}`);
    await this.ensureImageCategory(ctx, ImageCategory.MainTitle, 1770, 1180);
  
    const stubCssStyle = fromPairs([
      ['backgroundImage', 'linear-gradient(0deg, hsl(213, 8%, 77%, 0.0) 0%, hsl(213, 8%, 77%, 0.0) 70%, hsla(213, 8%, 77%, 0.8) 100%), radial-gradient(circle at 52% 49%, hsla(148, 13%, 26%, 0.2) 0%, hsl(154, 11%, 25%) 152%), linear-gradient(0deg, hsla(148, 13%, 26%, 0.34) 32%, hsl(213, 8%, 77%) 52%), radial-gradient(ellipse at 54% 192%, hsla(30, 66%, 56%, 0.79) 43%, hsla(213, 8%, 77%, 0.18) 106%)'],
      ['backgroundSize', '100% 100%, 100% 50%, 100% 100%, 100% 100%'],
      ['backgroundRepeat', 'no-repeat, repeat-y, no-repeat, no-repeat'],
      ['backgroundPosition', '0 0, 0 0, 0 0, 0 0']
    ]) as CssPropertyList;
    await this.ensureImage(ctx, 'main-title.webp', {
      category: ImageCategory.MainTitle,
      slug: MainTitleSlug,
      stubCssStyle,
      mimeType: MimeTypeWebp
    }, previewMode);
  
    ctx.logger.info(`${this.LoggingPrefix} >>> creating main title image, previewMode=${previewMode} - completed`);
  }
  
  async addAuthFormsPhotos (ctx: ContextParams, previewMode: PreviewMode) : Promise<void> {
    ctx.logger.info(`${this.LoggingPrefix} >>> adding auth forms photos, previewMode=${previewMode}`);
    const authFormImageLogic = this.authFormImageLogic;
    const allAuthFormImages = await authFormImageLogic.getAllImages(ctx.event, previewMode);
  
    await this.ensureImageCategory(ctx, ImageCategory.AuthFormsImage, 597, 794);
  
    const photo1Slug = 'account-forms-01';
    if(!allAuthFormImages.some(i => i.image.slug === photo1Slug)) {
      const imageId = await this.ensureImage(ctx, 'account-forms/account-forms-01.webp', {
        category: ImageCategory.AuthFormsImage,
        slug: photo1Slug,
        mimeType: MimeTypeWebp
      }, previewMode);
      await authFormImageLogic.createImage(imageId, 1, previewMode); 
    }
    const photo2Slug = 'account-forms-02';
    if(!allAuthFormImages.some(i => i.image.slug === photo2Slug)) {
      const imageId = await this.ensureImage(ctx, 'account-forms/account-forms-02.webp', {
        category: ImageCategory.AuthFormsImage,
        slug: photo2Slug,
        mimeType: MimeTypeWebp
      }, previewMode);
      await authFormImageLogic.createImage(imageId, 2, previewMode);
    }
  
    const photo3Slug = 'account-forms-03';
    if(!allAuthFormImages.some(i => i.image.slug === photo3Slug)) {
      const imageId = await this.ensureImage(ctx, 'account-forms/account-forms-03.webp', {
        category: ImageCategory.AuthFormsImage,
        slug: photo3Slug,
        mimeType: MimeTypeWebp
      }, previewMode);
      await authFormImageLogic.createImage(imageId, 3, previewMode);
    }
    
    ctx.logger.info(`${this.LoggingPrefix} >>> adding auth forms photos - completed, previewMode=${previewMode}`);
  }
  
  async ensureMailTemplate (ctx: ContextParams, kind: EmailTemplateEnum, templateFileEn: string, templateFileFr: string, templateFileRu: string, previewMode: PreviewMode): Promise<void> {
    ctx.logger.info(`${this.LoggingPrefix} >>> ensuring mail template, kind=${kind}, en=${templateFileEn}, fr=${templateFileFr}, ru=${templateFileRu}`);
  
    const mailTemplateLogic = this.mailTemplateLogic;
    const markup = await mailTemplateLogic.getTemplateMarkup(kind, DefaultLocale, previewMode);
    if (markup) {
      ctx.logger.info(`${this.LoggingPrefix} >>> ensuring mail template, kind=${kind} - already exists`);
      return;
    }
  
    const en = await readFile(templateFileEn, 'utf8');
    const fr = await readFile(templateFileFr, 'utf8');
    const ru = await readFile(templateFileRu, 'utf8');
    const templateId = await mailTemplateLogic.createTemplate(kind, { en, fr, ru }, previewMode);
    
    ctx.logger.info(`${this.LoggingPrefix} >>> ensuring mail template - created, id = ${templateId}`);
  }
  
  async ensureMailTemplates (ctx: ContextParams, previewMode: PreviewMode) : Promise<void> {
    ctx.logger.info(`${this.LoggingPrefix} >>> ensuring mail templates, previewMode=${previewMode}`);
  
    const getTemplateFilePath = (basename: string, locale: string): string => {
      return join(ctx.contentDir, 'mail-templates', `${basename}-${locale}.html`);
    };
  
    const templateProps = [
      {
        kind: EmailTemplateEnum.EmailVerify,
        basename: 'email-verify'
      },
      {
        kind: EmailTemplateEnum.RegisterAccount,
        basename: 'register-account'
      },
      {
        kind: EmailTemplateEnum.PasswordRecovery,
        basename: 'password-recovery'
      }
    ];
    for (let i = 0; i < templateProps.length; i++) {
      const { kind, basename } = templateProps[i];
      await this.ensureMailTemplate(ctx, kind, getTemplateFilePath(basename, DefaultLocale), getTemplateFilePath(basename, 'fr'), getTemplateFilePath(basename, 'ru'), previewMode);
    }
  
    ctx.logger.info(`${this.LoggingPrefix} >>> ensuring mail templates, previewMode=${previewMode} - completed`);
  }
  
  async addDefaultUserProfileImages (ctx: ContextParams, previewMode: PreviewMode) : Promise<void> {
    ctx.logger.info(`${this.LoggingPrefix} >>> adding default user profile images, previewMode=${previewMode}`);
  
    ctx.logger.verbose(`${this.LoggingPrefix} adding default user avatar`);
    await this.ensureImageCategory(ctx, ImageCategory.UserAvatar, 512, 512);
    await this.ensureImage(ctx, 'default-user-avatar.webp', {
      category: ImageCategory.UserAvatar,
      slug: DefaultUserAvatarSlug,
      mimeType: MimeTypeWebp
    }, previewMode);
  
    ctx.logger.verbose(`${this.LoggingPrefix} adding default user cover`);
    await this.ensureImageCategory(ctx, ImageCategory.UserCover, 1230, 350);
    await this.ensureImage(ctx, 'default-user-cover.webp', {
      category: ImageCategory.UserCover,
      slug: DefaultUserCoverSlug,
      mimeType: MimeTypeWebp
    }, previewMode);
  
    ctx.logger.info(`${this.LoggingPrefix} >>> adding default user cover image, previewMode=${previewMode} - completed`);
  }
  
  async ensureCountry (ctx: ContextParams, countryInfo: ICountryInfo): Promise<EntityId> {
    ctx.logger.info(`${this.LoggingPrefix} ensuring country, code=${countryInfo.code}, name=${countryInfo.name.en}`);
    const geoLogic = this.geoLogic;
    if (!ctx.dbCountryMap) {
      ctx.logger.info(`${this.LoggingPrefix} >>> initializing country data context`);
      const countries = await geoLogic.getAllCountries();
      ctx.dbCountryMap = new Map<string, EntityId>();
      for (let i = 0; i < countries.length; i++) {
        const country = countries[i];
        ctx.dbCountryMap.set(country.name.en, country.id);
      }
      ctx.logger.info(`${this.LoggingPrefix} >>> Country data context initialized, size=${ctx.dbCountryMap.size}`);
    }
  
    const existingCountry = ctx.dbCountryMap.get(countryInfo.name.en!);
    if (existingCountry) {
      return existingCountry;
    }
  
    const countryId = await geoLogic.createCountry({ name: countryInfo.name as ILocalizableValue });
    ctx.dbCountryMap.set(countryInfo.name.en!, countryId);
  
    ctx.logger.info(`${this.LoggingPrefix} adding country, code=${countryInfo.code}, name=${countryInfo.name.en} - created new, id=${countryId}`);
    return countryId;
  }
  
  getCitySlug (ctx: ContextParams, cityInfo: ICityInfo): string {
    // some predefined cities to get rid of duplicates
    if (cityInfo.code === 'Q16553') {
      return 'san-jose-16553';
    }
  
    const cityNameEn = cityInfo.name.en!;
    const citySlug = slugify(cityNameEn, { lower: true });
    if (citySlug.length > 256) {
      const msg = `got too long slug for city, name=${cityNameEn}`;
      ctx.logger.warn(msg);
      throw new Error(msg);
    }
    return citySlug;
  }
  
  async ensureCity (ctx: ContextParams, cityInfo: ICityInfo, countryId: EntityId, previewMode: PreviewMode): Promise<EntityId> {
    ctx.logger.info(`${this.LoggingPrefix} >>> adding city, code=${cityInfo.code}, name=${cityInfo.name.en}, countryId=${countryId}, previewMode=${previewMode}`);
  
    const geoLogic = this.geoLogic;
    if (!ctx.dbCityMap) {
      ctx.logger.info(`${this.LoggingPrefix} >>> initializing city data context`);
      const cities = await geoLogic.getAllCities(previewMode);
      ctx.dbCityMap = new Map<string, EntityId>();
      for (let i = 0; i < cities.length; i++) {
        const city = cities[i];
        ctx.dbCityMap.set(city.name.en, city.id);
      }
      ctx.logger.info(`${this.LoggingPrefix} >>> City data context initialized, size=${ctx.dbCityMap.size}`);
    }
  
    const existingCity = ctx.dbCityMap.get(cityInfo.name.en!);
    if (existingCity) {
      return existingCity;
    }
  
    const cityId = await geoLogic.createCity({
      slug: this.getCitySlug(ctx, cityInfo),
      geo: {
        lat: cityInfo.lat!.toNumber(),
        lon: cityInfo.lon!.toNumber()
      },
      utcOffsetMin: cityInfo.utcOffsetMin,
      population: cityInfo.population,
      name: cityInfo.name as ILocalizableValue,
      countryId
    }, previewMode);
  
    ctx.dbCityMap.set(cityInfo.name.en!, cityId);
  
    ctx.logger.info(`${this.LoggingPrefix} >>> adding city, code=${cityInfo.code}, name=${cityInfo.name.en}, countryId=${countryId}, previewMode=${previewMode} - created new, id=${cityId}`);
    return cityId;
  }
  
  async ensureAirport (ctx: ContextParams, airportInfo: IAirportInfo, cityId: EntityId, previewMode: PreviewMode): Promise<EntityId> {
    ctx.logger.info(`${this.LoggingPrefix} adding airport, code=${airportInfo.code}, name=${airportInfo.name.en}, cityId=${cityId}, previewMode=${previewMode}`);
  
    const airportLogic = this.airportLogic;
    if (!ctx.dbAirportMap) {
      ctx.logger.info(`${this.LoggingPrefix} >>> initializing airport data context`);
      const airports = await airportLogic.getAllAirportsShort(previewMode);
      ctx.dbAirportMap = new Map<string, EntityId>();
      for (let i = 0; i < airports.length; i++) {
        const airport = airports[i];
        ctx.dbAirportMap.set(airport.name.en, airport.id);
      }
      ctx.logger.info(`${this.LoggingPrefix} Airport data context initialized, size=${ctx.dbAirportMap.size}`);
    }
  
    const existingAirport = ctx.dbAirportMap.get(airportInfo.name.en!);
    if (existingAirport) {
      return existingAirport;
    }
  
    const airportId = await airportLogic.createAirport({
      cityId,
      geo: {
        lat: airportInfo.lat.toNumber(),
        lon: airportInfo.lon.toNumber()
      },
      name: airportInfo.name as ILocalizableValue
    }, previewMode);
  
    ctx.dbAirportMap.set(airportInfo.name.en!, airportId);
  
    ctx.logger.info(`${this.LoggingPrefix} adding airport, code=${airportInfo.code}, name=${airportInfo.name.en}, cityId=${cityId}, previewMode=${previewMode} - created new, id=${airportId}`);
    return airportId;
  }
  
  async addGeoData (ctx: ContextParams, previewMode: PreviewMode) : Promise<void> {
    ctx.logger.info(`${this.LoggingPrefix} >>> adding geo data, previewMode=${previewMode}`);
  
    type CityUtcOffsetJsonRaw = {
      city: string,
      offset: number
    };
  
    type AirportJsonRaw = {
      airport: string,
      airportLabel: string,
      coor: string,
      city: string,
      cityName: string,
      cityPopulation: string,
      country: string,
      countryLabel: string
    };
  
    type AirportJson = {
      code: string,
      airportLabel: string,
      lon: Decimal,
      lat: Decimal,
      cityCode: string,
      cityName: string,
      cityPopulation: number,
      countryCode: string,
      countryLabel: string
    };
  
    const mapAirportJson = (src: AirportJsonRaw) : AirportJson => {
      const locPoints = src.coor.replace('Point', '').replace('(', '').replace(')', '').split(' ').map(s => new Decimal(s));
      if (locPoints?.length !== 2) {
        ctx.logger.error(`${this.LoggingPrefix} failed to parse airport location: airport=${src.airport}, value=${src.coor}`);
        throw new Error(`failed to parse airport location: airport=${src.airport}, value=${src.coor}`);
      }
      const cityPopulation = parseInt(src.cityPopulation);
      if (cityPopulation <= 0 || cityPopulation > 200000000) {
        ctx.logger.error(`${this.LoggingPrefix} suspicious city population value: airport=${src.airport}, value=${src.cityPopulation}`);
        throw new Error(`suspicious city population value: airport=${src.airport}, value=${src.cityPopulation}`);
      }
  
      return {
        code: src.airport.split('/').pop()!,
        airportLabel: src.airportLabel,
        lon: locPoints[0],
        lat: locPoints[1],
        cityCode: src.city.split('/').pop()!,
        cityName: src.cityName,
        cityPopulation,
        countryCode: src.country.split('/').pop()!,
        countryLabel: src.countryLabel
      };
    };
  
    const countryMap = new Map<string, ICountryInfo>();
    const cityMap = new Map<string, ICityInfo>();
    const airportMap = new Map<string, IAirportInfo>();
  
    const updateLocalization = (airportJson: AirportJson, locale: 'ru' | 'fr') => {
      const country = countryMap.get(airportJson.countryCode);
      if (!country) {
        ctx.logger.error(`${this.LoggingPrefix} cannot find country for ${locale.toUpperCase()} localization: airport=${airportJson.code}`);
        throw new Error(`cannot find country for ${locale.toUpperCase()} localization: airport=${airportJson.code}`);
      }
      country.name[locale] = airportJson.countryLabel;
  
      const city = cityMap.get(airportJson.cityCode);
      if (!city) {
        ctx.logger.error(`${this.LoggingPrefix} cannot find city for ${locale.toUpperCase()} localization: airport=${airportJson.code}`);
        throw new Error(`cannot find city for ${locale.toUpperCase()} localization: airport=${airportJson.code}`);
      }
      city.name[locale] = airportJson.cityName;
  
      const airport = airportMap.get(airportJson.code);
      if (!airport) {
        ctx.logger.error(`${this.LoggingPrefix} cannot find airport for ${locale.toUpperCase()} localization: airport=${airportJson.code}`);
        throw new Error(`cannot find airport for ${locale.toUpperCase()} localization: airport=${airportJson.code}`);
      }
      airport.name[locale] = airportJson.airportLabel;
    };
  
    ctx.logger.info(`${this.LoggingPrefix} adding geo data - creating unlocalized indexes`);
    const enFilePath = join(ctx.contentDir, 'geo', 'city-airports-en.json');
    const enFileContent = await readFile(enFilePath, 'utf-8');
    const enJson = (destr<AirportJsonRaw[]>(enFileContent)).map(src => mapAirportJson(src));
  
    const cityUtcOffsetsFilePath = join(ctx.contentDir, 'geo', 'city-utc-offsets.json');
    const cityUtcOffsetsFileContent = await readFile(cityUtcOffsetsFilePath, 'utf-8');
    const cityUtcOffsetsJson = (destr<CityUtcOffsetJsonRaw[]>(cityUtcOffsetsFileContent));
    const cityUtcOffsetsMap = new Map<string, number>(cityUtcOffsetsJson.map(x => [x.city.split('/').pop()!, x.offset]));
  
    const missedUtcOffsetCitiesMap = new Map<string, ICityInfo>();
    for (let i = 0; i < enJson.length; i++) {
      const airportJson = enJson[i];
      let country = countryMap.get(airportJson.countryCode);
      if (!country) {
        country = {
          code: airportJson.countryCode,
          name: { en: airportJson.countryLabel }
        };
        countryMap.set(airportJson.countryCode, country);
      }
  
      let city = cityMap.get(airportJson.cityCode);
      if (!city) {
        const cityUtcOffset = cityUtcOffsetsMap.get(airportJson.cityCode);
        if (!cityUtcOffset) {
          // ctx.logger.debug(`${this.LoggingPrefix} adding geo data - cannot find utc offset for city: code=${airportJson.cityCode}, name=${airportJson.cityName}`);
          // throw new Error('cannot find utc offset for city');
          // missedUtcOffsetsCount++;
        }
  
        city = {
          code: airportJson.cityCode,
          countryCode: airportJson.countryCode,
          name: {
            en: airportJson.cityName
          },
          population: airportJson.cityPopulation,
          airports: [],
          countryInfo: country,
          utcOffsetMin: Math.round((cityUtcOffset ?? 0) * 60)
        };
        cityMap.set(airportJson.cityCode, city);
        if (cityUtcOffset === undefined) {
          missedUtcOffsetCitiesMap.set(city.code, city);
        }
      }
  
      let airport = airportMap.get(airportJson.code);
      if (!airport) {
        airport = {
          cityCode: airportJson.cityCode,
          code: airportJson.code,
          lon: airportJson.lon,
          lat: airportJson.lat,
          name: {
            en: airportJson.airportLabel
          },
          cityInfo: city
        };
        airportMap.set(airportJson.code, airport);
      }
  
      city!.airports.push(airport);
    }
  
    let allCities = Array.from(cityMap.values());
    for (let i = 0; i < allCities.length; i++) {
      const city = allCities[i];
      city.lat = city.airports.reduce((sum: Decimal, airport: IAirportInfo) => { return sum.add(airport.lat); }, new Decimal(0)).div(city.airports.length);
      city.lon = city.airports.reduce((sum: Decimal, airport: IAirportInfo) => { return sum.add(airport.lon); }, new Decimal(0)).div(city.airports.length);
    }
  
    const missedUtcOffsetCityCodes = Array.from(missedUtcOffsetCitiesMap.keys());
    ctx.logger.info(`${this.LoggingPrefix} adding geo data - filling UTC offset for cities where it is missed, count=${missedUtcOffsetCityCodes.length}`);
    const citiesWithUtcOffsets = allCities.filter(c => !missedUtcOffsetCitiesMap.has(c.code));
  
    for (let i = 0; i < missedUtcOffsetCityCodes.length; i++) {
      const cityCode = missedUtcOffsetCityCodes[i];
      const city = missedUtcOffsetCitiesMap.get(cityCode)!;
  
      let nearestCity = citiesWithUtcOffsets[0];
      let nearestDist = Math.sqrt((city.lat!.toNumber() - nearestCity.lat!.toNumber()) + (city.lon!.toNumber() - nearestCity.lon!.toNumber()));
      for (let j = 0; j < citiesWithUtcOffsets.length; j++) {
        const testCity = citiesWithUtcOffsets[j];
        const dist = Math.sqrt((city.lat!.toNumber() - testCity.lat!.toNumber()) + (city.lon!.toNumber() - testCity.lon!.toNumber()));
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestCity = testCity;
        }
      }
  
      ctx.logger.verbose(`${this.LoggingPrefix} adding geo data - updating city UTC offset, code=${city.code}, name=${city.name}, nearestCity=${nearestCity.name}, utcOffset=${nearestCity.utcOffsetMin}`);
      city.utcOffsetMin = nearestCity.utcOffsetMin;
    }
  
    ctx.logger.info(`${this.LoggingPrefix} adding geo data - RU localization`);
    const ruFilePath = join(ctx.contentDir, 'geo', 'city-airports-ru.json');
    const ruFileContent = await readFile(ruFilePath, 'utf-8');
    const ruJson = (destr<AirportJsonRaw[]>(ruFileContent)).map(src => mapAirportJson(src));
    for (let i = 0; i < ruJson.length; i++) {
      const airportJson = ruJson[i];
      updateLocalization(airportJson, 'ru');
    }
  
    ctx.logger.info(`${this.LoggingPrefix} adding geo data - FR localization`);
    const frFilePath = join(ctx.contentDir, 'geo', 'city-airports-fr.json');
    const frFileContent = await readFile(frFilePath, 'utf-8');
    const frJson = (destr<AirportJsonRaw[]>(frFileContent)).map(src => mapAirportJson(src));
    for (let i = 0; i < frJson.length; i++) {
      const airportJson = frJson[i];
      updateLocalization(airportJson, 'fr');
    }
  
    ctx.logger.info(`${this.LoggingPrefix} >>> adding geo data - fitlering uncomplete data`);
    const removeUncompleteEntries = <T extends { code: string, name: Partial<ILocalizableValue> }>(map: Map<string, T>): number => {
      const allEntries = Array.from(map.values());
      const entryCodesToRemove : string[] = [];
      for (let i = 0; i < allEntries.length; i++) {
        if ((allEntries[i].name?.en?.length ?? 0) === 0 ||
            (allEntries[i].name?.ru?.length ?? 0) === 0 ||
            (allEntries[i].name?.fr?.length ?? 0) === 0) {
          entryCodesToRemove.push(allEntries[i].code);
        }
      }
      entryCodesToRemove.forEach((c) => { map.delete(c); });
      return entryCodesToRemove.length;
    };
  
    ctx.logger.info(`${this.LoggingPrefix} adding geo data - ${removeUncompleteEntries(airportMap)} uncompleted airports removed`);
    ctx.logger.info(`${this.LoggingPrefix} adding geo data - ${removeUncompleteEntries(cityMap)} uncompleted cities removed`);
    ctx.logger.info(`${this.LoggingPrefix} adding geo data - ${removeUncompleteEntries(countryMap)} uncompleted countries removed`);
  
    let allAirports = Array.from(airportMap.values());
    const airportCodesToRemove: string[] = [];
    for (let i = 0; i < allAirports.length; i++) {
      if (!cityMap.has(allAirports[i].cityCode)) {
        airportCodesToRemove.push(allAirports[i].code);
      }
    }
    airportCodesToRemove.forEach(c => cityMap.delete(c));
    ctx.logger.info(`${this.LoggingPrefix} adding geo data - ${airportCodesToRemove.length} airports without city removed`);
  
    allCities = Array.from(cityMap.values());
    let unreferencedAirportsCount = 0;
    for (let i = 0; i < allCities.length; i++) {
      const city = allCities[i];
      const filteredAirportList: IAirportInfo[] = [];
      for (let j = 0; j < city.airports.length; j++) {
        if (airportMap.has(city.airports[j].code)) {
          filteredAirportList.push(city.airports[j]);
        } else {
          unreferencedAirportsCount++;
        }
      }
      city.airports = filteredAirportList;
    }
    ctx.logger.info(`${this.LoggingPrefix} adding geo data - ${unreferencedAirportsCount} unreferenced city airports removed`);
  
    allCities = Array.from(cityMap.values());
    const allCountries = Array.from(countryMap.values());
    allAirports = Array.from(airportMap.values());
  
    ctx.logger.info(`${this.LoggingPrefix} >>> adding geo data - COUNTRY entities`);
    for (let i = 0; i < allCountries.length; i++) {
      await this.ensureCountry(ctx, allCountries[i]);
    }
  
    ctx.logger.info(`${this.LoggingPrefix} >>> adding geo data - adding CITY entities`);
    for (let i = 0; i < allCities.length; i++) {
      const cityInfo = allCities[i];
      const countryId = ctx.dbCountryMap!.get(cityInfo.countryInfo.name.en!)!;
      await this.ensureCity(ctx, allCities[i], countryId, previewMode);
    }
  
    ctx.logger.info(`${this.LoggingPrefix} >>> adding geo data - adding AIRPORT entities`);
    const ignoreAirports = ['Peoria International Airport', 'Albuquerque International Sunport', 'Gulfport-Biloxi International Airport', 'Quad Cities International Airport', 'Guaraní International Airport']; // airports with inconsistent data
    for (let i = 0; i < allAirports.length; i++) {
      const airportInfo = allAirports[i];
      if (ignoreAirports.includes(airportInfo.name.en!)) {
        continue;
      }
      const cityId = ctx.dbCityMap!.get(airportInfo.cityInfo.name.en!)!;
      await this.ensureAirport(ctx, allAirports[i], cityId, previewMode);
    }
  
    ctx.logger.info(`${this.LoggingPrefix} >>> adding geo data, previewMode=${previewMode} - completed: totalAirport=${airportMap.size}, totalCities=${cityMap.size}, totalCountries=${countryMap.size}`);
  }
  
  async addPopularCities (ctx: ContextParams, previewMode: PreviewMode) : Promise<void> {
    ctx.logger.info(`${this.LoggingPrefix} >>> adding popular cities, previewMode=${previewMode}`);
  
    type PopularCityJson = { name: string, rating: number, geo: { lon: number, lat: number }, promoLine: { en: string, ru: string, fr: string }, visibleOnWorldMap?: boolean };
    type TravelDetailsJson = {
      slug: string,
      header: ILocalizableValue,
      text: ILocalizableValue
    };
  
    const filePath = join(ctx.contentDir, 'geo', 'popular-cities.json');
    const fileContent = await readFile(filePath, 'utf-8');
    const enJson = destr<PopularCityJson[]>(fileContent);
  
    const fallIntoTravelFilePath = join(ctx.contentDir, 'fall-into-travel.json');
    const fallIntoTravelFileContent = await readFile(fallIntoTravelFilePath, 'utf-8');
    const cityDetails = (destr<TravelDetailsJson[]>(fallIntoTravelFileContent));
  
    const citiesLogic = this.citiesLogic;
    const existingPopularCities = await citiesLogic.getPopularCities(previewMode);
  
    for (let i = 0; i < enJson.length; i++) {
      const popularCityJson = enJson[i];
      if (existingPopularCities.some(e => e.cityDisplayName.en === popularCityJson.name)) {
        ctx.logger.info(`${this.LoggingPrefix} adding popular cities - ${popularCityJson.name} already exists`);
        continue;
      }
  
      const citySlug = popularCityJson.name.replace(/\s/g, '-').toLowerCase();
      const cityEntity = await citiesLogic.getCity(citySlug, previewMode);
      if (!cityEntity) {
        throw new Error(`cannot find original city for popular city entity: name=${popularCityJson.name}`);
      }
  
      const travelDetails = cityDetails.find(i => i.slug === citySlug);
      if (!travelDetails) {
        const msg = `cannot find travel details for popular city, name=${popularCityJson.name}`;
        ctx.logger.warn(msg);
        throw new Error(msg);
      }
  
      await citiesLogic.makeCityPopular({
        cityId: cityEntity.id,
        promoLineStr: popularCityJson.promoLine,
        travelHeaderStr: travelDetails.header,
        travelTextStr: travelDetails.text,
        visibleOnWorldMap: popularCityJson.visibleOnWorldMap ?? false,
        rating: popularCityJson.rating,
        geo: popularCityJson.geo
      }, previewMode);
  
      ctx.logger.info(`${this.LoggingPrefix} adding popular cities, previewMode=${previewMode} - ${popularCityJson.name} created`);
    }
    ctx.logger.info(`${this.LoggingPrefix} >>> adding popular cities, previewMode=${previewMode} - completed`);
  }
  
  async getImageSize (filePath: string): Promise<{ width: number, height: number }> {
    const sharpObj = sharp(filePath);
    const metadata = await sharpObj.metadata();
    if (!metadata.width || !metadata.height) {
      throw new Error('failed to parse image');
    }
    return { width: metadata.width!, height: metadata.height! };
  }
  
  async computeImageCategorySize (files: string[]): Promise<{ width: number, height: number }> {
    const imageSizes: { width: number, height: number }[] = [];
    for (let i = 0; i < files.length; i++) {
      imageSizes.push(await this.getImageSize(files[i]));
    }
  
    return {
      width: Math.min(...imageSizes.map(i => i.width)),
      height: Math.min(...imageSizes.map(i => i.height))
    };
  }
  
  async addCityImages (ctx: ContextParams, previewMode: PreviewMode) : Promise<void> {
    ctx.logger.info(`${this.LoggingPrefix} >>> adding city images, previewMode=${previewMode}`);
  
    const citiesLogic = this.citiesLogic;
    const popularCityInfos = await citiesLogic.getPopularCities(previewMode);
  
    const imageFiles = await readdir(join(ctx.contentDir, 'cities'));
  
    const cardImageFiles = imageFiles.filter(f => !f.includes('-')).map(f => join(ctx.contentDir, 'cities', f));
    const cityCardCategorySize = await this.computeImageCategorySize(cardImageFiles);
    ctx.logger.info(`${this.LoggingPrefix} adding city images - city card category sizes: w=${cityCardCategorySize.width}, h=${cityCardCategorySize.height}`);
  
    const travelBlockImageFiles = imageFiles.filter(f => !cardImageFiles.includes(f)).map(f => join(ctx.contentDir, 'cities', f));
    const travelBlockCategorySize = await this.computeImageCategorySize(travelBlockImageFiles);
    ctx.logger.info(`${this.LoggingPrefix} adding city images - travel block category sizes: w=${travelBlockCategorySize.width}, h=${travelBlockCategorySize.height}`);
  
    await this.ensureImageCategory(ctx, ImageCategory.CityCard, cityCardCategorySize.width, cityCardCategorySize.height);
    await this.ensureImageCategory(ctx, ImageCategory.TravelBlock, travelBlockCategorySize.width, travelBlockCategorySize.height);
  
    for (let i = 0; i < popularCityInfos.length; i++) {
      const popularCityInfo = popularCityInfos[i];
      ctx.logger.verbose(`${this.LoggingPrefix} processing popular city images - cityId=${popularCityInfo.id}`);
  
      const citySlugBase = popularCityInfo.cityDisplayName.en.replace(/\s/g, '').toLowerCase();
      const testPath = join(ctx.contentDir, `cities/${citySlugBase}.webp`);

      try {
        await access(testPath);
      } catch (err: any) {
        // presumably file does not exist
        const msg = `cannot find city images: ${citySlugBase}.webp`;
        ctx.logger.error(`${this.LoggingPrefix} ${msg}`, err);
        throw new Error(msg);
      }
  
      const imageIds = [] as EntityId[];
      imageIds.push(await this.ensureImage(ctx, `cities/${citySlugBase}.webp`, {
        category: ImageCategory.CityCard,
        slug: citySlugBase + 1,
        mimeType: MimeTypeWebp
      }, previewMode, cityCardCategorySize));
  
      const popularCityTravelFiles = imageFiles.filter(f => f.includes(`${citySlugBase}-`));
      if (popularCityTravelFiles.length !== 4) { // additional check for initial DB initialization data to be sure all seeding images have been picked up
        throw new Error('unexpected number of travel files');
      }
      for (let j = 0; j < popularCityTravelFiles.length; j++) {
        imageIds.push(await this.ensureImage(ctx, `cities/${popularCityTravelFiles[j]}`, {
          category: ImageCategory.TravelBlock,
          slug: `${citySlugBase}-${j + 2}`,
          mimeType: MimeTypeWebp
        }, previewMode, travelBlockCategorySize));
      }
  
      await citiesLogic.setPopularCityImages(popularCityInfo.id, imageIds.map((id, order) => { return { id, order: order + 1 }; }), previewMode);
  
      ctx.logger.verbose(`${this.LoggingPrefix} popular city images processed, previewMode=${previewMode} - cityId=${popularCityInfo.id}`);
    }
    ctx.logger.info(`${this.LoggingPrefix} ensuring popular city image - completed, previewMode=${previewMode}`);
  }
  
  async addCompanyReviews (ctx: ContextParams, previewMode: PreviewMode) : Promise<void> {
    ctx.logger.info(`${this.LoggingPrefix} >>> adding company reviews, previewMode=${previewMode}`);
  
    type Review = {
      header: ILocalizableValue,
      body: ILocalizableValue,
      user: ILocalizableValue
    };
  
    const reviewsFilePath = join(ctx.contentDir, 'company-reviews', 'texts.json');
    const reviewsFileContent = await readFile(reviewsFilePath, 'utf-8');
    const reviews = (destr<Review[]>(reviewsFileContent));
  
    const reviewsImageFiles = (await readdir(join(ctx.contentDir, 'company-reviews'))).filter(f => f.includes('webp')).map(f => join(ctx.contentDir, 'company-reviews', f));
    const reviewImageCategorySize = await this.computeImageCategorySize(reviewsImageFiles);
    ctx.logger.info(`${this.LoggingPrefix} adding company reviews - company review image category size: w=${reviewImageCategorySize.width}, h=${reviewImageCategorySize.height}`);
    await this.ensureImageCategory(ctx, ImageCategory.CompanyReview, reviewImageCategorySize.width, reviewImageCategorySize.height);
  
    const companyReviewsLogic = this.companyReviewsLogic;
    const existingReviews = await companyReviewsLogic.getReviews(previewMode);
    for (let i = 0; i < reviews.length; i++) {
      const review = reviews[i];
  
      const imageFileBaseName = basename(reviewsImageFiles[i]);
      ctx.logger.verbose(`${this.LoggingPrefix} adding company review, file=${imageFileBaseName}`);
  
      const imageSlug = `company-${imageFileBaseName.split('.')[0]}`;
      if (existingReviews.some(r => r.imgSlug === imageSlug)) {
        ctx.logger.verbose(`${this.LoggingPrefix} adding company review - already exist, file=${imageFileBaseName}`);
        continue;
      }
  
      const imageId = await this.ensureImage(ctx, `company-reviews/${imageFileBaseName}`, {
        category: ImageCategory.CompanyReview,
        slug: imageSlug,
        mimeType: MimeTypeWebp
      }, previewMode, reviewImageCategorySize);
      const reviewId = await companyReviewsLogic.createReview({
        body: review.body,
        header: review.header,
        userName: review.user,
        imageId
      }, previewMode);
      
      ctx.logger.info(`${this.LoggingPrefix} added company review image, previewMode=${previewMode} - baseName=${imageFileBaseName}, companyReviewId=${reviewId}`);
    }
    ctx.logger.info(`${this.LoggingPrefix} >>> adding company reviews, previewMode=${previewMode} - completed`);
  }
  
  async addFlightsPageTitleImages (ctx: ContextParams, previewMode: PreviewMode) : Promise<void> {
    ctx.logger.info(`${this.LoggingPrefix} >>> creating flights page title images, previewMode=${previewMode}`);
    await this.ensureImageCategory(ctx, ImageCategory.PageTitle, 1770, 1180);
    const stubCssStyle = fromPairs([
      ['backgroundImage', 'radial-gradient(circle at 68% 25%, hsla(60, 100%, 68%, 0.5) -25%, hsla(38, 100%, 61%, 0.29) 38%), linear-gradient(47deg, hsl(240, 97%, 31%) -20%, hsl(0, 0%, 36%) 49%)'],
      ['backgroundSize', '100% 100%, 100% 100%'],
      ['backgroundRepeat', 'repeat, no-repeat'],
      ['backgroundPosition', '109% 58%, 0% 0%']
    ]) as CssPropertyList;
    await this.ensureImage(ctx, 'flights-title.webp', {
      category: ImageCategory.PageTitle,
      slug: FlightsTitleSlug,
      stubCssStyle,
      mimeType: MimeTypeWebp
    }, previewMode);
    ctx.logger.info(`${this.LoggingPrefix} >>> creating flights page title images, previewMode=${previewMode} - completed`);
  }
  
  async compileWorldMapData (ctx: ContextParams): Promise<void> {
    ctx.logger.info(`${this.LoggingPrefix} >>> compiling world map data`);
  
    const srcFile = join(ctx.contentDir, 'geo', 'world-map.svg');
    const worldMapSvg = await readFile(srcFile, 'utf8');
    const cellSvgs = worldMapSvg
      .split(/\n/g)
      .filter(l => l.includes('path opacity="0.3"'))
      .map((l) => {
        const dl = /d="([^"]*)"/g.exec(l);
        return (dl?.length ?? 0) > 0 ? dl![1] : undefined;
      })
      .filter(l => l);
  
    const mapPoints : {x: number, y: number, d: number}[] = [];
    for (let i = 0; i < cellSvgs.length; i++) {
      const cellSvg = cellSvgs[i]!;
      const tokens = cellSvg.split(' ');
  
      const cellPoints : {x: number, y: number}[] = [];
      for (let i = 0; i < tokens.length; i++) {
        const curToken = tokens[i];
        if (curToken.match(/[a-zA-Z]/)) {
          continue;
        }
        if (i + 1 === tokens.length) {
          ctx.logger.warn(`${this.LoggingPrefix} unpaired point coordinate: ${cellSvg}`);
          throw new Error('unpaired point coordinate');
        }
        const nextToken = tokens[i + 1];
        i += 1;
  
        try {
          const point = { x: parseFloat(nextToken), y: parseFloat(curToken) };
          if (!point.x || !point.y) {
            throw new Error('failed to parse point coordinate');
          }
          cellPoints.push(point);
        } catch (err: any) {
          ctx.logger.warn(`${this.LoggingPrefix} failed to parse point coordinates: ${cellSvg}`, err);
          throw new Error('failed to parse point coordinate');
        }
      }
  
      if (!cellPoints.length) {
        ctx.logger.warn(`${this.LoggingPrefix} no point data found in cell: ${cellSvg}`);
        throw new Error('no point data found in cell');
      }
  
      const center = { x: mean(cellPoints.map(p => p.x)), y: mean(cellPoints.map(p => p.y)) };
      if (WorldMapDimDefs.viewport.x > center.x || center.x > (WorldMapDimDefs.viewport.x + WorldMapDimDefs.viewport.width) ||
        WorldMapDimDefs.viewport.y > center.y || center.y > (WorldMapDimDefs.viewport.y + WorldMapDimDefs.viewport.height)) {
        continue;
      }
  
      mapPoints.push(
        {
          x: (center.x - WorldMapDimDefs.viewport.x) / WorldMapDimDefs.viewport.width,
          y: (center.y - WorldMapDimDefs.viewport.y) / WorldMapDimDefs.viewport.height,
          d: (Math.max(...cellPoints.map(p => p.x)) - Math.min(...cellPoints.map(p => p.x))) / WorldMapDimDefs.viewport.width
        }
      );
    }
  
    const resultJson = { // see IWorldMapDataDto
      cellRelativeSize: mean(mapPoints.map(p => p.d)),
      points: mapPoints.map((p) => { return { x: p.x, y: p.y }; }),
      source: WorldMapDimDefs.source,
      viewport: WorldMapDimDefs.viewport,
      origin: {
        geo: WorldMapDimDefs.origin.geo,
        relative: {
          x: (WorldMapDimDefs.origin.relative.x * WorldMapDimDefs.source.width - WorldMapDimDefs.viewport.x) / WorldMapDimDefs.viewport.width,
          y: (WorldMapDimDefs.origin.relative.y * WorldMapDimDefs.source.height - WorldMapDimDefs.viewport.y) / WorldMapDimDefs.viewport.height
        }
      },
      step: {
        geo: {
          lat: WorldMapDimDefs.step.geo.lat * (WorldMapDimDefs.viewport.height / WorldMapDimDefs.source.height),
          lon: WorldMapDimDefs.step.geo.lon * (WorldMapDimDefs.viewport.width / WorldMapDimDefs.source.width)
        },
        relative: WorldMapDimDefs.step.relative
      }
    };
    const outFile = join(ctx.appDataDir, 'world-map.json');
    await writeFile(outFile, JSON.stringify(resultJson), 'utf8');
  
    ctx.logger.info(`${this.LoggingPrefix} >>> compiling world map data - completed: count=${mapPoints.length}, left=${Math.min(...mapPoints.map(p => p.x))}, right=${Math.max(...mapPoints.map(p => p.x))}, top=${Math.min(...mapPoints.map(p => p.y))}, bottom=${Math.max(...mapPoints.map(p => p.y))}, d=${mean(mapPoints.map(p => p.d))}`);
  }
  
  async addAirlineCompanies (ctx: ContextParams, previewMode: PreviewMode) {
    ctx.logger.info(`${this.LoggingPrefix} >>> adding airline companies, previewMode=${previewMode}`);
  
    type AirlineCompanyJsonRaw = {
      citySlug: string,
      name: {
        en: string,
        fr: string,
        ru: string
      },
      invertLogoForDarkTheme: boolean,
      numReviews: number,
      reviewScore: number
    };
  
    const getLogoFileName = (citySlug: string, theme: Theme | undefined) => `${citySlug}${theme !== undefined ? `-${theme}` : ''}.webp`;
    const getLogoFilePath = (citySlug: string, theme: Theme | undefined) => join(ctx.contentDir, 'airline-companies', getLogoFileName(citySlug, theme));
  
    const airlineCompanyLogic = this.airlineCompanyLogic;
    const citiesLogic = this.citiesLogic;
  
    await this.ensureImageCategory(ctx, ImageCategory.AirlineLogo, 512, 512);
  
    const filePath = join(ctx.contentDir, 'airline-companies', 'companies-list.json');
    const fileContent = await readFile(filePath, 'utf-8');
    const json = (destr<AirlineCompanyJsonRaw[]>(fileContent));
    for (let i = 0; i < json.length; i++) {
      const companyJson = json[i];
      ctx.logger.verbose(`${this.LoggingPrefix} adding airline companies - city=${companyJson.citySlug}`);
      const logoImageSlug = `airline-company-logo-${i}`;
  
      const cityInfo = (await citiesLogic.getCity(companyJson.citySlug, previewMode));
  
      let logoImageId: EntityId;
      const citySlug = companyJson.citySlug;
      if (await this.checkFileExists(getLogoFilePath(citySlug, undefined))) {
        const fileName = join('airline-companies', getLogoFileName(citySlug, undefined));
        logoImageId = await this.ensureImage(ctx, fileName, {
          category: ImageCategory.AirlineLogo,
          slug: logoImageSlug,
          mimeType: MimeTypeWebp
        }, previewMode, undefined, companyJson.invertLogoForDarkTheme);
      } else {
        ctx.logger.error(`${this.LoggingPrefix} Airline company logo image does not exists: ${getLogoFilePath(citySlug, undefined)}`);
        throw new Error('Airline company logo image does not exists');
      }
  
      const companyId = await airlineCompanyLogic.createAirlineCompany({
        cityId: cityInfo.id,
        logoImageId,
        city: {
          geo: cityInfo.geo
        },
        name: companyJson.name,
        reviewSummary: {
          numReviews: companyJson.numReviews,
          score: companyJson.reviewScore
        }
      }, previewMode);
  
      ctx.logger.verbose(`${this.LoggingPrefix} adding airline companies - added for city=${companyJson.citySlug}, id=${companyId}`);
    }
  
    ctx.logger.info(`${this.LoggingPrefix} >>> adding airline companies, previewMode=${previewMode} - completed: count=${json.length}`);
  }
  
  async createAirplaneImageData (ctx: ContextParams, airplaneIndex: number, featureCategorySize: { width: number, height: number }, previewMode: PreviewMode): Promise<{ imageId: EntityId, kind: AirplaneImageKind, order: number }[]> {
    const getAirplaneFeatureImageFilePath = (kind: AirplaneImageKind, idx: number) => join('airplanes', `${kind}-0${idx}.webp`);
  
    const imageData: {
      imageId: EntityId,
      kind: AirplaneImageKind,
      order: number
    }[] = [];
  
    let imageId = await this.ensureImage(ctx, join('airplanes', `airplane-0${airplaneIndex + 1}.webp`), {
      category: ImageCategory.Airplane,
      slug: `airplane${airplaneIndex}`,
      mimeType: MimeTypeWebp
    }, previewMode);
    imageData.push({
      imageId,
      kind: 'main',
      order: 0
    });
  
    imageId = await this.ensureImage(ctx, getAirplaneFeatureImageFilePath('window', 1), {
      category: ImageCategory.AirplaneFeature,
      slug: `airplane${airplaneIndex}-${<AirplaneImageKind>'window'}1`,
      mimeType: MimeTypeWebp
    }, previewMode, featureCategorySize);
    imageData.push({
      imageId,
      kind: 'window',
      order: 1
    });
  
    imageId = await this.ensureImage(ctx, getAirplaneFeatureImageFilePath('cabin', 1), {
      category: ImageCategory.AirplaneFeature,
      slug: `airplane${airplaneIndex}-${<AirplaneImageKind>'cabin'}1`,
      mimeType: MimeTypeWebp
    }, previewMode, featureCategorySize);
    imageData.push({
      imageId,
      kind: 'cabin',
      order: 2
    });
  
    imageId = await this.ensureImage(ctx, getAirplaneFeatureImageFilePath('window', 2), {
      category: ImageCategory.AirplaneFeature,
      slug: `airplane${airplaneIndex}-${<AirplaneImageKind>'window'}2`,
      mimeType: MimeTypeWebp
    }, previewMode, featureCategorySize);
    imageData.push({
      imageId,
      kind: 'window',
      order: 3
    });
  
    for (let i = 0; i < 4; i++) {
      imageId = await this.ensureImage(ctx, getAirplaneFeatureImageFilePath('common', 1 + i), {
        category: ImageCategory.AirplaneFeature,
        slug: `airplane${airplaneIndex}-${<AirplaneImageKind>'common'}${i + 1}`,
        mimeType: MimeTypeWebp
      }, previewMode, featureCategorySize);
      imageData.push({
        imageId,
        kind: 'common',
        order: i + 4
      });
    }
  
    const addFlightClassImages = async (flightClass: FlightClass, startIdx: number) : Promise<void> => {
      for (let i = 0; i < 2; i++) {
        imageId = await this.ensureImage(ctx, getAirplaneFeatureImageFilePath(flightClass, i + 1), {
          category: ImageCategory.AirplaneFeature,
          slug: `airplane${airplaneIndex}-${flightClass}${i}`,
          mimeType: MimeTypeWebp
        }, previewMode, featureCategorySize);
        imageData.push({
          imageId,
          kind: flightClass,
          order: startIdx + i
        });
      }
    };
    await addFlightClassImages('economy', 8);
    await addFlightClassImages('comfort', 10);
    await addFlightClassImages('business', 12);
  
    return imageData;
  }
  
  async addAirplanes (ctx: ContextParams, previewMode: PreviewMode) {
    ctx.logger.info(`${this.LoggingPrefix} >>> adding airplanes, previewMode=${previewMode}`);
  
    const isFeatureFileName = (fileName: string): boolean => {
      return fileName.includes(<AirplaneImageKind>'business') ||
            fileName.includes(<AirplaneImageKind>'comfort') ||
            fileName.includes(<AirplaneImageKind>'economy') ||
            fileName.includes(<AirplaneImageKind>'cabin') ||
            fileName.includes(<AirplaneImageKind>'window') ||
            fileName.includes(<AirplaneImageKind>'common');
    };
  
    await this.ensureImageCategory(ctx, ImageCategory.Airplane, 1805, 578);
  
    const imageFiles = await readdir(join(ctx.contentDir, 'airplanes'));
    const featureImageFiles = imageFiles.filter(isFeatureFileName).map(f => join(ctx.contentDir, 'airplanes', f));
    const featureCategorySize = await this.computeImageCategorySize(featureImageFiles);
    await this.ensureImageCategory(ctx, ImageCategory.AirplaneFeature, featureCategorySize.width, featureCategorySize.height);
    ctx.logger.info(`${this.LoggingPrefix} >>> airplane feature image category size: width=${featureCategorySize.width}, height=${featureCategorySize.height}`);
  
    let i = 0;
    const getAirplaneImageFilePath = (index: number) => join(ctx.contentDir, 'airplanes', `airplane-0${index + 1}.webp`);
  
    const airplaneLogic = this.airplaneLogic;
    let addMore = await this.checkFileExists(getAirplaneImageFilePath(i));
    while (addMore) {
      ctx.logger.debug(`${this.LoggingPrefix} >>> adding airplane #${i} images, previewMode=${previewMode}`);
  
      const imageData = await this.createAirplaneImageData(ctx, i, featureCategorySize, previewMode);
      const airplaneData: IAirplaneData = {
        name: {
          en: `Demo Airplane #${i + 1}`,
          fr: `Avion de démonstration #${i + 1}`,
          ru: `Самолёт (демо) #${i + 1}`
        },
        images: imageData
      };
      await airplaneLogic.createAirplane(airplaneData, previewMode);
  
      addMore = await this.checkFileExists(getAirplaneImageFilePath(++i));
    }
  
    ctx.logger.info(`${this.LoggingPrefix} >>> adding airplanes, previewMode=${previewMode} - compelted: count=${i}`);
  }
  
  buildStayDescription (templates: DescriptionTemplatesJson, hotelName: ILocalizableValue): IStayDescriptionData[] {
    const result: IStayDescriptionData[] = [];
  
    const substituteTemplateParameters = (templatedValue: ILocalizableValue): ILocalizableValue => {
      const result = {};
      for (let i = 0; i < AvailableLocaleCodes.length; i++) {
        const locale = AvailableLocaleCodes[i].toLowerCase();
  
        const templateParams = {};
        set(templateParams, StayNameTemplateParam, (hotelName as any)[locale]);
  
        const templateStr = (templatedValue as any)[locale];
        const compiled = template(templateStr);
        set(result, locale, compiled(templateParams));
      }
      return result as ILocalizableValue;
    };
  
    result.push({
      order: 0,
      paragraphKind: 'Title',
      textStr: substituteTemplateParameters(templates.title)
    });
  
    result.push({
      order: 1,
      paragraphKind: 'Main',
      textStr: substituteTemplateParameters(templates.main)
    });
  
    for (let i = 0; i < templates.features.length; i++) {
      const feature = templates.features[i];
      result.push({
        order: 2 + 2 * i,
        paragraphKind: 'FeatureCaption',
        textStr: substituteTemplateParameters(feature.caption)
      });
      result.push({
        order: 2 + 2 * i + 1,
        paragraphKind: 'FeatureText',
        textStr: substituteTemplateParameters(feature.text)
      });
    }
  
    return result;
  }
  
  async ensureReviewUsers (ctx: ContextParams, userNames: string[]): Promise<EntityId[]> {
    ctx.logger.info(`${this.LoggingPrefix} >>> adding hotels - ensuring review users`);
  
    ctx.logger.debug(`${this.LoggingPrefix} >>> adding hotels - locating review user avatar files`);
    const avatarFiles = (await readdir(join(ctx.contentDir, 'hotels'))).filter(f => f.includes('avatar')).map(f => join('hotels', f));
  
    const userLogic = this.userLogic;
    const result: EntityId[] = [];
  
    const names = [...userNames].sort((a, b) => a.localeCompare(b));
    for (let i = 0; i < names.length; i++) {
      const userName = names[i];
      const email = `${slugify(userName)}@golobe.demo`;
      const userInfo = await userLogic.findUserByEmail(email, false, 'minimal');
      if (userInfo) {
        result.push(userInfo.id);
        continue;
      }
  
      const password = process.env.APP_SECONDARYUSER_PWD!;
      if (!password || password.length === 0) {
        ctx.logger.error(`${this.LoggingPrefix} Review user password must be passed in APP_SECONDARYUSER_PWD env variable`);
        throw new Error('Review user passwordmust be passed in APP_SECONDARYUSER_PWD env variable');
      }
      const firstName = userName.split(' ')[0];
      const lastName = userName.split(' ')[1];
      const avatarFileName = (i % (avatarFiles.length + 1)) === 0 ? undefined : avatarFiles[(i % (avatarFiles.length + 1)) - 1];
      const userId = await this.ensureUser(ctx, password, email, firstName, lastName, AuthProvider.Email, email, avatarFileName);
      result.push(userId);
    }
  
    ctx.logger.info(`${this.LoggingPrefix} >>> adding hotels - review users ensured, count=${result.length}`);
    return result;
  }
  
  buildStayReviews (nameEn: string, userIds: EntityId[], reviews: ILocalizableValue[]): IStayReviewData[] {
    const primeModule = 9721;
    const randomizer = this.hashString(nameEn);
  
    const numReviews = Math.min(10 + randomizer % 10, userIds.length, reviews.length);
  
    const result: IStayReviewData[] = [];
    for (let i = 0; i < numReviews; i++) {
      const text = reviews[((i + randomizer) * primeModule) % reviews.length];
      const userId = userIds[((i + randomizer) * primeModule) % userIds.length];
      const score = ((i * randomizer * primeModule) % 3) === 2 ? 4 : 5;
      result.push({
        userId,
        text,
        score
      });
    }
  
    return result;
  }
  
  async buildStayImages (ctx: ContextParams, staySlug: string, hotelRoomCategorySize: { width: number, height: number }, previewMode: PreviewMode): Promise<IStayImageData[]> {
    ctx.logger.debug(`${this.LoggingPrefix} adding hotels - building stay images, slug=${staySlug}, previewMode=${previewMode}`);
    const randomizer = this.hashString(staySlug) % 16;
  
    const result: IStayImageData[] = [];
  
    const mainImgFile = join('hotels', `${staySlug.replace('stay-', '')}.webp`);
    const mainImgId = await this.ensureImage(ctx, mainImgFile, {
      category: ImageCategory.Hotel,
      slug: `${staySlug}-photo`,
      mimeType: MimeTypeWebp
    }, previewMode);
    result.push({
      imageId: mainImgId,
      order: 0,
      serviceLevel: undefined
    });
  
    const baseImgFile = join('hotels', `room-base-${randomizer & 0x01 ? '01' : '02'}.webp`);
    const baseImgId = await this.ensureImage(ctx, baseImgFile, {
      category: ImageCategory.HotelRoom,
      slug: `${staySlug}-base`,
      mimeType: MimeTypeWebp
    }, previewMode, hotelRoomCategorySize);
    result.push({
      imageId: baseImgId,
      order: 1,
      serviceLevel: 'Base'
    });
  
    const cityView1ImgFile = join('hotels', `room-city1-${randomizer & 0x02 ? '01' : '02'}.webp`);
    const cityView1ImgId = await this.ensureImage(ctx, cityView1ImgFile, {
      category: ImageCategory.HotelRoom,
      slug: `${staySlug}-city1`,
      mimeType: MimeTypeWebp
    }, previewMode, hotelRoomCategorySize);
    result.push({
      imageId: cityView1ImgId,
      order: 2,
      serviceLevel: 'CityView1'
    });
  
    const cityView2ImgFile = join('hotels', `room-city2-${randomizer & 0x04 ? '01' : '02'}.webp`);
    const cityView2ImgId = await this.ensureImage(ctx, cityView2ImgFile, {
      category: ImageCategory.HotelRoom,
      slug: `${staySlug}-city2`,
      mimeType: MimeTypeWebp
    }, previewMode, hotelRoomCategorySize);
    result.push({
      imageId: cityView2ImgId,
      order: 3,
      serviceLevel: 'CityView2'
    });
  
    const cityView3ImgFile = join('hotels', `room-city3-${randomizer & 0x08 ? '01' : '02'}.webp`);
    const cityView3ImgId = await this.ensureImage(ctx, cityView3ImgFile, {
      category: ImageCategory.HotelRoom,
      slug: `${staySlug}-city3`,
      mimeType: MimeTypeWebp
    }, previewMode, hotelRoomCategorySize);
    result.push({
      imageId: cityView3ImgId,
      order: 4,
      serviceLevel: 'CityView3'
    });
  
    ctx.logger.debug(`${this.LoggingPrefix} adding hotels, previewMode=${previewMode} - building stay images completed, slug=${staySlug}`);
    return result;
  }
  
  async addHotels (ctx: ContextParams, previewMode: PreviewMode) {
    ctx.logger.info(`${this.LoggingPrefix} >>> adding hotels, previewMode=${previewMode}`);
  
    const citiesLogic = this.citiesLogic;
    const stayLogic = this.staysLogic;
  
    ctx.logger.debug(`${this.LoggingPrefix} adding hotels - loading hotels list`);
    const hotelsFilePath = join(ctx.contentDir, 'hotels', 'hotels.json');
    const hotelsFileContent = await readFile(hotelsFilePath, 'utf-8');
    const hotelsJson = (destr<HotelsJson>(hotelsFileContent));
  
    ctx.logger.debug(`${this.LoggingPrefix} adding hotels - calculating hotel room category size`);
    const imageFiles = await readdir(join(ctx.contentDir, 'hotels'));
    const roomImageFiles = imageFiles.filter(f => f.includes('room-')).map(f => join(ctx.contentDir, 'hotels', f));
    const hotelRoomCategorySize = await this.computeImageCategorySize(roomImageFiles);
    ctx.logger.debug(`${this.LoggingPrefix} adding hotels - hotel room image category sizes: w=${hotelRoomCategorySize.width}, h=${hotelRoomCategorySize.height}`);
  
    await this.ensureImageCategory(ctx, ImageCategory.Hotel, 1024, 1024);
    await this.ensureImageCategory(ctx, ImageCategory.HotelRoom, hotelRoomCategorySize.width, hotelRoomCategorySize.height);
  
    const reviewUserIds = await this.ensureReviewUsers(ctx, hotelsJson.userNames);
    if (reviewUserIds.length === 0) {
      ctx.logger.error(`${this.LoggingPrefix} Review users list is empty`);
      throw new Error('Review users list is empty');
    }
  
    const hotelIdentities = orderBy(hotelsJson.identities, ['slug'], ['asc']);
    for (let i = 0; i < hotelIdentities.length; i++) {
      const identityJson = hotelIdentities[i];
      const stayEntity = await stayLogic.findStay(identityJson.slug, previewMode);
      if (stayEntity) {
        ctx.logger.debug(`${this.LoggingPrefix} adding hotels - already exists: slug=${stayEntity.slug}`);
        continue;
      }
  
      ctx.logger.debug(`${this.LoggingPrefix} adding hotels, previewMode=${previewMode} - creating new: slug=${identityJson.slug}`);
      const cityInfo = await citiesLogic.getCity(identityJson.citySlug, previewMode);
  
      const seedHotelInPreviewMode = SeedDraftHotelSlug ? identityJson.slug.includes(SeedDraftHotelSlug) : SeedPreviewMode;
      const stayData: IStayData = {
        cityId: cityInfo.id,
        slug: identityJson.slug,
        geo: cityInfo.geo,
        name: identityJson.name,
        descriptionData: this.buildStayDescription(hotelsJson.descriptionTemplates, identityJson.name),
        reviewsData: this.buildStayReviews(identityJson.name.en, reviewUserIds, hotelsJson.reviews),
        imagesData: await this.buildStayImages(ctx, identityJson.slug, hotelRoomCategorySize, seedHotelInPreviewMode)
      };
      await stayLogic.createStay(stayData, seedHotelInPreviewMode);
    }
  
    ctx.logger.info(`${this.LoggingPrefix} adding hotels, previewMode=${previewMode} - completed, count=${hotelIdentities.length}`);
  }
  
  async addStaysPageTitleImages (ctx: ContextParams, previewMode: PreviewMode) : Promise<void> {
    ctx.logger.info(`${this.LoggingPrefix} >>> creating stays page title images, previewMode=${previewMode}`);
    await this.ensureImageCategory(ctx, ImageCategory.PageTitle, 1770, 1180);
    const stubCssStyle = fromPairs([
      ['backgroundImage', 'linear-gradient(75deg, hsla(197, 79%, 50%, 0.42) 7%, hsla(20, 100%, 37%, 0.68) 117%), linear-gradient(29deg, hsla(240, 100%, 93%, 0.57) -16%, hsla(36, 39%, 47%, 0.73) 153%), linear-gradient(0deg, hsla(63, 100%, 71%, 0.23) 21%, hsl(60, 100%, 70%) 57%, hsla(63, 100%, 84%, 0.67) 86%)'],
      ['backgroundSize', '100% 100%, 100% 100%, 100% 100%'],
      ['backgroundRepeat', 'no-repeat, no-repeat, no-repeat'],
      ['backgroundPosition', '0% 0%, 0% 0%, 0% 0%']
    ]) as CssPropertyList;
    await this.ensureImage(ctx, 'stays-title.webp', {
      category: ImageCategory.PageTitle,
      slug: StaysTitleSlug,
      stubCssStyle,
      mimeType: MimeTypeWebp
    }, previewMode);
    ctx.logger.info(`${this.LoggingPrefix} >>> creating stays page title images, previewMode=${previewMode} - completed`);
  }
  
  async seedDb (event: H3Event) : Promise<void> {
    const logger: IAppLogger = this.logger;
    logger.info(`${this.LoggingPrefix} starting data seeding`);
  
    logger.info(`${this.LoggingPrefix} === SEEDING DB ===`);
    try {
      logger.info(`${this.LoggingPrefix} locating content directory`);
      let contentDir = await lookupParentDirectory(process.cwd(), AppConfig.dataSeeding.dirs.content, async (path: string) => { await access(path); return true; });
      if (!contentDir) {
        logger.warn(`${this.LoggingPrefix} FAILED to locate content directory`);
        return;
      }
      contentDir = resolve(contentDir!);
      logger.info(`${this.LoggingPrefix} using content directory: ${contentDir}`);
  
      logger.info('locating public resources directory');
      let publicResDir = await lookupParentDirectory(process.cwd(), AppConfig.dataSeeding.dirs.publicRes, async (path: string) => { await access(path); return true; });
      if (!publicResDir) {
        logger.warn(`${this.LoggingPrefix} FAILED to locate public resources directory`);
        return;
      }
      publicResDir = resolve(publicResDir!);
      logger.info(`${this.LoggingPrefix} using public resources directory: ${publicResDir}`);
  
      logger.info(`${this.LoggingPrefix} locating appdata directory`);
      let appDataDir = resolve(join(publicResDir, '/../', 'assets', AppConfig.dataSeeding.dirs.appData));
      if (!await this.checkFileExists(appDataDir)) {
        appDataDir = resolve(join(publicResDir, AppConfig.dataSeeding.dirs.appData));
      }
      if (!await this.checkFileExists(appDataDir)) {
        logger.warn(`${this.LoggingPrefix} FAILED to locate app data directory`);
        return;
      }
      logger.info(`${this.LoggingPrefix} using app data directory: ${appDataDir}`);
  
      const ctx: ContextParams = {
        logger,
        contentDir: contentDir!,
        publicResDir: publicResDir!,
        appDataDir,
        event
      };
  
      await this.ensureAppAdminUser(ctx);
      await this.addMainTitleImage(ctx, SeedPreviewMode);
      // await addAdminProfileImages(ctx); // KB: need to place image's in content folder
  
      await this.addAuthFormsPhotos(ctx, SeedPreviewMode);
      await this.ensureMailTemplates(ctx, SeedPreviewMode);
      await this.addDefaultUserProfileImages(ctx, SeedPreviewMode);
  
      await this.addGeoData(ctx, SeedPreviewMode);
      await this.addPopularCities(ctx, SeedPreviewMode);
      await this.addCityImages(ctx, SeedPreviewMode);
      await this.addCompanyReviews(ctx, SeedPreviewMode);
      await this.addFlightsPageTitleImages(ctx, SeedPreviewMode);
      await this.compileWorldMapData(ctx);
      await this.addAirlineCompanies(ctx, SeedPreviewMode);
      await this.addAirplanes(ctx, SeedPreviewMode);
      await this.addHotels(ctx, SeedPreviewMode);
      await this.addStaysPageTitleImages(ctx, SeedPreviewMode);
  
      if (!isPublishEnv()) {
        await this.ensureCredentialsTestUser(ctx);
      }
  
      logger.info(`${this.LoggingPrefix} === DB SEEDING COMPLETED ===`);
    } catch (err: any) {
      logger.warn(`${this.LoggingPrefix} db seeding failed`, err);
    }
  
    logger.info(`${this.LoggingPrefix} data seeding completed`);
  };

  async seed(event: H3Event): Promise<void> {
    await this.seedDb(event);
  }

  async getInitialSeedingStatus () : Promise<InitialDataSeedingStatus> {
    this.logger.debug(`${this.LoggingPrefix} checking inital DB seeding status`);
    let result: InitialDataSeedingStatus = 'required';
  
    const dbRepository = await getGlobalPrismaClient(this.logger);
    const adminUserCreated = (await dbRepository.userEmail.count({
      where: {
        email: AdminUserEmail
      }
    }) > 0);
    if(adminUserCreated) {
      const pageTitlesAdded = (!SeedPreviewMode ? (await dbRepository.image.count({
        where: {
          category: {
            kind: ImageCategory.PageTitle.valueOf()
          }
        }
      })) : (await dbRepository.acsysDraftsImage.count({
        where: {
          categoryId: (await dbRepository.imageCategory.findFirst({
            where: {
              kind: ImageCategory.PageTitle.valueOf()
            }
          }))!.id
        }
      }))) >= 2;
      result = pageTitlesAdded ? 'completed' : 'running';
    } else {
      result = 'required';
    }
  
    this.logger.debug(`${this.LoggingPrefix} inital DB seeding status check result = ${result}`);
    return result;
  }  
}
