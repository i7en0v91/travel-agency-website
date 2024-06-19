-- CreateTable
CREATE TABLE `HtmlPageTimestamp` (
    `id` VARCHAR(191) NOT NULL,
    `timestamp` DATETIME(3) NOT NULL,
    `version` INTEGER NOT NULL,

    INDEX `HtmlPageTimestamp_timestamp_idx`(`timestamp`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `firstName` VARCHAR(128) NULL,
    `lastName` VARCHAR(128) NULL,
    `passwordSalt` VARCHAR(256) NULL,
    `passwordHash` VARCHAR(256) NULL,
    `authProvider` VARCHAR(191) NOT NULL,
    `providerIdentity` VARCHAR(256) NOT NULL,
    `avatarId` VARCHAR(191) NULL,
    `coverId` VARCHAR(191) NULL,
    `createdUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `modifiedUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `version` INTEGER NOT NULL,

    UNIQUE INDEX `User_avatarId_key`(`avatarId`),
    UNIQUE INDEX `User_coverId_key`(`coverId`),
    INDEX `User_authProvider_providerIdentity_idx`(`authProvider`, `providerIdentity`),
    INDEX `User_modifiedUtc_idx`(`modifiedUtc`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserEmail` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(256) NOT NULL,
    `isVerified` BOOLEAN NOT NULL DEFAULT false,
    `verificationTokenId` VARCHAR(191) NULL,
    `changedEmailId` VARCHAR(191) NULL,
    `orderNum` INTEGER NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `createdUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `modifiedUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `version` INTEGER NOT NULL,

    UNIQUE INDEX `UserEmail_verificationTokenId_key`(`verificationTokenId`),
    INDEX `UserEmail_email_idx`(`email`),
    INDEX `UserEmail_userId_idx`(`userId`),
    INDEX `UserEmail_verificationTokenId_idx`(`verificationTokenId`),
    INDEX `UserEmail_modifiedUtc_idx`(`modifiedUtc`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Image` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(256) NOT NULL,
    `categoryId` VARCHAR(191) NOT NULL,
    `fileId` VARCHAR(191) NOT NULL,
    `stubCssStyle` TEXT NULL,
    `invertForDarkTheme` BOOLEAN NOT NULL DEFAULT false,
    `ownerId` VARCHAR(191) NULL,
    `createdUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `modifiedUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `version` INTEGER NOT NULL,

    UNIQUE INDEX `Image_slug_key`(`slug`),
    INDEX `Image_slug_idx`(`slug`),
    INDEX `Image_categoryId_idx`(`categoryId`),
    INDEX `Image_fileId_idx`(`fileId`),
    INDEX `Image_ownerId_idx`(`ownerId`),
    INDEX `Image_modifiedUtc_idx`(`modifiedUtc`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AcsysDraftsImage` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(256) NOT NULL,
    `categoryId` VARCHAR(191) NOT NULL,
    `fileId` VARCHAR(191) NOT NULL,
    `stubCssStyle` TEXT NULL,
    `invertForDarkTheme` BOOLEAN NOT NULL,
    `ownerId` VARCHAR(191) NULL,
    `createdUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `modifiedUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `version` INTEGER NOT NULL,

    UNIQUE INDEX `AcsysDraftsImage_slug_key`(`slug`),
    INDEX `AcsysDraftsImage_slug_idx`(`slug`),
    INDEX `AcsysDraftsImage_categoryId_idx`(`categoryId`),
    INDEX `AcsysDraftsImage_modifiedUtc_idx`(`modifiedUtc`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ImageCategory` (
    `id` VARCHAR(191) NOT NULL,
    `kind` VARCHAR(191) NOT NULL,
    `width` INTEGER NOT NULL,
    `height` INTEGER NOT NULL,
    `createdUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `modifiedUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `version` INTEGER NOT NULL,

    UNIQUE INDEX `ImageCategory_kind_key`(`kind`),
    INDEX `ImageCategory_kind_idx`(`kind`),
    INDEX `ImageCategory_modifiedUtc_idx`(`modifiedUtc`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `File` (
    `id` VARCHAR(191) NOT NULL,
    `mime` VARCHAR(256) NOT NULL,
    `originalName` VARCHAR(512) NULL,
    `bytes` LONGBLOB NOT NULL,
    `createdUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `modifiedUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `version` INTEGER NOT NULL,

    INDEX `File_modifiedUtc_idx`(`modifiedUtc`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuthFormImage` (
    `id` VARCHAR(191) NOT NULL,
    `imageId` VARCHAR(191) NOT NULL,
    `orderNum` INTEGER NOT NULL,
    `createdUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `modifiedUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `version` INTEGER NOT NULL,

    UNIQUE INDEX `AuthFormImage_imageId_key`(`imageId`),
    INDEX `AuthFormImage_modifiedUtc_idx`(`modifiedUtc`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AcsysDraftsAuthFormImage` (
    `id` VARCHAR(191) NOT NULL,
    `imageId` VARCHAR(191) NOT NULL,
    `orderNum` INTEGER NOT NULL,
    `createdUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `modifiedUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `version` INTEGER NOT NULL,

    UNIQUE INDEX `AcsysDraftsAuthFormImage_imageId_key`(`imageId`),
    INDEX `AcsysDraftsAuthFormImage_modifiedUtc_idx`(`modifiedUtc`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Flight` (
    `id` VARCHAR(191) NOT NULL,
    `airlineCompanyId` VARCHAR(191) NOT NULL,
    `airplaneId` VARCHAR(191) NOT NULL,
    `departmentAirportId` VARCHAR(191) NOT NULL,
    `arrivalAirportId` VARCHAR(191) NOT NULL,
    `departmentUtcPosix` INTEGER NOT NULL,
    `arrivalUtcPosix` INTEGER NOT NULL,
    `dataHash` VARCHAR(256) NOT NULL,
    `createdUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `modifiedUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `version` INTEGER NOT NULL,

    INDEX `Flight_airlineCompanyId_idx`(`airlineCompanyId`),
    INDEX `Flight_airplaneId_idx`(`airplaneId`),
    INDEX `Flight_departmentAirportId_idx`(`departmentAirportId`),
    INDEX `Flight_arrivalAirportId_idx`(`arrivalAirportId`),
    INDEX `Flight_dataHash_idx`(`dataHash`),
    INDEX `Flight_modifiedUtc_idx`(`modifiedUtc`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FlightOffer` (
    `id` VARCHAR(191) NOT NULL,
    `departFlightId` VARCHAR(191) NOT NULL,
    `returnFlightId` VARCHAR(191) NULL,
    `numPassengers` INTEGER NOT NULL,
    `totalPrice` INTEGER NOT NULL,
    `class` VARCHAR(191) NOT NULL,
    `dataHash` VARCHAR(256) NOT NULL,
    `createdUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `modifiedUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `version` INTEGER NOT NULL,

    INDEX `FlightOffer_dataHash_idx`(`dataHash`),
    INDEX `FlightOffer_departFlightId_idx`(`departFlightId`),
    INDEX `FlightOffer_returnFlightId_idx`(`returnFlightId`),
    INDEX `FlightOffer_modifiedUtc_idx`(`modifiedUtc`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StayOffer` (
    `id` VARCHAR(191) NOT NULL,
    `hotelId` VARCHAR(191) NOT NULL,
    `checkInPosix` INTEGER NOT NULL,
    `checkOutPosix` INTEGER NOT NULL,
    `numRooms` INTEGER NOT NULL,
    `numGuests` INTEGER NOT NULL,
    `totalPrice` INTEGER NOT NULL,
    `dataHash` VARCHAR(256) NOT NULL,
    `createdUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `modifiedUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `version` INTEGER NOT NULL,

    INDEX `StayOffer_hotelId_idx`(`hotelId`),
    INDEX `StayOffer_dataHash_idx`(`dataHash`),
    INDEX `StayOffer_modifiedUtc_idx`(`modifiedUtc`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserFlightOffer` (
    `id` VARCHAR(191) NOT NULL,
    `offerId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `isFavourite` BOOLEAN NOT NULL DEFAULT false,
    `createdUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `modifiedUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `version` INTEGER NOT NULL,

    INDEX `UserFlightOffer_userId_offerId_idx`(`userId`, `offerId`),
    INDEX `UserFlightOffer_modifiedUtc_idx`(`modifiedUtc`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserStayOffer` (
    `id` VARCHAR(191) NOT NULL,
    `offerId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `isFavourite` BOOLEAN NOT NULL DEFAULT false,
    `createdUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `modifiedUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `version` INTEGER NOT NULL,

    INDEX `UserStayOffer_userId_offerId_idx`(`userId`, `offerId`),
    INDEX `UserStayOffer_modifiedUtc_idx`(`modifiedUtc`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Hotel` (
    `id` VARCHAR(191) NOT NULL,
    `cityId` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(256) NOT NULL,
    `nameStrId` VARCHAR(191) NOT NULL,
    `lon` VARCHAR(191) NOT NULL,
    `lat` VARCHAR(191) NOT NULL,
    `createdUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `modifiedUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `version` INTEGER NOT NULL,

    UNIQUE INDEX `Hotel_slug_key`(`slug`),
    UNIQUE INDEX `Hotel_nameStrId_key`(`nameStrId`),
    INDEX `Hotel_cityId_idx`(`cityId`),
    INDEX `Hotel_modifiedUtc_idx`(`modifiedUtc`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AcsysDraftsHotel` (
    `id` VARCHAR(191) NOT NULL,
    `cityId` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(256) NOT NULL,
    `nameStrId` VARCHAR(191) NOT NULL,
    `lon` VARCHAR(191) NOT NULL,
    `lat` VARCHAR(191) NOT NULL,
    `createdUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `modifiedUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `version` INTEGER NOT NULL,

    UNIQUE INDEX `AcsysDraftsHotel_slug_key`(`slug`),
    UNIQUE INDEX `AcsysDraftsHotel_nameStrId_key`(`nameStrId`),
    INDEX `AcsysDraftsHotel_cityId_idx`(`cityId`),
    INDEX `AcsysDraftsHotel_modifiedUtc_idx`(`modifiedUtc`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HotelDescription` (
    `id` VARCHAR(191) NOT NULL,
    `hotelId` VARCHAR(191) NOT NULL,
    `textStrId` VARCHAR(191) NOT NULL,
    `paragraphKind` VARCHAR(191) NOT NULL,
    `orderNum` INTEGER NOT NULL,
    `createdUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `modifiedUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `version` INTEGER NOT NULL,

    UNIQUE INDEX `HotelDescription_textStrId_key`(`textStrId`),
    INDEX `HotelDescription_hotelId_idx`(`hotelId`),
    INDEX `HotelDescription_modifiedUtc_idx`(`modifiedUtc`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AcsysDraftsHotelDescription` (
    `id` VARCHAR(191) NOT NULL,
    `hotelId` VARCHAR(191) NOT NULL,
    `textStrId` VARCHAR(191) NOT NULL,
    `paragraphKind` VARCHAR(191) NOT NULL,
    `orderNum` INTEGER NOT NULL,
    `createdUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `modifiedUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `version` INTEGER NOT NULL,

    UNIQUE INDEX `AcsysDraftsHotelDescription_textStrId_key`(`textStrId`),
    INDEX `AcsysDraftsHotelDescription_hotelId_idx`(`hotelId`),
    INDEX `AcsysDraftsHotelDescription_modifiedUtc_idx`(`modifiedUtc`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HotelReview` (
    `id` VARCHAR(191) NOT NULL,
    `hotelId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `textStrId` VARCHAR(191) NOT NULL,
    `score` INTEGER NOT NULL,
    `createdUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `modifiedUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `version` INTEGER NOT NULL,

    UNIQUE INDEX `HotelReview_textStrId_key`(`textStrId`),
    INDEX `HotelReview_modifiedUtc_idx`(`modifiedUtc`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AcsysDraftsHotelReview` (
    `id` VARCHAR(191) NOT NULL,
    `hotelId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `textStrId` VARCHAR(191) NOT NULL,
    `score` INTEGER NOT NULL,
    `createdUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `modifiedUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `version` INTEGER NOT NULL,

    UNIQUE INDEX `AcsysDraftsHotelReview_textStrId_key`(`textStrId`),
    INDEX `AcsysDraftsHotelReview_modifiedUtc_idx`(`modifiedUtc`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HotelImage` (
    `id` VARCHAR(191) NOT NULL,
    `hotelId` VARCHAR(191) NOT NULL,
    `imageId` VARCHAR(191) NOT NULL,
    `serviceLevel` VARCHAR(191) NULL,
    `orderNum` INTEGER NOT NULL,
    `createdUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `modifiedUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `version` INTEGER NOT NULL,

    UNIQUE INDEX `HotelImage_imageId_key`(`imageId`),
    INDEX `HotelImage_hotelId_idx`(`hotelId`),
    INDEX `HotelImage_modifiedUtc_idx`(`modifiedUtc`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AcsysDraftsHotelImage` (
    `id` VARCHAR(191) NOT NULL,
    `hotelId` VARCHAR(191) NOT NULL,
    `imageId` VARCHAR(191) NOT NULL,
    `serviceLevel` VARCHAR(191) NULL,
    `orderNum` INTEGER NOT NULL,
    `createdUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `modifiedUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `version` INTEGER NOT NULL,

    UNIQUE INDEX `AcsysDraftsHotelImage_imageId_key`(`imageId`),
    INDEX `AcsysDraftsHotelImage_hotelId_idx`(`hotelId`),
    INDEX `AcsysDraftsHotelImage_modifiedUtc_idx`(`modifiedUtc`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Booking` (
    `id` VARCHAR(191) NOT NULL,
    `flightOfferId` VARCHAR(191) NULL,
    `stayOfferId` VARCHAR(191) NULL,
    `serviceLevel` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NOT NULL,
    `createdUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `modifiedUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `version` INTEGER NOT NULL,

    UNIQUE INDEX `Booking_flightOfferId_key`(`flightOfferId`),
    UNIQUE INDEX `Booking_stayOfferId_key`(`stayOfferId`),
    INDEX `Booking_userId_idx`(`userId`),
    INDEX `Booking_modifiedUtc_idx`(`modifiedUtc`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PopularCity` (
    `id` VARCHAR(191) NOT NULL,
    `cityId` VARCHAR(191) NOT NULL,
    `promoLineStrId` VARCHAR(191) NOT NULL,
    `travelHeaderStrId` VARCHAR(191) NOT NULL,
    `travelTextStrId` VARCHAR(191) NOT NULL,
    `rating` INTEGER NOT NULL,
    `visibleOnWorldMap` BOOLEAN NOT NULL DEFAULT false,
    `createdUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `modifiedUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `version` INTEGER NOT NULL,

    UNIQUE INDEX `PopularCity_cityId_key`(`cityId`),
    UNIQUE INDEX `PopularCity_promoLineStrId_key`(`promoLineStrId`),
    UNIQUE INDEX `PopularCity_travelHeaderStrId_key`(`travelHeaderStrId`),
    UNIQUE INDEX `PopularCity_travelTextStrId_key`(`travelTextStrId`),
    INDEX `PopularCity_cityId_idx`(`cityId`),
    INDEX `PopularCity_modifiedUtc_idx`(`modifiedUtc`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AcsysDraftsPopularCity` (
    `id` VARCHAR(191) NOT NULL,
    `cityId` VARCHAR(191) NOT NULL,
    `promoLineStrId` VARCHAR(191) NOT NULL,
    `travelHeaderStrId` VARCHAR(191) NOT NULL,
    `travelTextStrId` VARCHAR(191) NOT NULL,
    `rating` INTEGER NOT NULL,
    `visibleOnWorldMap` BOOLEAN NOT NULL,
    `createdUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `modifiedUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `version` INTEGER NOT NULL,

    UNIQUE INDEX `AcsysDraftsPopularCity_cityId_key`(`cityId`),
    UNIQUE INDEX `AcsysDraftsPopularCity_promoLineStrId_key`(`promoLineStrId`),
    UNIQUE INDEX `AcsysDraftsPopularCity_travelHeaderStrId_key`(`travelHeaderStrId`),
    UNIQUE INDEX `AcsysDraftsPopularCity_travelTextStrId_key`(`travelTextStrId`),
    INDEX `AcsysDraftsPopularCity_cityId_idx`(`cityId`),
    INDEX `AcsysDraftsPopularCity_modifiedUtc_idx`(`modifiedUtc`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PopularCityImage` (
    `id` VARCHAR(191) NOT NULL,
    `popularCityId` VARCHAR(191) NOT NULL,
    `imageId` VARCHAR(191) NOT NULL,
    `orderNum` INTEGER NOT NULL,
    `createdUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `modifiedUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `version` INTEGER NOT NULL,

    UNIQUE INDEX `PopularCityImage_imageId_key`(`imageId`),
    INDEX `PopularCityImage_popularCityId_idx`(`popularCityId`),
    INDEX `PopularCityImage_modifiedUtc_idx`(`modifiedUtc`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AcsysDraftsPopularCityImage` (
    `id` VARCHAR(191) NOT NULL,
    `popularCityId` VARCHAR(191) NOT NULL,
    `imageId` VARCHAR(191) NOT NULL,
    `orderNum` INTEGER NOT NULL,
    `createdUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `modifiedUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `version` INTEGER NOT NULL,

    UNIQUE INDEX `AcsysDraftsPopularCityImage_imageId_key`(`imageId`),
    INDEX `AcsysDraftsPopularCityImage_popularCityId_idx`(`popularCityId`),
    INDEX `AcsysDraftsPopularCityImage_modifiedUtc_idx`(`modifiedUtc`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Country` (
    `id` VARCHAR(191) NOT NULL,
    `nameStrId` VARCHAR(191) NOT NULL,
    `createdUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `modifiedUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `version` INTEGER NOT NULL,

    UNIQUE INDEX `Country_nameStrId_key`(`nameStrId`),
    INDEX `Country_nameStrId_idx`(`nameStrId`),
    INDEX `Country_modifiedUtc_idx`(`modifiedUtc`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `City` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(256) NOT NULL,
    `nameStrId` VARCHAR(191) NOT NULL,
    `textForSearch` TEXT NOT NULL,
    `lon` VARCHAR(191) NOT NULL,
    `lat` VARCHAR(191) NOT NULL,
    `countryId` VARCHAR(191) NOT NULL,
    `population` INTEGER NOT NULL,
    `utcOffsetMin` INTEGER NOT NULL,
    `createdUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `modifiedUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `version` INTEGER NOT NULL,

    UNIQUE INDEX `City_slug_key`(`slug`),
    UNIQUE INDEX `City_nameStrId_key`(`nameStrId`),
    INDEX `City_countryId_idx`(`countryId`),
    INDEX `City_nameStrId_idx`(`nameStrId`),
    INDEX `City_slug_idx`(`slug`),
    INDEX `City_modifiedUtc_idx`(`modifiedUtc`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AcsysDraftsCity` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(256) NOT NULL,
    `nameStrId` VARCHAR(191) NOT NULL,
    `textForSearch` TEXT NOT NULL,
    `lon` VARCHAR(191) NOT NULL,
    `lat` VARCHAR(191) NOT NULL,
    `countryId` VARCHAR(191) NOT NULL,
    `population` INTEGER NOT NULL,
    `utcOffsetMin` INTEGER NOT NULL,
    `createdUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `modifiedUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `version` INTEGER NOT NULL,

    UNIQUE INDEX `AcsysDraftsCity_slug_key`(`slug`),
    UNIQUE INDEX `AcsysDraftsCity_nameStrId_key`(`nameStrId`),
    INDEX `AcsysDraftsCity_countryId_idx`(`countryId`),
    INDEX `AcsysDraftsCity_slug_idx`(`slug`),
    INDEX `AcsysDraftsCity_modifiedUtc_idx`(`modifiedUtc`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Airport` (
    `id` VARCHAR(191) NOT NULL,
    `lon` VARCHAR(191) NOT NULL,
    `lat` VARCHAR(191) NOT NULL,
    `cityId` VARCHAR(191) NOT NULL,
    `nameStrId` VARCHAR(191) NOT NULL,
    `createdUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `modifiedUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `version` INTEGER NOT NULL,

    UNIQUE INDEX `Airport_nameStrId_key`(`nameStrId`),
    INDEX `Airport_cityId_idx`(`cityId`),
    INDEX `Airport_nameStrId_idx`(`nameStrId`),
    INDEX `Airport_modifiedUtc_idx`(`modifiedUtc`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AcsysDraftsAirport` (
    `id` VARCHAR(191) NOT NULL,
    `lon` VARCHAR(191) NOT NULL,
    `lat` VARCHAR(191) NOT NULL,
    `cityId` VARCHAR(191) NOT NULL,
    `nameStrId` VARCHAR(191) NOT NULL,
    `createdUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `modifiedUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `version` INTEGER NOT NULL,

    UNIQUE INDEX `AcsysDraftsAirport_nameStrId_key`(`nameStrId`),
    INDEX `AcsysDraftsAirport_cityId_idx`(`cityId`),
    INDEX `AcsysDraftsAirport_modifiedUtc_idx`(`modifiedUtc`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CompanyReview` (
    `id` VARCHAR(191) NOT NULL,
    `headerStrId` VARCHAR(191) NOT NULL,
    `bodyStrId` VARCHAR(191) NOT NULL,
    `personNameStrId` VARCHAR(191) NOT NULL,
    `imageId` VARCHAR(191) NOT NULL,
    `createdUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `modifiedUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `version` INTEGER NOT NULL,

    UNIQUE INDEX `CompanyReview_headerStrId_key`(`headerStrId`),
    UNIQUE INDEX `CompanyReview_bodyStrId_key`(`bodyStrId`),
    UNIQUE INDEX `CompanyReview_personNameStrId_key`(`personNameStrId`),
    UNIQUE INDEX `CompanyReview_imageId_key`(`imageId`),
    INDEX `CompanyReview_modifiedUtc_idx`(`modifiedUtc`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AcsysDraftsCompanyReview` (
    `id` VARCHAR(191) NOT NULL,
    `headerStrId` VARCHAR(191) NOT NULL,
    `bodyStrId` VARCHAR(191) NOT NULL,
    `personNameStrId` VARCHAR(191) NOT NULL,
    `imageId` VARCHAR(191) NOT NULL,
    `createdUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `modifiedUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `version` INTEGER NOT NULL,

    UNIQUE INDEX `AcsysDraftsCompanyReview_headerStrId_key`(`headerStrId`),
    UNIQUE INDEX `AcsysDraftsCompanyReview_bodyStrId_key`(`bodyStrId`),
    UNIQUE INDEX `AcsysDraftsCompanyReview_personNameStrId_key`(`personNameStrId`),
    UNIQUE INDEX `AcsysDraftsCompanyReview_imageId_key`(`imageId`),
    INDEX `AcsysDraftsCompanyReview_modifiedUtc_idx`(`modifiedUtc`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AirlineCompany` (
    `id` VARCHAR(191) NOT NULL,
    `nameStrId` VARCHAR(191) NOT NULL,
    `cityId` VARCHAR(191) NOT NULL,
    `logoImageId` VARCHAR(191) NOT NULL,
    `numReviews` INTEGER NOT NULL,
    `reviewScore` VARCHAR(191) NOT NULL,
    `createdUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `modifiedUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `version` INTEGER NOT NULL,

    UNIQUE INDEX `AirlineCompany_nameStrId_key`(`nameStrId`),
    UNIQUE INDEX `AirlineCompany_cityId_key`(`cityId`),
    UNIQUE INDEX `AirlineCompany_logoImageId_key`(`logoImageId`),
    INDEX `AirlineCompany_cityId_idx`(`cityId`),
    INDEX `AirlineCompany_modifiedUtc_idx`(`modifiedUtc`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AcsysDraftsAirlineCompany` (
    `id` VARCHAR(191) NOT NULL,
    `nameStrId` VARCHAR(191) NOT NULL,
    `cityId` VARCHAR(191) NOT NULL,
    `logoImageId` VARCHAR(191) NOT NULL,
    `numReviews` INTEGER NOT NULL,
    `reviewScore` VARCHAR(191) NOT NULL,
    `createdUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `modifiedUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `version` INTEGER NOT NULL,

    UNIQUE INDEX `AcsysDraftsAirlineCompany_nameStrId_key`(`nameStrId`),
    UNIQUE INDEX `AcsysDraftsAirlineCompany_cityId_key`(`cityId`),
    UNIQUE INDEX `AcsysDraftsAirlineCompany_logoImageId_key`(`logoImageId`),
    INDEX `AcsysDraftsAirlineCompany_cityId_idx`(`cityId`),
    INDEX `AcsysDraftsAirlineCompany_modifiedUtc_idx`(`modifiedUtc`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Airplane` (
    `id` VARCHAR(191) NOT NULL,
    `nameStrId` VARCHAR(191) NOT NULL,
    `createdUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `modifiedUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `version` INTEGER NOT NULL,

    UNIQUE INDEX `Airplane_nameStrId_key`(`nameStrId`),
    INDEX `Airplane_modifiedUtc_idx`(`modifiedUtc`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AcsysDraftsAirplane` (
    `id` VARCHAR(191) NOT NULL,
    `nameStrId` VARCHAR(191) NOT NULL,
    `createdUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `modifiedUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `version` INTEGER NOT NULL,

    UNIQUE INDEX `AcsysDraftsAirplane_nameStrId_key`(`nameStrId`),
    INDEX `AcsysDraftsAirplane_modifiedUtc_idx`(`modifiedUtc`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AirplaneImage` (
    `id` VARCHAR(191) NOT NULL,
    `airplaneId` VARCHAR(191) NOT NULL,
    `imageId` VARCHAR(191) NOT NULL,
    `kind` VARCHAR(191) NOT NULL,
    `orderNum` INTEGER NOT NULL,
    `createdUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `modifiedUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `version` INTEGER NOT NULL,

    UNIQUE INDEX `AirplaneImage_imageId_key`(`imageId`),
    INDEX `AirplaneImage_airplaneId_idx`(`airplaneId`),
    INDEX `AirplaneImage_modifiedUtc_idx`(`modifiedUtc`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AcsysDraftsAirplaneImage` (
    `id` VARCHAR(191) NOT NULL,
    `airplaneId` VARCHAR(191) NOT NULL,
    `imageId` VARCHAR(191) NOT NULL,
    `kind` VARCHAR(191) NOT NULL,
    `orderNum` INTEGER NOT NULL,
    `createdUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `modifiedUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `version` INTEGER NOT NULL,

    UNIQUE INDEX `AcsysDraftsAirplaneImage_imageId_key`(`imageId`),
    INDEX `AcsysDraftsAirplaneImage_airplaneId_idx`(`airplaneId`),
    INDEX `AcsysDraftsAirplaneImage_modifiedUtc_idx`(`modifiedUtc`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MailTemplate` (
    `id` VARCHAR(191) NOT NULL,
    `kind` VARCHAR(191) NOT NULL,
    `templateStrId` VARCHAR(191) NOT NULL,
    `createdUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `modifiedUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `version` INTEGER NOT NULL,

    UNIQUE INDEX `MailTemplate_templateStrId_key`(`templateStrId`),
    INDEX `MailTemplate_modifiedUtc_idx`(`modifiedUtc`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AcsysDraftsMailTemplate` (
    `id` VARCHAR(191) NOT NULL,
    `kind` VARCHAR(191) NOT NULL,
    `templateStrId` INTEGER NOT NULL,
    `createdUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `modifiedUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `version` INTEGER NOT NULL,

    UNIQUE INDEX `AcsysDraftsMailTemplate_templateStrId_key`(`templateStrId`),
    INDEX `AcsysDraftsMailTemplate_modifiedUtc_idx`(`modifiedUtc`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VerificationToken` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `hash` VARCHAR(256) NOT NULL,
    `attemptsMade` INTEGER NOT NULL DEFAULT 0,
    `kind` VARCHAR(191) NOT NULL,
    `createdUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `modifiedUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `version` INTEGER NOT NULL,

    INDEX `VerificationToken_userId_createdUtc_idx`(`userId`, `createdUtc`),
    INDEX `VerificationToken_modifiedUtc_idx`(`modifiedUtc`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LocalizeableValue` (
    `id` VARCHAR(191) NOT NULL,
    `en` TEXT NOT NULL,
    `ru` TEXT NOT NULL,
    `fr` TEXT NOT NULL,
    `createdUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `modifiedUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `version` INTEGER NOT NULL,

    INDEX `LocalizeableValue_modifiedUtc_idx`(`modifiedUtc`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AcsysDraftsLocalizeableValue` (
    `id` VARCHAR(191) NOT NULL,
    `en` TEXT NOT NULL,
    `ru` TEXT NOT NULL,
    `fr` TEXT NOT NULL,
    `createdUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `modifiedUtc` DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `version` INTEGER NOT NULL,

    INDEX `AcsysDraftsLocalizeableValue_modifiedUtc_idx`(`modifiedUtc`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_avatarId_fkey` FOREIGN KEY (`avatarId`) REFERENCES `Image`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_coverId_fkey` FOREIGN KEY (`coverId`) REFERENCES `Image`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserEmail` ADD CONSTRAINT `UserEmail_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserEmail` ADD CONSTRAINT `UserEmail_verificationTokenId_fkey` FOREIGN KEY (`verificationTokenId`) REFERENCES `VerificationToken`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserEmail` ADD CONSTRAINT `UserEmail_changedEmailId_fkey` FOREIGN KEY (`changedEmailId`) REFERENCES `UserEmail`(`id`) ON DELETE SET NULL ON UPDATE SET NULL;

-- AddForeignKey
ALTER TABLE `Image` ADD CONSTRAINT `Image_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `ImageCategory`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Image` ADD CONSTRAINT `Image_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuthFormImage` ADD CONSTRAINT `AuthFormImage_imageId_fkey` FOREIGN KEY (`imageId`) REFERENCES `Image`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Flight` ADD CONSTRAINT `Flight_airlineCompanyId_fkey` FOREIGN KEY (`airlineCompanyId`) REFERENCES `AirlineCompany`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Flight` ADD CONSTRAINT `Flight_airplaneId_fkey` FOREIGN KEY (`airplaneId`) REFERENCES `Airplane`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Flight` ADD CONSTRAINT `Flight_departmentAirportId_fkey` FOREIGN KEY (`departmentAirportId`) REFERENCES `Airport`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Flight` ADD CONSTRAINT `Flight_arrivalAirportId_fkey` FOREIGN KEY (`arrivalAirportId`) REFERENCES `Airport`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FlightOffer` ADD CONSTRAINT `FlightOffer_departFlightId_fkey` FOREIGN KEY (`departFlightId`) REFERENCES `Flight`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FlightOffer` ADD CONSTRAINT `FlightOffer_returnFlightId_fkey` FOREIGN KEY (`returnFlightId`) REFERENCES `Flight`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StayOffer` ADD CONSTRAINT `StayOffer_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserFlightOffer` ADD CONSTRAINT `UserFlightOffer_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserFlightOffer` ADD CONSTRAINT `UserFlightOffer_offerId_fkey` FOREIGN KEY (`offerId`) REFERENCES `FlightOffer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserStayOffer` ADD CONSTRAINT `UserStayOffer_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserStayOffer` ADD CONSTRAINT `UserStayOffer_offerId_fkey` FOREIGN KEY (`offerId`) REFERENCES `StayOffer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Hotel` ADD CONSTRAINT `Hotel_cityId_fkey` FOREIGN KEY (`cityId`) REFERENCES `City`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Hotel` ADD CONSTRAINT `Hotel_nameStrId_fkey` FOREIGN KEY (`nameStrId`) REFERENCES `LocalizeableValue`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HotelDescription` ADD CONSTRAINT `HotelDescription_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HotelDescription` ADD CONSTRAINT `HotelDescription_textStrId_fkey` FOREIGN KEY (`textStrId`) REFERENCES `LocalizeableValue`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HotelReview` ADD CONSTRAINT `HotelReview_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HotelReview` ADD CONSTRAINT `HotelReview_textStrId_fkey` FOREIGN KEY (`textStrId`) REFERENCES `LocalizeableValue`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HotelReview` ADD CONSTRAINT `HotelReview_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HotelImage` ADD CONSTRAINT `HotelImage_imageId_fkey` FOREIGN KEY (`imageId`) REFERENCES `Image`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HotelImage` ADD CONSTRAINT `HotelImage_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_flightOfferId_fkey` FOREIGN KEY (`flightOfferId`) REFERENCES `UserFlightOffer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_stayOfferId_fkey` FOREIGN KEY (`stayOfferId`) REFERENCES `UserStayOffer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PopularCity` ADD CONSTRAINT `PopularCity_promoLineStrId_fkey` FOREIGN KEY (`promoLineStrId`) REFERENCES `LocalizeableValue`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PopularCity` ADD CONSTRAINT `PopularCity_travelHeaderStrId_fkey` FOREIGN KEY (`travelHeaderStrId`) REFERENCES `LocalizeableValue`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PopularCity` ADD CONSTRAINT `PopularCity_travelTextStrId_fkey` FOREIGN KEY (`travelTextStrId`) REFERENCES `LocalizeableValue`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PopularCity` ADD CONSTRAINT `PopularCity_cityId_fkey` FOREIGN KEY (`cityId`) REFERENCES `City`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PopularCityImage` ADD CONSTRAINT `PopularCityImage_imageId_fkey` FOREIGN KEY (`imageId`) REFERENCES `Image`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PopularCityImage` ADD CONSTRAINT `PopularCityImage_popularCityId_fkey` FOREIGN KEY (`popularCityId`) REFERENCES `PopularCity`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Country` ADD CONSTRAINT `Country_nameStrId_fkey` FOREIGN KEY (`nameStrId`) REFERENCES `LocalizeableValue`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `City` ADD CONSTRAINT `City_nameStrId_fkey` FOREIGN KEY (`nameStrId`) REFERENCES `LocalizeableValue`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `City` ADD CONSTRAINT `City_countryId_fkey` FOREIGN KEY (`countryId`) REFERENCES `Country`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Airport` ADD CONSTRAINT `Airport_cityId_fkey` FOREIGN KEY (`cityId`) REFERENCES `City`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Airport` ADD CONSTRAINT `Airport_nameStrId_fkey` FOREIGN KEY (`nameStrId`) REFERENCES `LocalizeableValue`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanyReview` ADD CONSTRAINT `CompanyReview_headerStrId_fkey` FOREIGN KEY (`headerStrId`) REFERENCES `LocalizeableValue`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanyReview` ADD CONSTRAINT `CompanyReview_bodyStrId_fkey` FOREIGN KEY (`bodyStrId`) REFERENCES `LocalizeableValue`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanyReview` ADD CONSTRAINT `CompanyReview_personNameStrId_fkey` FOREIGN KEY (`personNameStrId`) REFERENCES `LocalizeableValue`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanyReview` ADD CONSTRAINT `CompanyReview_imageId_fkey` FOREIGN KEY (`imageId`) REFERENCES `Image`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AirlineCompany` ADD CONSTRAINT `AirlineCompany_nameStrId_fkey` FOREIGN KEY (`nameStrId`) REFERENCES `LocalizeableValue`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AirlineCompany` ADD CONSTRAINT `AirlineCompany_cityId_fkey` FOREIGN KEY (`cityId`) REFERENCES `City`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AirlineCompany` ADD CONSTRAINT `AirlineCompany_logoImageId_fkey` FOREIGN KEY (`logoImageId`) REFERENCES `Image`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Airplane` ADD CONSTRAINT `Airplane_nameStrId_fkey` FOREIGN KEY (`nameStrId`) REFERENCES `LocalizeableValue`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AirplaneImage` ADD CONSTRAINT `AirplaneImage_airplaneId_fkey` FOREIGN KEY (`airplaneId`) REFERENCES `Airplane`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AirplaneImage` ADD CONSTRAINT `AirplaneImage_imageId_fkey` FOREIGN KEY (`imageId`) REFERENCES `Image`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MailTemplate` ADD CONSTRAINT `MailTemplate_templateStrId_fkey` FOREIGN KEY (`templateStrId`) REFERENCES `LocalizeableValue`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VerificationToken` ADD CONSTRAINT `VerificationToken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
