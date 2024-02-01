import { existsSync, readFileSync, writeFileSync } from 'fs';
import { readdir } from 'fs/promises';
import slugify from 'slugify';
import { join, resolve, basename } from 'pathe';
import Mime from 'mime';
import { Decimal } from '@prisma/client/runtime/library';
import { destr } from 'destr';
import sharp from 'sharp';
import mean from 'lodash/mean';
import type { CSSProperties } from 'vue';
import fromPairs from 'lodash/fromPairs';
import { type IAppLogger } from '../shared/applogger';
import { DefaultUserAvatarSlug, DefaultUserCoverSlug, MainTitleSlug, FlightsTitleSlug, DefaultLocale, DEV_ENV_MODE } from '../shared/constants';
import { type EntityId, type ILocalizableValue, AuthProvider, ImageCategory, type IImageData, EmailTemplate } from '../shared/interfaces';
import { CREDENTIALS_TESTUSER_PROFILE as credentialsTestUserProfile, TEST_USER_PASSWORD } from '../shared/testing/common';
import type { IWorldMapDataDto } from './../server/dto';
import { isQuickStartEnv } from './../shared/common';
import { resolveParentDirectory } from './../shared/fs';

interface ContextParams {
  // dbRepository: PrismaClient,
  logger: IAppLogger,
  contentDir: string,
  publicResDir: string,
  dbCountryMap?: Map<string, EntityId>,
  dbCityMap?: Map<string, EntityId>,
  dbAirportMap?: Map<string, EntityId>
};

const ContentDirName = 'content';
const PublicResDirName = 'public';
const AdminUserEmail = 'admin@demo.golobe';

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
  countryInfo: ICountryInfo
}

async function ensureUser (ctx: ContextParams, password: string, email: string, firstName: string, lastName: string, authProvider: AuthProvider, providerIdentity: string): Promise<void> {
  ctx.logger.info(`>>> ensuring user, providerIdentity=${providerIdentity}, providerType=${authProvider}, email=${email}`);

  const userLogic = ServerServicesLocator.getUserLogic();
  const user = await userLogic.findUser(authProvider, providerIdentity, 'minimal');
  if (user) {
    ctx.logger.info(`ensuring user - completed - already exists, providerIdentity=${providerIdentity}, providerType=${authProvider}, email=${email}`);
    return;
  }
  await userLogic.registerUserByEmail(email, password, 'verified', firstName, lastName, 'light', 'en');

  ctx.logger.info(`>>> user created, providerIdentity=${providerIdentity}, providerType=${authProvider}, email=${email}`);
}

async function ensureAppAdminUser (ctx: ContextParams) : Promise<void> {
  ctx.logger.info('>>> ensuring admin user');
  const password = process.env.APP_ADMIN_PWD;
  if (!password || password.length === 0) {
    ctx.logger.error('Admin user password must be passed in APP_ADMIN_PWD env variable');
    throw new Error('Admin user password must be passed in APP_ADMIN_PWD env variable');
  }
  await ensureUser(ctx, password, AdminUserEmail, 'app_admin', 'app_admin', AuthProvider.Email, AdminUserEmail);

  ctx.logger.info('ensuring admin user - completed - created new');
}

async function ensureCredentialsTestUser (ctx: ContextParams) : Promise<void> {
  ctx.logger.info('>>> ensuring credentials test user');
  await ensureUser(ctx, TEST_USER_PASSWORD, credentialsTestUserProfile.email, credentialsTestUserProfile.firstName, credentialsTestUserProfile.lastName, AuthProvider.Email, credentialsTestUserProfile.email);
  ctx.logger.info('>>> credentials test user ensured');
}

async function ensureImageCategory (ctx: ContextParams, type: ImageCategory, width: number, height: number) : Promise<EntityId> {
  ctx.logger.info(`>>> ensuring image category, type=${type}, width=${width}, height=${height}`);

  const imageCategoryLogic = ServerServicesLocator.getImageCategoryLogic();
  const imageCategory = await imageCategoryLogic.findCategory(type);
  if (imageCategory) {
    ctx.logger.info(`>>> ensuring image category, type=${type} - completed - already exists`);
    return imageCategory.id;
  }

  const categoryId = await imageCategoryLogic.createCategory(type, width, height);
  ctx.logger.info(`>>> ensuring image category, type=${type} - completed - created new, id=${categoryId}`);
  return categoryId;
}

async function extractImageRegion (ctx: ContextParams, bytes: Buffer, width: number, height: number, mimeType: 'webp' | 'jpeg'): Promise<Buffer> {
  ctx.logger.info(`extracting image region: width=${width}, height=${height}`);
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

async function ensureImage (ctx: ContextParams, contentFile: string, imageData: Partial<IImageData> & Pick<IImageData, 'slug' | 'category'>, regionOfImage?: { width: number, height: number }): Promise<EntityId> {
  ctx.logger.info(`>>> ensuring image, fileName=${contentFile}, slug=${imageData.slug}`);
  imageData.originalName ??= basename(contentFile);
  // eslint-disable-next-line import/namespace
  imageData.mimeType ??= Mime.getType(imageData.originalName) ?? undefined;
  if (!imageData.mimeType) {
    ctx.logger.error(`failed to determine image mime type: file=${contentFile}`);
    throw new Error(`failed to determine image mime type: file=${contentFile}`);
  }

  const imageLogic = ServerServicesLocator.getImageLogic();
  const imageEntity = await imageLogic.findImage(imageData.slug!, imageData.category!);
  if (imageEntity) {
    ctx.logger.info(`>>> ensuring image, contentFile=${contentFile} - completed - already exists`);
    return imageEntity.id;
  }

  const srcFile = join(ctx.contentDir, contentFile);
  let bytes = readFileSync(srcFile);
  if (regionOfImage) {
    if (imageData.mimeType?.includes('webp')) {
      bytes = await extractImageRegion(ctx, bytes, regionOfImage.width, regionOfImage.height, 'webp');
    }
  }

  imageData.bytes = bytes;
  const imageId = (await imageLogic.createImage(imageData as IImageData)).id;

  ctx.logger.info(`>>> ensuring image, contentFile=${contentFile} - completed - created new, id=${imageId}`);
  return imageId;
}

async function addMainTitleImage (ctx: ContextParams) : Promise<void> {
  ctx.logger.info('>>> creating main title image');
  await ensureImageCategory(ctx, ImageCategory.MainTitle, 1770, 1180);

  const stubCssStyle = fromPairs([
    ['backgroundImage', 'linear-gradient(0deg, hsl(213, 8%, 77%, 0.0) 0%, hsl(213, 8%, 77%, 0.0) 70%, hsla(213, 8%, 77%, 0.8) 100%), radial-gradient(circle at 52% 49%, hsla(148, 13%, 26%, 0.2) 0%, hsl(154, 11%, 25%) 152%), linear-gradient(0deg, hsla(148, 13%, 26%, 0.34) 32%, hsl(213, 8%, 77%) 52%), radial-gradient(ellipse at 54% 192%, hsla(30, 66%, 56%, 0.79) 43%, hsla(213, 8%, 77%, 0.18) 106%)'],
    ['backgroundSize', '100% 100%, 100% 50%, 100% 100%, 100% 100%'],
    ['backgroundRepeat', 'no-repeat, repeat-y, no-repeat, no-repeat'],
    ['backgroundPosition', '0 0, 0 0, 0 0, 0 0']
  ]) as CSSProperties;
  await ensureImage(ctx, 'main-title.webp', {
    category: ImageCategory.MainTitle,
    slug: MainTitleSlug,
    stubCssStyle
  });

  ctx.logger.info('>>> creating main title image - completed');
}

/*
async function addAdminProfileImages (ctx: ContextParams) : Promise<void> {
  ctx.logger.info('>>> adding avatar & cover to admin user');

  const userLogic = ServerServicesLocator.getUserLogic();
  const adminUserEntity = await userLogic.findUserByEmail(AdminUserEmail, false, 'minimal');
  if (!adminUserEntity) {
    throw new Error('Admin user was not found');
  }

  ctx.logger.info('adding admin cover');
  await ensureImageCategory(ctx, ImageCategory.UserCover, 1230, 350);
  let fileName = 'admin-cover.webp';
  let filePath = join(ctx.contentDir, fileName);
  let mime = Mime.getType(fileName) ?? 'image/webp';
  let bytes = readFileSync(filePath);
  await userLogic.uploadUserImage(adminUserEntity.id, ImageCategory.UserCover, bytes, mime, fileName);

  ctx.logger.info('adding admin avatar');
  await ensureImageCategory(ctx, ImageCategory.UserAvatar, 512, 512);
  fileName = 'admin-avatar.webp';
  filePath = join(ctx.contentDir, fileName);
  mime = Mime.getType(fileName) ?? 'image/webp';
  bytes = readFileSync(filePath);
  await userLogic.uploadUserImage(adminUserEntity.id, ImageCategory.UserAvatar, bytes, mime, fileName);

  ctx.logger.info('>>> adding avatar & cover to admin user - completed');
}
*/

async function addAuthFormsPhotos (ctx: ContextParams) : Promise<void> {
  ctx.logger.info('>>> adding auth forms photos');
  await ensureImageCategory(ctx, ImageCategory.AuthFormsImage, 597, 794);

  await ensureImage(ctx, 'account-forms/account-forms-01.webp', {
    category: ImageCategory.AuthFormsImage,
    slug: 'account-forms-01'
  });
  await ensureImage(ctx, 'account-forms/account-forms-02.webp', {
    category: ImageCategory.AuthFormsImage,
    slug: 'account-forms-02'
  });
  await ensureImage(ctx, 'account-forms/account-forms-03.webp', {
    category: ImageCategory.AuthFormsImage,
    slug: 'account-forms-03'
  });

  ctx.logger.info('>>> adding auth forms photos - completed');
}

async function ensureMailTemplate (ctx: ContextParams, kind: EmailTemplate, templateFileEn: string, templateFileFr: string, templateFileRu: string): Promise<void> {
  ctx.logger.info(`>>> ensuring mail template, kind=${kind}, en=${templateFileEn}, fr=${templateFileFr}, ru=${templateFileRu}`);

  const mailTemplateLogic = ServerServicesLocator.getMailTemplateLogic();
  const markup = await mailTemplateLogic.getTemplateMarkup(kind, DefaultLocale);
  if (markup) {
    ctx.logger.info(`>>> ensuring mail template, kind=${kind} - already exists`);
    return;
  }

  const en = readFileSync(templateFileEn).toString('utf8');
  const fr = readFileSync(templateFileFr).toString('utf8');
  const ru = readFileSync(templateFileRu).toString('utf8');
  const templateId = await mailTemplateLogic.createTemplate(kind, { en, fr, ru });

  ctx.logger.info(`>>> ensuring mail template - created, id = ${templateId}`);
}

async function ensureMailTemplates (ctx: ContextParams) : Promise<void> {
  ctx.logger.info('>>> ensuring mail templates');

  const getTemplateFilePath = (basename: string, locale: string): string => {
    return join(ctx.contentDir, 'mail-templates', `${basename}-${locale}.html`);
  };

  const templateProps = [
    {
      kind: EmailTemplate.EmailVerify,
      basename: 'email-verify'
    },
    {
      kind: EmailTemplate.RegisterAccount,
      basename: 'register-account'
    },
    {
      kind: EmailTemplate.PasswordRecovery,
      basename: 'password-recovery'
    }
  ];
  for (let i = 0; i < templateProps.length; i++) {
    const { kind, basename } = templateProps[i];
    await ensureMailTemplate(ctx, kind, getTemplateFilePath(basename, DefaultLocale), getTemplateFilePath(basename, 'fr'), getTemplateFilePath(basename, 'ru'));
  }

  ctx.logger.info('>>> ensuring mail templates - completed');
}

async function addDefaultUserProfileImages (ctx: ContextParams) : Promise<void> {
  ctx.logger.info('>>> adding default user profile images');

  ctx.logger.verbose('adding default user avatar');
  await ensureImageCategory(ctx, ImageCategory.UserAvatar, 512, 512);
  await ensureImage(ctx, 'default-user-avatar.webp', {
    category: ImageCategory.UserAvatar,
    slug: DefaultUserAvatarSlug
  });

  ctx.logger.verbose('adding default user cover');
  await ensureImageCategory(ctx, ImageCategory.UserCover, 1230, 350);
  await ensureImage(ctx, 'default-user-cover.webp', {
    category: ImageCategory.UserCover,
    slug: DefaultUserCoverSlug
  });

  ctx.logger.info('>>> adding default user cover image - completed');
}

async function ensureCountry (ctx: ContextParams, countryInfo: ICountryInfo): Promise<EntityId> {
  ctx.logger.info(`ensuring country, code=${countryInfo.code}, name=${countryInfo.name.en}`);
  const geoLogic = ServerServicesLocator.getGeoLogic();
  if (!ctx.dbCountryMap) {
    ctx.logger.info('>>> initializing country data context');
    const countries = await geoLogic.getAllCountries();
    ctx.dbCountryMap = new Map<string, EntityId>();
    for (let i = 0; i < countries.length; i++) {
      const country = countries[i];
      ctx.dbCountryMap.set(country.name.en, country.id);
    }
    ctx.logger.info(`>>> Country data context initialized, size=${ctx.dbCountryMap.size}`);
  }

  const existingCountry = ctx.dbCountryMap.get(countryInfo.name.en!);
  if (existingCountry) {
    return existingCountry;
  }

  const countryId = await geoLogic.createCountry({ name: countryInfo.name as ILocalizableValue });
  ctx.dbCountryMap.set(countryInfo.name.en!, countryId);

  ctx.logger.info(`adding country, code=${countryInfo.code}, name=${countryInfo.name.en} - created new, id=${countryId}`);
  return countryId;
}

function getCitySlug (ctx: ContextParams, cityInfo: ICityInfo): string {
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

async function ensureCity (ctx: ContextParams, cityInfo: ICityInfo, countryId: EntityId): Promise<EntityId> {
  ctx.logger.info(`>>> adding city, code=${cityInfo.code}, name=${cityInfo.name.en}, countryId=${countryId}`);

  const geoLogic = ServerServicesLocator.getGeoLogic();
  if (!ctx.dbCityMap) {
    ctx.logger.info('>>> initializing city data context');
    const cities = await geoLogic.getAllCities();
    ctx.dbCityMap = new Map<string, EntityId>();
    for (let i = 0; i < cities.length; i++) {
      const city = cities[i];
      ctx.dbCityMap.set(city.name.en, city.id);
    }
    ctx.logger.info(`>> City data context initialized, size=${ctx.dbCityMap.size}`);
  }

  const existingCity = ctx.dbCityMap.get(cityInfo.name.en!);
  if (existingCity) {
    return existingCity;
  }

  const cityId = await geoLogic.createCity({
    slug: getCitySlug(ctx, cityInfo),
    geo: {
      lat: cityInfo.lat!.toNumber(),
      lon: cityInfo.lon!.toNumber()
    },
    population: cityInfo.population,
    name: cityInfo.name as ILocalizableValue,
    countryId
  });
  ctx.dbCityMap.set(cityInfo.name.en!, cityId);

  ctx.logger.info(`>>> adding city, code=${cityInfo.code}, name=${cityInfo.name.en}, countryId=${countryId} - created new, id=${cityId}`);
  return cityId;
}

async function ensureAirport (ctx: ContextParams, airportInfo: IAirportInfo, cityId: EntityId): Promise<EntityId> {
  ctx.logger.info(`adding airport, code=${airportInfo.code}, name=${airportInfo.name.en}, cityId=${cityId}`);

  const airportLogic = ServerServicesLocator.getAirportLogic();
  if (!ctx.dbAirportMap) {
    ctx.logger.info('>>> initializing airport data context');
    const airports = await airportLogic.getAllAirports();
    ctx.dbAirportMap = new Map<string, EntityId>();
    for (let i = 0; i < airports.length; i++) {
      const airport = airports[i];
      ctx.dbAirportMap.set(airport.name.en, airport.id);
    }
    ctx.logger.info(`Airport data context initialized, size=${ctx.dbAirportMap.size}`);
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
  });
  ctx.dbAirportMap.set(airportInfo.name.en!, airportId);

  ctx.logger.info(`adding airport, code=${airportInfo.code}, name=${airportInfo.name.en}, cityId=${cityId} - created new, id=${airportId}`);
  return airportId;
}

async function addGeoData (ctx: ContextParams) : Promise<void> {
  ctx.logger.info('>>> adding geo data');

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
      ctx.logger.error(`failed to parse airport location: airport=${src.airport}, value=${src.coor}`);
      throw new Error(`failed to parse airport location: airport=${src.airport}, value=${src.coor}`);
    }
    const cityPopulation = parseInt(src.cityPopulation);
    if (cityPopulation <= 0 || cityPopulation > 200000000) {
      ctx.logger.error(`suspicious city population value: airport=${src.airport}, value=${src.cityPopulation}`);
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
      ctx.logger.error(`cannot find country for ${locale.toUpperCase()} localization: airport=${airportJson.code}`);
      throw new Error(`cannot find country for ${locale.toUpperCase()} localization: airport=${airportJson.code}`);
    }
    country.name[locale] = airportJson.countryLabel;

    const city = cityMap.get(airportJson.cityCode);
    if (!city) {
      ctx.logger.error(`cannot find city for ${locale.toUpperCase()} localization: airport=${airportJson.code}`);
      throw new Error(`cannot find city for ${locale.toUpperCase()} localization: airport=${airportJson.code}`);
    }
    city.name[locale] = airportJson.cityName;

    const airport = airportMap.get(airportJson.code);
    if (!airport) {
      ctx.logger.error(`cannot find airport for ${locale.toUpperCase()} localization: airport=${airportJson.code}`);
      throw new Error(`cannot find airport for ${locale.toUpperCase()} localization: airport=${airportJson.code}`);
    }
    airport.name[locale] = airportJson.airportLabel;
  };

  ctx.logger.info('adding geo data - creating unlocalized indexes');
  const enFilePath = join(ctx.contentDir, 'geo', 'city-airports-en.json');
  const enFileContent = readFileSync(enFilePath, { encoding: 'utf-8' });
  const enJson = (destr<AirportJsonRaw[]>(enFileContent)).map(src => mapAirportJson(src));
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
      city = {
        code: airportJson.cityCode,
        countryCode: airportJson.countryCode,
        name: {
          en: airportJson.cityName
        },
        population: airportJson.cityPopulation,
        airports: [],
        countryInfo: country
      };
      cityMap.set(airportJson.cityCode, city);
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

  let allCities = [...cityMap.values()];
  for (let i = 0; i < allCities.length; i++) {
    const city = allCities[i];
    city.lat = city.airports.reduce((sum: Decimal, airport: IAirportInfo) => { return sum.add(airport.lat); }, new Decimal(0)).div(city.airports.length);
    city.lon = city.airports.reduce((sum: Decimal, airport: IAirportInfo) => { return sum.add(airport.lon); }, new Decimal(0)).div(city.airports.length);
  }

  ctx.logger.info('adding geo data - RU localization');
  const ruFilePath = join(ctx.contentDir, 'geo', 'city-airports-ru.json');
  const ruFileContent = readFileSync(ruFilePath, { encoding: 'utf-8' });
  const ruJson = (destr<AirportJsonRaw[]>(ruFileContent)).map(src => mapAirportJson(src));
  for (let i = 0; i < ruJson.length; i++) {
    const airportJson = ruJson[i];
    updateLocalization(airportJson, 'ru');
  }

  ctx.logger.info('adding geo data - FR localization');
  const frFilePath = join(ctx.contentDir, 'geo', 'city-airports-fr.json');
  const frFileContent = readFileSync(frFilePath, { encoding: 'utf-8' });
  const frJson = (destr<AirportJsonRaw[]>(frFileContent)).map(src => mapAirportJson(src));
  for (let i = 0; i < frJson.length; i++) {
    const airportJson = frJson[i];
    updateLocalization(airportJson, 'fr');
  }

  ctx.logger.info('>>> adding geo data - fitlering uncomplete data');
  const removeUncompleteEntries = <T extends { code: string, name: Partial<ILocalizableValue> }>(map: Map<string, T>): number => {
    const allEntries = [...map.values()];
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

  ctx.logger.info(`adding geo data - ${removeUncompleteEntries(airportMap)} uncompleted airports removed`);
  ctx.logger.info(`adding geo data - ${removeUncompleteEntries(cityMap)} uncompleted cities removed`);
  ctx.logger.info(`adding geo data - ${removeUncompleteEntries(countryMap)} uncompleted countries removed`);

  let allAirports = [...airportMap.values()];
  const airportCodesToRemove: string[] = [];
  for (let i = 0; i < allAirports.length; i++) {
    if (!cityMap.has(allAirports[i].cityCode)) {
      airportCodesToRemove.push(allAirports[i].code);
    }
  }
  airportCodesToRemove.forEach(c => cityMap.delete(c));
  ctx.logger.info(`adding geo data - ${airportCodesToRemove.length} airports without city removed`);

  allCities = [...cityMap.values()];
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
  ctx.logger.info(`adding geo data - ${unreferencedAirportsCount} unreferenced city airports removed`);

  allCities = [...cityMap.values()];
  const allCountries = [...countryMap.values()];
  allAirports = [...airportMap.values()];

  ctx.logger.info('>>> adding geo data - COUNTRY entities');
  for (let i = 0; i < allCountries.length; i++) {
    await ensureCountry(ctx, allCountries[i]);
  }

  ctx.logger.info('>>> adding geo data - adding CITY entities');
  for (let i = 0; i < allCities.length; i++) {
    const cityInfo = allCities[i];
    const countryId = ctx.dbCountryMap!.get(cityInfo.countryInfo.name.en!)!;
    await ensureCity(ctx, allCities[i], countryId);
  }

  ctx.logger.info('>>> adding geo data - adding AIRPORT entities');
  const ignoreAirports = ['Peoria International Airport', 'Albuquerque International Sunport', 'Gulfport-Biloxi International Airport', 'Quad Cities International Airport', 'Guaraní International Airport']; // airports with inconsistent data
  for (let i = 0; i < allAirports.length; i++) {
    const airportInfo = allAirports[i];
    if (ignoreAirports.includes(airportInfo.name.en!)) {
      continue;
    }
    const cityId = ctx.dbCityMap!.get(airportInfo.cityInfo.name.en!)!;
    await ensureAirport(ctx, allAirports[i], cityId);
  }

  ctx.logger.info(`>>> adding geo data - completed: totalAirport=${airportMap.size}, totalCities=${cityMap.size}, totalCountries=${countryMap.size}`);
}

async function addPopularCities (ctx: ContextParams) : Promise<void> {
  ctx.logger.info('>>> adding popular cities');

  type PopularCityJson = { name: string, rating: number, promoLine: { en: string, ru: string, fr: string }, visibleOnWorldMap?: boolean };
  type TravelDetailsJson = {
    slug: string,
    header: ILocalizableValue,
    text: ILocalizableValue
  };

  const filePath = join(ctx.contentDir, 'geo', 'popular-cities.json');
  const fileContent = readFileSync(filePath, { encoding: 'utf-8' });
  const enJson = destr<PopularCityJson[]>(fileContent);

  const fallIntoTravelFilePath = join(ctx.contentDir, 'fall-into-travel.json');
  const fallIntoTravelFileContent = readFileSync(fallIntoTravelFilePath, { encoding: 'utf-8' });
  const cityDetails = (destr<TravelDetailsJson[]>(fallIntoTravelFileContent));

  const citiesLogic = ServerServicesLocator.getCitiesLogic();
  const existingPopularCities = await citiesLogic.getPopularCities();

  for (let i = 0; i < enJson.length; i++) {
    const popularCityJson = enJson[i];
    if (existingPopularCities.some(e => e.cityDisplayName.en === popularCityJson.name)) {
      ctx.logger.info(`adding popular cities - ${popularCityJson.name} already exists`);
      continue;
    }

    const citySlug = popularCityJson.name.replace(/\s/g, '-').toLowerCase();
    const cityEntity = await citiesLogic.getCity(citySlug);
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
      rating: popularCityJson.rating
    });

    ctx.logger.info(`adding popular cities - ${popularCityJson.name} created`);
  }
  ctx.logger.info('>>> adding popular cities - completed');
}

async function getImageSize (filePath: string): Promise<{ width: number, height: number }> {
  const sharpObj = sharp(filePath);
  const metadata = await sharpObj.metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error('failed to parse image');
  }
  return { width: metadata.width!, height: metadata.height! };
}

async function computeImageCategorySize (files: string[]): Promise<{ width: number, height: number }> {
  const imageSizes: { width: number, height: number }[] = [];
  for (let i = 0; i < files.length; i++) {
    imageSizes.push(await getImageSize(files[i]));
  }

  return {
    width: Math.min(...imageSizes.map(i => i.width)),
    height: Math.min(...imageSizes.map(i => i.height))
  };
}

async function addCityImages (ctx: ContextParams) : Promise<void> {
  ctx.logger.info('>>> adding city images');

  const citiesLogic = ServerServicesLocator.getCitiesLogic();
  const popularCityInfos = await citiesLogic.getPopularCities();

  const imageFiles = await readdir(join(ctx.contentDir, 'cities'));

  const cardImageFiles = imageFiles.filter(f => !f.includes('-')).map(f => join(ctx.contentDir, 'cities', f));
  const cityCardCategorySize = await computeImageCategorySize(cardImageFiles);
  ctx.logger.info(`adding city images - city card category sizes: w=${cityCardCategorySize.width}, h=${cityCardCategorySize.height}`);

  const travelBlockImageFiles = imageFiles.filter(f => !cardImageFiles.includes(f)).map(f => join(ctx.contentDir, 'cities', f));
  const travelBlockCategorySize = await computeImageCategorySize(travelBlockImageFiles);
  ctx.logger.info(`adding city images - travel block category sizes: w=${travelBlockCategorySize.width}, h=${travelBlockCategorySize.height}`);

  await ensureImageCategory(ctx, ImageCategory.CityCard, cityCardCategorySize.width, cityCardCategorySize.height);
  await ensureImageCategory(ctx, ImageCategory.TravelBlock, travelBlockCategorySize.width, travelBlockCategorySize.height);

  for (let i = 0; i < popularCityInfos.length; i++) {
    const popularCityInfo = popularCityInfos[i];
    ctx.logger.verbose(`processing popular city images - cityId=${popularCityInfo.id}`);

    const travelDetails = await citiesLogic.getTravelDetails(popularCityInfo.id);
    if (travelDetails.images.length > 0) {
      ctx.logger.info(`adding city images - images have been already added: city=${popularCityInfo.cityDisplayName.en}`);
      continue;
    }

    const citySlugBase = popularCityInfo.cityDisplayName.en.replace(/\s/g, '').toLowerCase();
    const testPath = join(ctx.contentDir, `cities/${citySlugBase}.webp`);
    if (!existsSync(testPath)) {
      console.log('File not found: ' + testPath);
      throw new Error(`cannot find city images: ${citySlugBase}.webp`);
    }

    const imageIds = [] as EntityId[];
    imageIds.push(await ensureImage(ctx, `cities/${citySlugBase}.webp`, {
      category: ImageCategory.CityCard,
      slug: citySlugBase + 1
    }, cityCardCategorySize));

    const popularCityTravelFiles = imageFiles.filter(f => f.includes(`${citySlugBase}-`));
    if (popularCityTravelFiles.length !== 4) { // additional check for initial DB initialization data to be sure all seeding images have been picked up
      throw new Error('unexpected number of travel files');
    }
    for (let j = 0; j < popularCityTravelFiles.length; j++) {
      imageIds.push(await ensureImage(ctx, `cities/${popularCityTravelFiles[j]}`, {
        category: ImageCategory.TravelBlock,
        slug: `${citySlugBase}-${j + 2}`
      }, travelBlockCategorySize));
    }

    await citiesLogic.setPopularCityImages(popularCityInfo.id, imageIds.map((id, order) => { return { id, order: order + 1 }; }));

    ctx.logger.verbose(`popular city images processed - cityId=${popularCityInfo.id}`);
  }
  ctx.logger.info('ensuring popular city image - completed');
}

async function addCompanyReviews (ctx: ContextParams) : Promise<void> {
  ctx.logger.info('>>> adding company reviews');

  type Review = {
    header: ILocalizableValue,
    body: ILocalizableValue,
    user: ILocalizableValue
  };

  const reviewsFilePath = join(ctx.contentDir, 'company-reviews', 'texts.json');
  const reviewsFileContent = readFileSync(reviewsFilePath, { encoding: 'utf-8' });
  const reviews = (destr<Review[]>(reviewsFileContent));

  const reviewsImageFiles = (await readdir(join(ctx.contentDir, 'company-reviews'))).filter(f => f.includes('webp')).map(f => join(ctx.contentDir, 'company-reviews', f));
  const reviewImageCategorySize = await computeImageCategorySize(reviewsImageFiles);
  ctx.logger.info(`adding company reviews - company review image category size: w=${reviewImageCategorySize.width}, h=${reviewImageCategorySize.height}`);
  await ensureImageCategory(ctx, ImageCategory.CompanyReview, reviewImageCategorySize.width, reviewImageCategorySize.height);

  const companyReviewsLogic = ServerServicesLocator.getCompanyReviewsLogic();
  const existingReviews = await companyReviewsLogic.getReviews();
  for (let i = 0; i < reviews.length; i++) {
    const review = reviews[i];

    const imageFileBaseName = basename(reviewsImageFiles[i]);
    ctx.logger.verbose(`adding company review, file=${imageFileBaseName}`);

    const imageSlug = `company-${imageFileBaseName.split('.')[0]}`;
    if (existingReviews.some(r => r.imgSlug === imageSlug)) {
      ctx.logger.verbose(`adding company review - already exist, file=${imageFileBaseName}`);
      continue;
    }

    const imageId = await ensureImage(ctx, `company-reviews/${imageFileBaseName}`, {
      category: ImageCategory.CompanyReview,
      slug: imageSlug
    });
    const reviewId = await companyReviewsLogic.createReview({
      body: review.body,
      header: review.header,
      userName: review.user,
      imageId
    });
    ctx.logger.info(`added company review image - baseName=${imageFileBaseName}, companyReviewId=${reviewId}`);
  }
  ctx.logger.info('>>> adding company reviews - completed');
}

async function addFlightsPageTitleImages (ctx: ContextParams) : Promise<void> {
  ctx.logger.info('>>> creating flights page title images');
  await ensureImageCategory(ctx, ImageCategory.PageTitle, 1770, 1180);
  const stubCssStyle = fromPairs([
    ['backgroundImage', 'radial-gradient(circle at 68% 25%, hsla(60, 100%, 68%, 0.5) -25%, hsla(38, 100%, 61%, 0.29) 38%), linear-gradient(47deg, hsl(240, 97%, 31%) -20%, hsl(0, 0%, 36%) 49%)'],
    ['backgroundSize', '100% 100%, 100% 100%'],
    ['backgroundRepeat', 'repeat, no-repeat'],
    ['backgroundPosition', '109% 58%, 0% 0%']
  ]) as CSSProperties;
  await ensureImage(ctx, 'flights-title.webp', {
    category: ImageCategory.PageTitle,
    slug: FlightsTitleSlug,
    stubCssStyle
  });
  ctx.logger.info('>>> creating flights page title images - completed');
}

function compileWorldMapData (ctx: ContextParams) {
  ctx.logger.info('>>> compiling world map data');

  const srcFile = join(ctx.contentDir, 'geo', 'world-map.svg');
  const worldMapSvg = readFileSync(srcFile).toString('utf8');
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
        ctx.logger.warn('unpaired point coordinate: ' + cellSvg);
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
        ctx.logger.warn('failed to parse point coordinates: ' + cellSvg);
        throw new Error('failed to parse point coordinate');
      }
    }

    if (!cellPoints.length) {
      ctx.logger.warn('no point data found in cell: ' + cellSvg);
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

  const resultJson : IWorldMapDataDto = {
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
  const outFile = join(ctx.publicResDir, 'geo', 'world-map.json');
  writeFileSync(outFile, JSON.stringify(resultJson), 'utf8');

  ctx.logger.info(`>>> compiling world map data - completed: count=${mapPoints.length}, left=${Math.min(...mapPoints.map(p => p.x))}, right=${Math.max(...mapPoints.map(p => p.x))}, top=${Math.min(...mapPoints.map(p => p.y))}, bottom=${Math.max(...mapPoints.map(p => p.y))}, d=${mean(mapPoints.map(p => p.d))}`);
}

async function seedDb () : Promise<void> {
  const logger: IAppLogger = CommonServicesLocator.getLogger();
  logger.info('(data-seed) starting data seeding');

  logger.info('=== SEEDING DB ===');
  try {
    logger.info('locating content directory');
    let contentDir = resolveParentDirectory(process.cwd(), ContentDirName);
    if (!contentDir) {
      logger.warn('FAILED to locate content directory');
      return;
    }
    contentDir = resolve(contentDir!);
    logger.info(`using content directory: ${contentDir}`);

    logger.info('locating public resources directory');
    let publicResDir = resolveParentDirectory(process.cwd(), PublicResDirName);
    if (!publicResDir) {
      logger.warn('FAILED to locate public resources directory');
      return;
    }
    publicResDir = resolve(publicResDir!);
    logger.info(`using public resources directory: ${publicResDir}`);

    const ctx: ContextParams = {
      logger,
      contentDir: contentDir!,
      publicResDir: publicResDir!
    };

    await ensureAppAdminUser(ctx);
    await addMainTitleImage(ctx);
    // await addAdminProfileImages(ctx); // KB: need to place image's in content folder

    await addAuthFormsPhotos(ctx);
    await ensureMailTemplates(ctx);
    await addDefaultUserProfileImages(ctx);

    await addGeoData(ctx);
    await addPopularCities(ctx);
    await addCityImages(ctx);
    await addCompanyReviews(ctx);
    await addFlightsPageTitleImages(ctx);
    compileWorldMapData(ctx);

    if (process.env.NODE_ENV === DEV_ENV_MODE) {
      await ensureCredentialsTestUser(ctx);
    }

    logger.info('=== DB SEEDING COMPLETED ===');
  } catch (err: any) {
    logger.warn('db seeding failed', err);
  }

  logger.info('(data-seed) data seeding completed');
}

async function checkNeedInitialSeeding () : Promise<boolean> {
  const logger = CommonServicesLocator.getLogger();
  logger.verbose('checking inital DB seeding is needed');

  const userLogic = ServerServicesLocator.getUserLogic();
  const adminUser = await userLogic.findUser(AuthProvider.Email, AdminUserEmail, 'minimal');
  if (adminUser) {
    logger.verbose('initial DB seeding is not needed');
    return false;
  } else {
    logger.verbose('initial DB seeding is needed');
    return true;
  }
}

let seedMethodExecuted = false;
export default defineNuxtPlugin({
  async setup (/* nuxtApp */) {
    if (seedMethodExecuted) {
      return;
    } else {
      seedMethodExecuted = true;
    }

    if (process.env.NODE_ENV === 'development' || isQuickStartEnv()) {
      const seedingIsNeeded = await checkNeedInitialSeeding();
      if (!seedingIsNeeded) {
        return;
      }

      const logger = CommonServicesLocator.getLogger();
      logger.lowerWarnsWithoutErrorLevel(true);
      try {
        await seedDb();
      } finally {
        logger.lowerWarnsWithoutErrorLevel(false);
      }
    }
  }
});
