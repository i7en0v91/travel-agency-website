-- CreateTable
CREATE TABLE "HtmlPageTimestamp" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "timestamp" DATETIME NOT NULL,
    "version" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firstName" TEXT,
    "lastName" TEXT,
    "passwordSalt" TEXT,
    "passwordHash" TEXT,
    "authProvider" TEXT NOT NULL,
    "providerIdentity" TEXT NOT NULL,
    "avatarId" TEXT,
    "coverId" TEXT,
    "createdUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL,
    CONSTRAINT "User_avatarId_fkey" FOREIGN KEY ("avatarId") REFERENCES "Image" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_coverId_fkey" FOREIGN KEY ("coverId") REFERENCES "Image" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserEmail" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verificationTokenId" TEXT,
    "changedEmailId" TEXT,
    "orderNum" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "createdUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL,
    CONSTRAINT "UserEmail_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserEmail_verificationTokenId_fkey" FOREIGN KEY ("verificationTokenId") REFERENCES "VerificationToken" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "UserEmail_changedEmailId_fkey" FOREIGN KEY ("changedEmailId") REFERENCES "UserEmail" ("id") ON DELETE SET NULL ON UPDATE SET NULL
);

-- CreateTable
CREATE TABLE "Image" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "stubCssStyle" TEXT,
    "invertForDarkTheme" BOOLEAN NOT NULL DEFAULT false,
    "ownerId" TEXT,
    "createdUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL,
    CONSTRAINT "Image_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ImageCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Image_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AcsysDraftsImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "stubCssStyle" TEXT,
    "invertForDarkTheme" BOOLEAN NOT NULL,
    "ownerId" TEXT,
    "createdUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "ImageCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "createdUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "File" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mime" TEXT NOT NULL,
    "originalName" TEXT,
    "bytes" BLOB NOT NULL,
    "createdUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "AuthFormImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "imageId" TEXT NOT NULL,
    "orderNum" INTEGER NOT NULL,
    "createdUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL,
    CONSTRAINT "AuthFormImage_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Image" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AcsysDraftsAuthFormImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "imageId" TEXT NOT NULL,
    "orderNum" INTEGER NOT NULL,
    "createdUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "Flight" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "airlineCompanyId" TEXT NOT NULL,
    "airplaneId" TEXT NOT NULL,
    "departmentAirportId" TEXT NOT NULL,
    "arrivalAirportId" TEXT NOT NULL,
    "departmentUtcPosix" INTEGER NOT NULL,
    "arrivalUtcPosix" INTEGER NOT NULL,
    "dataHash" TEXT NOT NULL,
    "createdUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL,
    CONSTRAINT "Flight_airlineCompanyId_fkey" FOREIGN KEY ("airlineCompanyId") REFERENCES "AirlineCompany" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Flight_airplaneId_fkey" FOREIGN KEY ("airplaneId") REFERENCES "Airplane" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Flight_departmentAirportId_fkey" FOREIGN KEY ("departmentAirportId") REFERENCES "Airport" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Flight_arrivalAirportId_fkey" FOREIGN KEY ("arrivalAirportId") REFERENCES "Airport" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FlightOffer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "departFlightId" TEXT NOT NULL,
    "returnFlightId" TEXT,
    "numPassengers" INTEGER NOT NULL,
    "totalPrice" INTEGER NOT NULL,
    "class" TEXT NOT NULL,
    "dataHash" TEXT NOT NULL,
    "createdUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL,
    CONSTRAINT "FlightOffer_departFlightId_fkey" FOREIGN KEY ("departFlightId") REFERENCES "Flight" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FlightOffer_returnFlightId_fkey" FOREIGN KEY ("returnFlightId") REFERENCES "Flight" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StayOffer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hotelId" TEXT NOT NULL,
    "checkInPosix" INTEGER NOT NULL,
    "checkOutPosix" INTEGER NOT NULL,
    "numRooms" INTEGER NOT NULL,
    "numGuests" INTEGER NOT NULL,
    "totalPrice" INTEGER NOT NULL,
    "dataHash" TEXT NOT NULL,
    "createdUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL,
    CONSTRAINT "StayOffer_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserFlightOffer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "offerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isFavourite" BOOLEAN NOT NULL DEFAULT false,
    "createdUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL,
    CONSTRAINT "UserFlightOffer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserFlightOffer_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "FlightOffer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserStayOffer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "offerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isFavourite" BOOLEAN NOT NULL DEFAULT false,
    "createdUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL,
    CONSTRAINT "UserStayOffer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserStayOffer_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "StayOffer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Hotel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cityId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameStrId" TEXT NOT NULL,
    "lon" TEXT NOT NULL,
    "lat" TEXT NOT NULL,
    "createdUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL,
    CONSTRAINT "Hotel_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Hotel_nameStrId_fkey" FOREIGN KEY ("nameStrId") REFERENCES "LocalizeableValue" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AcsysDraftsHotel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cityId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameStrId" TEXT NOT NULL,
    "lon" TEXT NOT NULL,
    "lat" TEXT NOT NULL,
    "createdUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "HotelDescription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hotelId" TEXT NOT NULL,
    "textStrId" TEXT NOT NULL,
    "paragraphKind" TEXT NOT NULL,
    "orderNum" INTEGER NOT NULL,
    "createdUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL,
    CONSTRAINT "HotelDescription_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "HotelDescription_textStrId_fkey" FOREIGN KEY ("textStrId") REFERENCES "LocalizeableValue" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AcsysDraftsHotelDescription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hotelId" TEXT NOT NULL,
    "textStrId" TEXT NOT NULL,
    "paragraphKind" TEXT NOT NULL,
    "orderNum" INTEGER NOT NULL,
    "createdUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "HotelReview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hotelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "textStrId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "createdUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL,
    CONSTRAINT "HotelReview_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "HotelReview_textStrId_fkey" FOREIGN KEY ("textStrId") REFERENCES "LocalizeableValue" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "HotelReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AcsysDraftsHotelReview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hotelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "textStrId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "createdUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "HotelImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hotelId" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    "serviceLevel" TEXT,
    "orderNum" INTEGER NOT NULL,
    "createdUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL,
    CONSTRAINT "HotelImage_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Image" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "HotelImage_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AcsysDraftsHotelImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hotelId" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    "serviceLevel" TEXT,
    "orderNum" INTEGER NOT NULL,
    "createdUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "flightOfferId" TEXT,
    "stayOfferId" TEXT,
    "serviceLevel" TEXT,
    "userId" TEXT NOT NULL,
    "createdUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL,
    CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Booking_flightOfferId_fkey" FOREIGN KEY ("flightOfferId") REFERENCES "UserFlightOffer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Booking_stayOfferId_fkey" FOREIGN KEY ("stayOfferId") REFERENCES "UserStayOffer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PopularCity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cityId" TEXT NOT NULL,
    "promoLineStrId" TEXT NOT NULL,
    "travelHeaderStrId" TEXT NOT NULL,
    "travelTextStrId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "visibleOnWorldMap" BOOLEAN NOT NULL DEFAULT false,
    "createdUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL,
    CONSTRAINT "PopularCity_promoLineStrId_fkey" FOREIGN KEY ("promoLineStrId") REFERENCES "LocalizeableValue" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PopularCity_travelHeaderStrId_fkey" FOREIGN KEY ("travelHeaderStrId") REFERENCES "LocalizeableValue" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PopularCity_travelTextStrId_fkey" FOREIGN KEY ("travelTextStrId") REFERENCES "LocalizeableValue" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PopularCity_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AcsysDraftsPopularCity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cityId" TEXT NOT NULL,
    "promoLineStrId" TEXT NOT NULL,
    "travelHeaderStrId" TEXT NOT NULL,
    "travelTextStrId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "visibleOnWorldMap" BOOLEAN NOT NULL,
    "createdUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "PopularCityImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "popularCityId" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    "orderNum" INTEGER NOT NULL,
    "createdUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL,
    CONSTRAINT "PopularCityImage_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Image" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PopularCityImage_popularCityId_fkey" FOREIGN KEY ("popularCityId") REFERENCES "PopularCity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AcsysDraftsPopularCityImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "popularCityId" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    "orderNum" INTEGER NOT NULL,
    "createdUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "Country" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nameStrId" TEXT NOT NULL,
    "createdUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL,
    CONSTRAINT "Country_nameStrId_fkey" FOREIGN KEY ("nameStrId") REFERENCES "LocalizeableValue" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "City" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "nameStrId" TEXT NOT NULL,
    "textForSearch" TEXT NOT NULL,
    "lon" TEXT NOT NULL,
    "lat" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "population" INTEGER NOT NULL,
    "utcOffsetMin" INTEGER NOT NULL,
    "createdUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL,
    CONSTRAINT "City_nameStrId_fkey" FOREIGN KEY ("nameStrId") REFERENCES "LocalizeableValue" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "City_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AcsysDraftsCity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "nameStrId" TEXT NOT NULL,
    "textForSearch" TEXT NOT NULL,
    "lon" TEXT NOT NULL,
    "lat" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "population" INTEGER NOT NULL,
    "utcOffsetMin" INTEGER NOT NULL,
    "createdUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "Airport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lon" TEXT NOT NULL,
    "lat" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "nameStrId" TEXT NOT NULL,
    "createdUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL,
    CONSTRAINT "Airport_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Airport_nameStrId_fkey" FOREIGN KEY ("nameStrId") REFERENCES "LocalizeableValue" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AcsysDraftsAirport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lon" TEXT NOT NULL,
    "lat" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "nameStrId" TEXT NOT NULL,
    "createdUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "CompanyReview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "headerStrId" TEXT NOT NULL,
    "bodyStrId" TEXT NOT NULL,
    "personNameStrId" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    "createdUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL,
    CONSTRAINT "CompanyReview_headerStrId_fkey" FOREIGN KEY ("headerStrId") REFERENCES "LocalizeableValue" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CompanyReview_bodyStrId_fkey" FOREIGN KEY ("bodyStrId") REFERENCES "LocalizeableValue" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CompanyReview_personNameStrId_fkey" FOREIGN KEY ("personNameStrId") REFERENCES "LocalizeableValue" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CompanyReview_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Image" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AcsysDraftsCompanyReview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "headerStrId" TEXT NOT NULL,
    "bodyStrId" TEXT NOT NULL,
    "personNameStrId" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    "createdUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "AirlineCompany" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nameStrId" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "logoImageId" TEXT NOT NULL,
    "numReviews" INTEGER NOT NULL,
    "reviewScore" TEXT NOT NULL,
    "createdUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL,
    CONSTRAINT "AirlineCompany_nameStrId_fkey" FOREIGN KEY ("nameStrId") REFERENCES "LocalizeableValue" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AirlineCompany_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AirlineCompany_logoImageId_fkey" FOREIGN KEY ("logoImageId") REFERENCES "Image" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AcsysDraftsAirlineCompany" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nameStrId" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "logoImageId" TEXT NOT NULL,
    "numReviews" INTEGER NOT NULL,
    "reviewScore" TEXT NOT NULL,
    "createdUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "Airplane" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nameStrId" TEXT NOT NULL,
    "createdUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL,
    CONSTRAINT "Airplane_nameStrId_fkey" FOREIGN KEY ("nameStrId") REFERENCES "LocalizeableValue" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AcsysDraftsAirplane" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nameStrId" TEXT NOT NULL,
    "createdUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "AirplaneImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "airplaneId" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "orderNum" INTEGER NOT NULL,
    "createdUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL,
    CONSTRAINT "AirplaneImage_airplaneId_fkey" FOREIGN KEY ("airplaneId") REFERENCES "Airplane" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AirplaneImage_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Image" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AcsysDraftsAirplaneImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "airplaneId" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "orderNum" INTEGER NOT NULL,
    "createdUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "MailTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL,
    "templateStrId" TEXT NOT NULL,
    "createdUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL,
    CONSTRAINT "MailTemplate_templateStrId_fkey" FOREIGN KEY ("templateStrId") REFERENCES "LocalizeableValue" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AcsysDraftsMailTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL,
    "templateStrId" INTEGER NOT NULL,
    "createdUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "hash" TEXT NOT NULL,
    "attemptsMade" INTEGER NOT NULL DEFAULT 0,
    "kind" TEXT NOT NULL,
    "createdUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL,
    CONSTRAINT "VerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LocalizeableValue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "en" TEXT NOT NULL,
    "ru" TEXT NOT NULL,
    "fr" TEXT NOT NULL,
    "createdUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "AcsysDraftsLocalizeableValue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "en" TEXT NOT NULL,
    "ru" TEXT NOT NULL,
    "fr" TEXT NOT NULL,
    "createdUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedUtc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL
);

-- CreateIndex
CREATE INDEX "HtmlPageTimestamp_timestamp_idx" ON "HtmlPageTimestamp"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "User_avatarId_key" ON "User"("avatarId");

-- CreateIndex
CREATE UNIQUE INDEX "User_coverId_key" ON "User"("coverId");

-- CreateIndex
CREATE INDEX "User_authProvider_providerIdentity_idx" ON "User"("authProvider", "providerIdentity");

-- CreateIndex
CREATE INDEX "User_modifiedUtc_idx" ON "User"("modifiedUtc");

-- CreateIndex
CREATE UNIQUE INDEX "UserEmail_verificationTokenId_key" ON "UserEmail"("verificationTokenId");

-- CreateIndex
CREATE INDEX "UserEmail_email_idx" ON "UserEmail"("email");

-- CreateIndex
CREATE INDEX "UserEmail_userId_idx" ON "UserEmail"("userId");

-- CreateIndex
CREATE INDEX "UserEmail_verificationTokenId_idx" ON "UserEmail"("verificationTokenId");

-- CreateIndex
CREATE INDEX "UserEmail_modifiedUtc_idx" ON "UserEmail"("modifiedUtc");

-- CreateIndex
CREATE UNIQUE INDEX "Image_slug_key" ON "Image"("slug");

-- CreateIndex
CREATE INDEX "Image_slug_idx" ON "Image"("slug");

-- CreateIndex
CREATE INDEX "Image_categoryId_idx" ON "Image"("categoryId");

-- CreateIndex
CREATE INDEX "Image_fileId_idx" ON "Image"("fileId");

-- CreateIndex
CREATE INDEX "Image_ownerId_idx" ON "Image"("ownerId");

-- CreateIndex
CREATE INDEX "Image_modifiedUtc_idx" ON "Image"("modifiedUtc");

-- CreateIndex
CREATE UNIQUE INDEX "AcsysDraftsImage_slug_key" ON "AcsysDraftsImage"("slug");

-- CreateIndex
CREATE INDEX "AcsysDraftsImage_slug_idx" ON "AcsysDraftsImage"("slug");

-- CreateIndex
CREATE INDEX "AcsysDraftsImage_categoryId_idx" ON "AcsysDraftsImage"("categoryId");

-- CreateIndex
CREATE INDEX "AcsysDraftsImage_modifiedUtc_idx" ON "AcsysDraftsImage"("modifiedUtc");

-- CreateIndex
CREATE UNIQUE INDEX "ImageCategory_kind_key" ON "ImageCategory"("kind");

-- CreateIndex
CREATE INDEX "ImageCategory_kind_idx" ON "ImageCategory"("kind");

-- CreateIndex
CREATE INDEX "ImageCategory_modifiedUtc_idx" ON "ImageCategory"("modifiedUtc");

-- CreateIndex
CREATE INDEX "File_modifiedUtc_idx" ON "File"("modifiedUtc");

-- CreateIndex
CREATE UNIQUE INDEX "AuthFormImage_imageId_key" ON "AuthFormImage"("imageId");

-- CreateIndex
CREATE INDEX "AuthFormImage_modifiedUtc_idx" ON "AuthFormImage"("modifiedUtc");

-- CreateIndex
CREATE UNIQUE INDEX "AcsysDraftsAuthFormImage_imageId_key" ON "AcsysDraftsAuthFormImage"("imageId");

-- CreateIndex
CREATE INDEX "AcsysDraftsAuthFormImage_modifiedUtc_idx" ON "AcsysDraftsAuthFormImage"("modifiedUtc");

-- CreateIndex
CREATE INDEX "Flight_airlineCompanyId_idx" ON "Flight"("airlineCompanyId");

-- CreateIndex
CREATE INDEX "Flight_airplaneId_idx" ON "Flight"("airplaneId");

-- CreateIndex
CREATE INDEX "Flight_departmentAirportId_idx" ON "Flight"("departmentAirportId");

-- CreateIndex
CREATE INDEX "Flight_arrivalAirportId_idx" ON "Flight"("arrivalAirportId");

-- CreateIndex
CREATE INDEX "Flight_dataHash_idx" ON "Flight"("dataHash");

-- CreateIndex
CREATE INDEX "Flight_modifiedUtc_idx" ON "Flight"("modifiedUtc");

-- CreateIndex
CREATE INDEX "FlightOffer_dataHash_idx" ON "FlightOffer"("dataHash");

-- CreateIndex
CREATE INDEX "FlightOffer_departFlightId_idx" ON "FlightOffer"("departFlightId");

-- CreateIndex
CREATE INDEX "FlightOffer_returnFlightId_idx" ON "FlightOffer"("returnFlightId");

-- CreateIndex
CREATE INDEX "FlightOffer_modifiedUtc_idx" ON "FlightOffer"("modifiedUtc");

-- CreateIndex
CREATE INDEX "StayOffer_hotelId_idx" ON "StayOffer"("hotelId");

-- CreateIndex
CREATE INDEX "StayOffer_dataHash_idx" ON "StayOffer"("dataHash");

-- CreateIndex
CREATE INDEX "StayOffer_modifiedUtc_idx" ON "StayOffer"("modifiedUtc");

-- CreateIndex
CREATE INDEX "UserFlightOffer_userId_offerId_idx" ON "UserFlightOffer"("userId", "offerId");

-- CreateIndex
CREATE INDEX "UserFlightOffer_modifiedUtc_idx" ON "UserFlightOffer"("modifiedUtc");

-- CreateIndex
CREATE INDEX "UserStayOffer_userId_offerId_idx" ON "UserStayOffer"("userId", "offerId");

-- CreateIndex
CREATE INDEX "UserStayOffer_modifiedUtc_idx" ON "UserStayOffer"("modifiedUtc");

-- CreateIndex
CREATE UNIQUE INDEX "Hotel_slug_key" ON "Hotel"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Hotel_nameStrId_key" ON "Hotel"("nameStrId");

-- CreateIndex
CREATE INDEX "Hotel_cityId_idx" ON "Hotel"("cityId");

-- CreateIndex
CREATE INDEX "Hotel_modifiedUtc_idx" ON "Hotel"("modifiedUtc");

-- CreateIndex
CREATE UNIQUE INDEX "AcsysDraftsHotel_slug_key" ON "AcsysDraftsHotel"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "AcsysDraftsHotel_nameStrId_key" ON "AcsysDraftsHotel"("nameStrId");

-- CreateIndex
CREATE INDEX "AcsysDraftsHotel_cityId_idx" ON "AcsysDraftsHotel"("cityId");

-- CreateIndex
CREATE INDEX "AcsysDraftsHotel_modifiedUtc_idx" ON "AcsysDraftsHotel"("modifiedUtc");

-- CreateIndex
CREATE UNIQUE INDEX "HotelDescription_textStrId_key" ON "HotelDescription"("textStrId");

-- CreateIndex
CREATE INDEX "HotelDescription_hotelId_idx" ON "HotelDescription"("hotelId");

-- CreateIndex
CREATE INDEX "HotelDescription_modifiedUtc_idx" ON "HotelDescription"("modifiedUtc");

-- CreateIndex
CREATE UNIQUE INDEX "AcsysDraftsHotelDescription_textStrId_key" ON "AcsysDraftsHotelDescription"("textStrId");

-- CreateIndex
CREATE INDEX "AcsysDraftsHotelDescription_hotelId_idx" ON "AcsysDraftsHotelDescription"("hotelId");

-- CreateIndex
CREATE INDEX "AcsysDraftsHotelDescription_modifiedUtc_idx" ON "AcsysDraftsHotelDescription"("modifiedUtc");

-- CreateIndex
CREATE UNIQUE INDEX "HotelReview_textStrId_key" ON "HotelReview"("textStrId");

-- CreateIndex
CREATE INDEX "HotelReview_modifiedUtc_idx" ON "HotelReview"("modifiedUtc");

-- CreateIndex
CREATE UNIQUE INDEX "AcsysDraftsHotelReview_textStrId_key" ON "AcsysDraftsHotelReview"("textStrId");

-- CreateIndex
CREATE INDEX "AcsysDraftsHotelReview_modifiedUtc_idx" ON "AcsysDraftsHotelReview"("modifiedUtc");

-- CreateIndex
CREATE UNIQUE INDEX "HotelImage_imageId_key" ON "HotelImage"("imageId");

-- CreateIndex
CREATE INDEX "HotelImage_hotelId_idx" ON "HotelImage"("hotelId");

-- CreateIndex
CREATE INDEX "HotelImage_modifiedUtc_idx" ON "HotelImage"("modifiedUtc");

-- CreateIndex
CREATE UNIQUE INDEX "AcsysDraftsHotelImage_imageId_key" ON "AcsysDraftsHotelImage"("imageId");

-- CreateIndex
CREATE INDEX "AcsysDraftsHotelImage_hotelId_idx" ON "AcsysDraftsHotelImage"("hotelId");

-- CreateIndex
CREATE INDEX "AcsysDraftsHotelImage_modifiedUtc_idx" ON "AcsysDraftsHotelImage"("modifiedUtc");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_flightOfferId_key" ON "Booking"("flightOfferId");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_stayOfferId_key" ON "Booking"("stayOfferId");

-- CreateIndex
CREATE INDEX "Booking_userId_idx" ON "Booking"("userId");

-- CreateIndex
CREATE INDEX "Booking_modifiedUtc_idx" ON "Booking"("modifiedUtc");

-- CreateIndex
CREATE UNIQUE INDEX "PopularCity_cityId_key" ON "PopularCity"("cityId");

-- CreateIndex
CREATE UNIQUE INDEX "PopularCity_promoLineStrId_key" ON "PopularCity"("promoLineStrId");

-- CreateIndex
CREATE UNIQUE INDEX "PopularCity_travelHeaderStrId_key" ON "PopularCity"("travelHeaderStrId");

-- CreateIndex
CREATE UNIQUE INDEX "PopularCity_travelTextStrId_key" ON "PopularCity"("travelTextStrId");

-- CreateIndex
CREATE INDEX "PopularCity_cityId_idx" ON "PopularCity"("cityId");

-- CreateIndex
CREATE INDEX "PopularCity_modifiedUtc_idx" ON "PopularCity"("modifiedUtc");

-- CreateIndex
CREATE UNIQUE INDEX "AcsysDraftsPopularCity_cityId_key" ON "AcsysDraftsPopularCity"("cityId");

-- CreateIndex
CREATE UNIQUE INDEX "AcsysDraftsPopularCity_promoLineStrId_key" ON "AcsysDraftsPopularCity"("promoLineStrId");

-- CreateIndex
CREATE UNIQUE INDEX "AcsysDraftsPopularCity_travelHeaderStrId_key" ON "AcsysDraftsPopularCity"("travelHeaderStrId");

-- CreateIndex
CREATE UNIQUE INDEX "AcsysDraftsPopularCity_travelTextStrId_key" ON "AcsysDraftsPopularCity"("travelTextStrId");

-- CreateIndex
CREATE INDEX "AcsysDraftsPopularCity_cityId_idx" ON "AcsysDraftsPopularCity"("cityId");

-- CreateIndex
CREATE INDEX "AcsysDraftsPopularCity_modifiedUtc_idx" ON "AcsysDraftsPopularCity"("modifiedUtc");

-- CreateIndex
CREATE UNIQUE INDEX "PopularCityImage_imageId_key" ON "PopularCityImage"("imageId");

-- CreateIndex
CREATE INDEX "PopularCityImage_popularCityId_idx" ON "PopularCityImage"("popularCityId");

-- CreateIndex
CREATE INDEX "PopularCityImage_modifiedUtc_idx" ON "PopularCityImage"("modifiedUtc");

-- CreateIndex
CREATE UNIQUE INDEX "AcsysDraftsPopularCityImage_imageId_key" ON "AcsysDraftsPopularCityImage"("imageId");

-- CreateIndex
CREATE INDEX "AcsysDraftsPopularCityImage_popularCityId_idx" ON "AcsysDraftsPopularCityImage"("popularCityId");

-- CreateIndex
CREATE INDEX "AcsysDraftsPopularCityImage_modifiedUtc_idx" ON "AcsysDraftsPopularCityImage"("modifiedUtc");

-- CreateIndex
CREATE UNIQUE INDEX "Country_nameStrId_key" ON "Country"("nameStrId");

-- CreateIndex
CREATE INDEX "Country_nameStrId_idx" ON "Country"("nameStrId");

-- CreateIndex
CREATE INDEX "Country_modifiedUtc_idx" ON "Country"("modifiedUtc");

-- CreateIndex
CREATE UNIQUE INDEX "City_slug_key" ON "City"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "City_nameStrId_key" ON "City"("nameStrId");

-- CreateIndex
CREATE INDEX "City_countryId_idx" ON "City"("countryId");

-- CreateIndex
CREATE INDEX "City_nameStrId_idx" ON "City"("nameStrId");

-- CreateIndex
CREATE INDEX "City_slug_idx" ON "City"("slug");

-- CreateIndex
CREATE INDEX "City_modifiedUtc_idx" ON "City"("modifiedUtc");

-- CreateIndex
CREATE UNIQUE INDEX "AcsysDraftsCity_slug_key" ON "AcsysDraftsCity"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "AcsysDraftsCity_nameStrId_key" ON "AcsysDraftsCity"("nameStrId");

-- CreateIndex
CREATE INDEX "AcsysDraftsCity_countryId_idx" ON "AcsysDraftsCity"("countryId");

-- CreateIndex
CREATE INDEX "AcsysDraftsCity_slug_idx" ON "AcsysDraftsCity"("slug");

-- CreateIndex
CREATE INDEX "AcsysDraftsCity_modifiedUtc_idx" ON "AcsysDraftsCity"("modifiedUtc");

-- CreateIndex
CREATE UNIQUE INDEX "Airport_nameStrId_key" ON "Airport"("nameStrId");

-- CreateIndex
CREATE INDEX "Airport_cityId_idx" ON "Airport"("cityId");

-- CreateIndex
CREATE INDEX "Airport_nameStrId_idx" ON "Airport"("nameStrId");

-- CreateIndex
CREATE INDEX "Airport_modifiedUtc_idx" ON "Airport"("modifiedUtc");

-- CreateIndex
CREATE UNIQUE INDEX "AcsysDraftsAirport_nameStrId_key" ON "AcsysDraftsAirport"("nameStrId");

-- CreateIndex
CREATE INDEX "AcsysDraftsAirport_cityId_idx" ON "AcsysDraftsAirport"("cityId");

-- CreateIndex
CREATE INDEX "AcsysDraftsAirport_modifiedUtc_idx" ON "AcsysDraftsAirport"("modifiedUtc");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyReview_headerStrId_key" ON "CompanyReview"("headerStrId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyReview_bodyStrId_key" ON "CompanyReview"("bodyStrId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyReview_personNameStrId_key" ON "CompanyReview"("personNameStrId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyReview_imageId_key" ON "CompanyReview"("imageId");

-- CreateIndex
CREATE INDEX "CompanyReview_modifiedUtc_idx" ON "CompanyReview"("modifiedUtc");

-- CreateIndex
CREATE UNIQUE INDEX "AcsysDraftsCompanyReview_headerStrId_key" ON "AcsysDraftsCompanyReview"("headerStrId");

-- CreateIndex
CREATE UNIQUE INDEX "AcsysDraftsCompanyReview_bodyStrId_key" ON "AcsysDraftsCompanyReview"("bodyStrId");

-- CreateIndex
CREATE UNIQUE INDEX "AcsysDraftsCompanyReview_personNameStrId_key" ON "AcsysDraftsCompanyReview"("personNameStrId");

-- CreateIndex
CREATE UNIQUE INDEX "AcsysDraftsCompanyReview_imageId_key" ON "AcsysDraftsCompanyReview"("imageId");

-- CreateIndex
CREATE INDEX "AcsysDraftsCompanyReview_modifiedUtc_idx" ON "AcsysDraftsCompanyReview"("modifiedUtc");

-- CreateIndex
CREATE UNIQUE INDEX "AirlineCompany_nameStrId_key" ON "AirlineCompany"("nameStrId");

-- CreateIndex
CREATE UNIQUE INDEX "AirlineCompany_cityId_key" ON "AirlineCompany"("cityId");

-- CreateIndex
CREATE UNIQUE INDEX "AirlineCompany_logoImageId_key" ON "AirlineCompany"("logoImageId");

-- CreateIndex
CREATE INDEX "AirlineCompany_cityId_idx" ON "AirlineCompany"("cityId");

-- CreateIndex
CREATE INDEX "AirlineCompany_modifiedUtc_idx" ON "AirlineCompany"("modifiedUtc");

-- CreateIndex
CREATE UNIQUE INDEX "AcsysDraftsAirlineCompany_nameStrId_key" ON "AcsysDraftsAirlineCompany"("nameStrId");

-- CreateIndex
CREATE UNIQUE INDEX "AcsysDraftsAirlineCompany_cityId_key" ON "AcsysDraftsAirlineCompany"("cityId");

-- CreateIndex
CREATE UNIQUE INDEX "AcsysDraftsAirlineCompany_logoImageId_key" ON "AcsysDraftsAirlineCompany"("logoImageId");

-- CreateIndex
CREATE INDEX "AcsysDraftsAirlineCompany_cityId_idx" ON "AcsysDraftsAirlineCompany"("cityId");

-- CreateIndex
CREATE INDEX "AcsysDraftsAirlineCompany_modifiedUtc_idx" ON "AcsysDraftsAirlineCompany"("modifiedUtc");

-- CreateIndex
CREATE UNIQUE INDEX "Airplane_nameStrId_key" ON "Airplane"("nameStrId");

-- CreateIndex
CREATE INDEX "Airplane_modifiedUtc_idx" ON "Airplane"("modifiedUtc");

-- CreateIndex
CREATE UNIQUE INDEX "AcsysDraftsAirplane_nameStrId_key" ON "AcsysDraftsAirplane"("nameStrId");

-- CreateIndex
CREATE INDEX "AcsysDraftsAirplane_modifiedUtc_idx" ON "AcsysDraftsAirplane"("modifiedUtc");

-- CreateIndex
CREATE UNIQUE INDEX "AirplaneImage_imageId_key" ON "AirplaneImage"("imageId");

-- CreateIndex
CREATE INDEX "AirplaneImage_airplaneId_idx" ON "AirplaneImage"("airplaneId");

-- CreateIndex
CREATE INDEX "AirplaneImage_modifiedUtc_idx" ON "AirplaneImage"("modifiedUtc");

-- CreateIndex
CREATE UNIQUE INDEX "AcsysDraftsAirplaneImage_imageId_key" ON "AcsysDraftsAirplaneImage"("imageId");

-- CreateIndex
CREATE INDEX "AcsysDraftsAirplaneImage_airplaneId_idx" ON "AcsysDraftsAirplaneImage"("airplaneId");

-- CreateIndex
CREATE INDEX "AcsysDraftsAirplaneImage_modifiedUtc_idx" ON "AcsysDraftsAirplaneImage"("modifiedUtc");

-- CreateIndex
CREATE UNIQUE INDEX "MailTemplate_templateStrId_key" ON "MailTemplate"("templateStrId");

-- CreateIndex
CREATE INDEX "MailTemplate_modifiedUtc_idx" ON "MailTemplate"("modifiedUtc");

-- CreateIndex
CREATE UNIQUE INDEX "AcsysDraftsMailTemplate_templateStrId_key" ON "AcsysDraftsMailTemplate"("templateStrId");

-- CreateIndex
CREATE INDEX "AcsysDraftsMailTemplate_modifiedUtc_idx" ON "AcsysDraftsMailTemplate"("modifiedUtc");

-- CreateIndex
CREATE INDEX "VerificationToken_userId_createdUtc_idx" ON "VerificationToken"("userId", "createdUtc");

-- CreateIndex
CREATE INDEX "VerificationToken_modifiedUtc_idx" ON "VerificationToken"("modifiedUtc");

-- CreateIndex
CREATE INDEX "LocalizeableValue_modifiedUtc_idx" ON "LocalizeableValue"("modifiedUtc");

-- CreateIndex
CREATE INDEX "AcsysDraftsLocalizeableValue_modifiedUtc_idx" ON "AcsysDraftsLocalizeableValue"("modifiedUtc");
