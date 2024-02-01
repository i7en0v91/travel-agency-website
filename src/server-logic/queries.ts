import { type CSSProperties } from 'vue';
import { Prisma } from '@prisma/client';
import { destr } from 'destr';
import orderBy from 'lodash/orderBy';
import { type IUserMinimalInfo, type IUserProfileInfo, type IUserEmailInfo, type IImageInfo, type IFileInfo, AuthProvider, ImageCategory } from '../shared/interfaces';
import { parseEnumOrThrow } from './../shared/common';

export class Queries {
  public static readonly FileInfoQuery = {
    select: {
      id: true,
      mime: true,
      originalName: true,
      createdUtc: true,
      modifiedUtc: true,
      isDeleted: true
    }
  };

  public static readonly ImageInfoQuery = {
    select: {
      id: true,
      slug: true,
      stubCssStyle: true,
      category: { select: { kind: true } },
      file: Queries.FileInfoQuery
    }
  };

  public static readonly EmailVerificationTokenInfoQuery = {
    select: {
      id: true,
      attemptsMade: true,
      createdUtc: true,
      isDeleted: true
    }
  };

  public static readonly UserEmailInfoQuery = {
    include: {
      verificationToken: Queries.EmailVerificationTokenInfoQuery
    },
    where: {
      isDeleted: false,
      newEmails: {
        none: {
          id: {
            gt: 0
          }
        }
      }
    }
  };

  public static readonly UserMinimalQuery = {
    select: {
      id: true,
      passwordHash: true,
      createdUtc: true,
      modifiedUtc: true,
      emails: Queries.UserEmailInfoQuery,
      authProvider: true,
      providerIdentity: true,
      passwordSalt: true,
      firstName: true,
      lastName: true
    }
  };

  public static UserProfileQuery = {
    select: {
      ...this.UserMinimalQuery.select,
      cover: Queries.ImageInfoQuery,
      avatar: Queries.ImageInfoQuery
    }
  };
}

const QFileInfo = Prisma.validator<Prisma.FileDefaultArgs>()(Queries.FileInfoQuery);
type TFileInfo = Prisma.FileGetPayload<typeof QFileInfo>;
const QImageInfo = Prisma.validator<Prisma.UserDefaultArgs>()(Queries.ImageInfoQuery);
type TImageInfo = Prisma.ImageGetPayload<typeof QImageInfo>;
const QUserEmailInfo = Prisma.validator<Prisma.UserEmailDefaultArgs>()(Queries.UserEmailInfoQuery);
type TUserEmailInfo = Prisma.UserEmailGetPayload<typeof QUserEmailInfo>;
const QUserMinimal = Prisma.validator<Prisma.UserDefaultArgs>()(Queries.UserMinimalQuery);
type TUserMinimal = Prisma.UserGetPayload<typeof QUserMinimal>;
const QUserProfile = Prisma.validator<Prisma.UserDefaultArgs>()(Queries.UserProfileQuery);
type TUserProfile = Prisma.UserGetPayload<typeof QUserProfile>;

export class Mappers {
  static MapUserEmail = function (userEmail: TUserEmailInfo): IUserEmailInfo {
    return {
      id: userEmail.id,
      createdUtc: userEmail.createdUtc,
      email: userEmail.email,
      isDeleted: userEmail.isDeleted,
      isVerified: userEmail.isVerified,
      modifiedUtc: userEmail.modifiedUtc,
      order: userEmail.order,
      verificationToken: userEmail.verificationToken
        ? {
            attemptsMade: userEmail.verificationToken?.attemptsMade,
            createdUtc: userEmail.verificationToken.createdUtc,
            id: userEmail.verificationToken.id,
            isDeleted: userEmail.verificationToken.isDeleted
          }
        : undefined
    };
  };

  static MapUserEntityMinimal = function<T extends TUserMinimal> (user: T): IUserMinimalInfo {
    return {
      id: user.id,
      authProvider: parseEnumOrThrow(AuthProvider, user.authProvider),
      providerIdentity: user.providerIdentity,
      isDeleted: false,
      passwordHash: user.passwordHash ?? undefined,
      passwordSalt: user.passwordSalt ?? undefined,
      createdUtc: user.createdUtc,
      modifiedUtc: user.modifiedUtc,
      emails: orderBy(user.emails.map(Mappers.MapUserEmail), ['order'], ['asc']),
      firstName: user.firstName ?? undefined,
      lastName: user.lastName ?? undefined
    };
  };

  static MapUserEntityProfile = function<T extends TUserProfile> (user: T): IUserProfileInfo {
    const userMinimal = Mappers.MapUserEntityMinimal(user);
    return {
      avatar: (user.avatar && !user.avatar.file.isDeleted) ? Mappers.MapImageInfo(user.avatar) : undefined,
      cover: (user.cover && !user.cover.file.isDeleted) ? Mappers.MapImageInfo(user.cover) : undefined,
      ...userMinimal
    };
  };

  static MapFileInfo = function (fileInfo: TFileInfo): IFileInfo {
    return {
      id: fileInfo.id,
      createdUtc: fileInfo.createdUtc,
      modifiedUtc: fileInfo.modifiedUtc,
      isDeleted: false,
      mime: fileInfo.mime ?? undefined,
      originalName: fileInfo.originalName ?? undefined
    };
  };

  static mapCssJson = (cssJson: string): CSSProperties => {
    return destr<any>(cssJson) as CSSProperties;
  };

  static MapImageInfo = function (imageInfo: TImageInfo): IImageInfo {
    return {
      id: imageInfo.id,
      category: parseEnumOrThrow(ImageCategory, imageInfo.category.kind),
      file: Mappers.MapFileInfo(imageInfo.file),
      slug: imageInfo.slug,
      stubCssStyle: imageInfo.stubCssStyle ? Mappers.mapCssJson(imageInfo.stubCssStyle.toString()) : undefined
    };
  };
}
