import type { PrismaClient } from '@prisma/client';
import dayjs from 'dayjs';
import groupBy from 'lodash-es/groupBy';
import values from 'lodash-es/values';
import { type IUserProfileInfo, type UserResponseDataSet, type RegisterVerificationFlow, type RegisterUserByEmailResponse, type IUserLogic, AuthProvider, type IUserMinimalInfo, type IImageLogic, type ITokenLogic, type IEmailSender, TokenKind, type IEmailParams, EmailTemplate, type PasswordRecoveryResult, type EntityId, ImageCategory, type IImageBytesProvider, type Timestamp, type UpdateUserAccountResult } from '../shared/interfaces';
import { type IAppLogger } from '../shared/applogger';
import { isPasswordSecure } from '../shared/common';
import { DbVersionInitial, type Locale, type Theme, SecretValueMask, DefaultEmailTheme, DefaultLocale } from '../shared/constants';
import { maskLog } from '../shared/applogger';
import { getI18nResName3 } from '../shared/i18n';
import { AppException, AppExceptionCodeEnum } from '../shared/exceptions';
import AppConfig from '../appconfig';
import { MapUserEntityMinimal, UserProfileQuery, MapUserEntityProfile, UserMinimalQuery } from './queries';
import { type IServerI18n } from './helpers/i18n';
import { mapEnumValue, obtainFreeSlug } from './helpers/db';
import { calculatePasswordHash, getSomeSalt, verifyPassword } from './helpers/crypto';

export class UserLogic implements IUserLogic {
  private logger: IAppLogger;
  private dbRepository: PrismaClient;
  private tokenLogic: ITokenLogic;
  private emailSender: IEmailSender;
  private serverI18n: IServerI18n;
  private imageLogic: IImageLogic;
  private imageBytesProvider: IImageBytesProvider;

  public static inject = ['logger', 'imageLogic', 'imageBytesProvider', 'tokenLogic', 'emailSender', 'serverI18n', 'dbRepository'] as const;
  constructor (logger: IAppLogger, imageLogic: IImageLogic, imageBytesProvider: IImageBytesProvider, tokenLogic: ITokenLogic, emailSender: IEmailSender, serverI18n: IServerI18n, dbRepository: PrismaClient) {
    this.logger = logger;
    this.dbRepository = dbRepository;
    this.tokenLogic = tokenLogic;
    this.emailSender = emailSender;
    this.serverI18n = serverI18n;
    this.imageLogic = imageLogic;
    this.imageBytesProvider = imageBytesProvider;
  }

  updateUserAccount = async (userId: EntityId, firstName?: string | undefined, lastName?: string | undefined, password?: string | undefined, emails?: string[] | undefined, theme?: Theme, locale?: Locale): Promise<UpdateUserAccountResult> => {
    const logParams = `userId=${userId}, firstName=${firstName !== undefined ? maskLog(firstName) : '[skip]'}, lastName=${lastName !== undefined ? maskLog(lastName) : '[skip]'}, password=${password !== undefined ? SecretValueMask : '[skip]'}, ${emails !== undefined ? ((emails.length ?? 0).toString() + ' emails') : '[skip]'}, locale=${locale ?? '[none]'}`;
    this.logger.info(`(UserLogic) updating user account: ${logParams}`);
    locale ??= DefaultLocale;

    const emailingEnabled = AppConfig.email;
    let isAutoVerified: boolean | undefined = emailingEnabled ? false : undefined;

    const userInfo = await this.getUser(userId, 'minimal');
    if (!userInfo) {
      this.logger.warn(`(UserLogic) cannot update user account - user was not found: ${logParams}`);
      throw new AppException(AppExceptionCodeEnum.OBJECT_NOT_FOUND, 'user was not found', 'error-page');
    }

    if (password !== undefined && !isPasswordSecure(password)) {
      this.logger.warn(`(UserLogic) cannot update user account - password is insecure: ${logParams}`);
      throw new AppException(AppExceptionCodeEnum.BAD_REQUEST, 'password is insecure', 'error-stub');
    }

    if (userInfo.authProvider === AuthProvider.Email && emails !== undefined && emails.length === 0) {
      this.logger.info(`(UserLogic) cannot remove last email from Email user with auth provider: ${logParams}`);
      return 'deleting-last-email';
    }

    if ((emails?.length ?? 0) > AppConfig.maxUserEmailsCount) {
      this.logger.warn(`(UserLogic) cannot update user account - maximum number of allowed emails limit exceeded: ${logParams}`);
      throw new AppException(AppExceptionCodeEnum.BAD_REQUEST, 'maximum emails count limit exceeded', 'error-stub');
    }

    const hasDuplicates = emails !== undefined && values(groupBy(emails)).some(v => v.length > 1);
    if (hasDuplicates) {
      this.logger.info(`(UserLogic) cannot update user account - email duplicates detected: ${logParams}`);
      return 'email-already-exists';
    }

    const emailIdsToDelete = emails !== undefined ? userInfo.emails.filter(ue => !ue.isDeleted && !emails.includes(ue.email)).map(e => e.id) : undefined;
    const emailsToAdd = emails !== undefined ? emails.filter(e => e.length > 0 && !userInfo.emails.some(ue => !ue.isDeleted && ue.email === e)) : undefined;
    if ((emailsToAdd?.length ?? 0) > 1) {
      this.logger.warn(`(UserLogic) cannot update user account - too many changes in emails: ${logParams}`);
      throw new AppException(AppExceptionCodeEnum.BAD_REQUEST, 'too many emails', 'error-stub');
    }
    const emailToAdd = ((emailsToAdd?.length ?? 0) > 0) ? emailsToAdd![0] : undefined;
    let changedEmailId: EntityId | undefined;
    if (emailToAdd) {
      const emailAlreadyExists = await this.dbRepository.userEmail.count({
        where: {
          isDeleted: false,
          email: emailToAdd
        }
      }) > 0;
      if (emailAlreadyExists) {
        this.logger.info(`(UserLogic) cannot update user account - adding email already exists: ${logParams}`);
        return 'email-already-exists';
      }

      this.logger.verbose(`(UserLogic) adding new email to user account: userId=${userId}, email=${maskLog(emailToAdd)}, emailingEnambed=${emailingEnabled}`);
      changedEmailId = ((emailIdsToDelete?.length === 1) && emailToAdd) ? emailIdsToDelete[0] : undefined;
      isAutoVerified = !emailingEnabled;
      const newEmailEntity = await this.dbRepository.userEmail.create({
        data: {
          email: emailToAdd,
          order: ((userInfo.emails?.length ?? 0) > 0 ? Math.max(...userInfo.emails.map(x => x.order)) : 0) + 1,
          version: DbVersionInitial,
          isVerified: isAutoVerified,
          user: {
            connect: {
              id: userId
            }
          },
          ...(changedEmailId
            ? {
                changedEmail: {
                  connect: {
                    id: changedEmailId
                  }
                }
              }
            : {}),
          isDeleted: false
        },
        select: {
          id: true
        }
      });

      if (emailingEnabled) {
        try {
          await this.sendConfirmationEmail(userId, newEmailEntity.id, emailToAdd, locale, TokenKind.EmailVerify, theme ?? DefaultEmailTheme);
        } catch (err: any) {
          this.logger.warn(`(UserLogic) failed to send verification for newly addded email: id=${userId}, email=${maskLog(emailToAdd)}`, err);
          await this.dbRepository.userEmail.delete({ where: { id: newEmailEntity.id } });
          throw err;
        }
      }
    }

    this.logger.verbose(`(UserLogic) updating user account data: ${logParams}`);
    await this.dbRepository.$transaction(async () => {
      if ((emailIdsToDelete?.length ?? 0) > 0) {
        const deleteEmailWithEditChain = async (emailId: EntityId): Promise<void> => {
          let deletingId : EntityId | undefined = emailId;
          while (deletingId) {
            this.logger.debug(`(UserLogic) updating user account data - deleting email in chain: userId=${userId}, emailId=${deletingId}, originalEmailId=${emailId}`);
            deletingId = (await this.dbRepository.userEmail.update({
              where: {
                id: deletingId
              },
              data: {
                isDeleted: true,
                modifiedUtc: dayjs().utc().toDate(),
                version: { increment: 1 }
              },
              select: {
                changedEmailId: true
              }
            }))?.changedEmailId ?? undefined;
          }
        };

        if (changedEmailId) {
          if (isAutoVerified) {
            this.logger.debug(`(UserLogic) updating user account data - deleting emails in autoverified email edit chain: userId=${userId}, emailIds=[${emailIdsToDelete?.join(', ')}]`);
            for (let i = 0; i < emailIdsToDelete!.length; i++) {
              await deleteEmailWithEditChain(emailIdsToDelete![i]);
            }
          } else {
            this.logger.debug(`(UserLogic) updating user account data - marking changed unverified email deleted: userId=${userId}, emailId=${changedEmailId}`);
            await this.dbRepository.userEmail.updateMany({
              where: {
                id: changedEmailId,
                isVerified: false,
                isDeleted: false
              },
              data: {
                isDeleted: true,
                modifiedUtc: dayjs().utc().toDate(),
                version: { increment: 1 }
              }
            });
          }
        } else {
          this.logger.debug(`(UserLogic) updating user account data - delete emails: userId=${userId}, emailIds=[${emailIdsToDelete?.join(', ')}]`);
          for (let i = 0; i < emailIdsToDelete!.length; i++) {
            await deleteEmailWithEditChain(emailIdsToDelete![i]);
          }
        }
      }

      if (password !== undefined) {
        this.logger.debug(`(UserLogic) updating user account data - set password, userId=${userId}`);
        await this.setUserPassword(userId, password);
      }

      if (firstName !== undefined || lastName !== undefined) {
        this.logger.debug(`(UserLogic) updating user account data - first/last name, userId=${userId}`);
        await this.dbRepository.user.update({
          where: {
            id: userId,
            isDeleted: false
          },
          data: {
            version: { increment: 1 },
            modifiedUtc: dayjs().utc().toDate(),
            ...(firstName !== undefined ? { firstName } : {}),
            ...(lastName !== undefined ? { lastName } : {})
          }
        });
      }
    });

    this.logger.info(`(UserLogic) user account updated: ${logParams}`);
    return isAutoVerified ? 'email-autoverified' : 'success';
  };

  uploadUserImage = async (userId: EntityId, category: ImageCategory, bytes: Buffer, mimeType: string, fileName?: string): Promise<{ id: EntityId, slug: string, timestamp: Timestamp }> => {
    this.logger.info(`(UserLogic) uploading user image: userId=${userId}, category=${category}, length=${bytes.length}, mimeType=${mimeType}, fileName=${fileName}`);

    const userFilterQuery = {
      isDeleted: false,
      id: userId
    };
    const userImagesInfo = await this.dbRepository.user.findUnique({
      where: userFilterQuery,
      select: {
        version: true,
        cover: {
          select: {
            id: true,
            slug: true,
            file: {
              select: {
                id: true,
                isDeleted: true
              }
            }
          }
        },
        avatar: {
          select: {
            id: true,
            slug: true,
            file: {
              select: {
                id: true,
                isDeleted: true
              }
            }
          }
        }
      }
    });
    if (!userImagesInfo) {
      this.logger.warn(`(UserLogic) cannot upload image - user was not found: id=${userId}`);
      throw new AppException(AppExceptionCodeEnum.OBJECT_NOT_FOUND, 'user was not found', 'error-page');
    }

    let targetCategoryImageInfo: { imageId: EntityId, fileId: EntityId, slug: string, isDeleted: boolean } | undefined;
    const mapImageInfo = (dbInfo: { id: EntityId, slug: string, file: { id: EntityId, isDeleted: boolean } }): { imageId: EntityId, fileId: EntityId, slug: string, isDeleted: boolean } => {
      return { imageId: dbInfo.id, fileId: dbInfo.file.id, slug: dbInfo.slug, isDeleted: dbInfo.file.isDeleted };
    };
    switch (category) {
      case ImageCategory.UserAvatar:
        targetCategoryImageInfo = userImagesInfo.avatar ? mapImageInfo(userImagesInfo.avatar) : undefined;
        break;
      case ImageCategory.UserCover:
        targetCategoryImageInfo = userImagesInfo.cover ? mapImageInfo(userImagesInfo.cover) : undefined;
        break;
      default:
        this.logger.warn(`(UserLogic) unexpected uploading image category: userId=${userId}, category=${category}`);
        throw new AppException(AppExceptionCodeEnum.BAD_REQUEST, 'unexpected category', 'error-page');
    }

    let slug = targetCategoryImageInfo?.slug;
    if ((fileName?.length ?? 0) > 0) {
      if (targetCategoryImageInfo) {
        slug = await obtainFreeSlug([fileName!], async (testSlug: string) => {
          return (await this.dbRepository.image.count({
            where: {
              AND: [
                { slug: testSlug }, { NOT: { id: targetCategoryImageInfo!.imageId } }
              ]
            }
          })) > 0;
        }, 1);
      } else {
        slug = await obtainFreeSlug([fileName!], async (testSlug: string) => {
          return (await this.dbRepository.image.count({ where: { slug: testSlug } })) > 0;
        }, 1);
      }
    }
    if (!slug) {
      let imgTypeSlug = 'img';
      switch (category) {
        case ImageCategory.UserAvatar:
          imgTypeSlug = 'avatar';
          break;
        case ImageCategory.UserCover:
          imgTypeSlug = 'cover';
          break;
      }
      slug = await obtainFreeSlug(['user', userId.toString(), imgTypeSlug], async (testSlug: string) => {
        return (await this.dbRepository.image.count({ where: { slug: testSlug } })) > 0;
      });
    }

    const imageFileId = targetCategoryImageInfo && !targetCategoryImageInfo.isDeleted ? targetCategoryImageInfo.fileId : undefined;
    let imageId: EntityId | undefined;
    let timestamp: Timestamp = 0;
    if (imageFileId) {
      this.logger.verbose(`(UserLogic) updating existing image: imageId=${targetCategoryImageInfo!.imageId}, fileId=${imageFileId}, slug=${slug}, userId=${userId}, length=${bytes.length}, fileName=${fileName}`);
      imageId = targetCategoryImageInfo!.imageId;
      const queryResult = await this.imageLogic.updateImage(targetCategoryImageInfo!.imageId, {
        bytes,
        originalName: fileName,
        slug,
        mimeType
      }, imageFileId);
      timestamp = queryResult.timestamp;

      await this.imageBytesProvider.clearImageCache(targetCategoryImageInfo!.imageId, category);
      if (slug) {
        await this.imageBytesProvider.clearImageCache(slug, category);
      }
    } else {
      this.logger.verbose(`(UserLogic) creating new image file: slug=${slug}, userId=${userId}, category=${category}, length=${bytes.length}, fileName=${fileName}`);
      await this.dbRepository.$transaction(async () => {
        const queryResult = await this.imageLogic.createImage({
          bytes,
          originalName: fileName,
          slug: slug!,
          category,
          ownerId: userId,
          mimeType,
          stubCssStyle: undefined,
          invertForDarkTheme: false
        });
        timestamp = queryResult.timestamp;
        imageId = queryResult.id;

        await this.dbRepository.user.update({
          where: userFilterQuery,
          data: {
            modifiedUtc: dayjs().utc().toDate(),
            version: { increment: 1 },
            cover: category === ImageCategory.UserCover
              ? {
                  connect: {
                    id: imageId
                  }
                }
              : undefined,
            avatar: category === ImageCategory.UserAvatar
              ? {
                  connect: {
                    id: imageId
                  }
                }
              : undefined
          }
        });
      });
    }

    this.logger.info(`(UserLogic) user image uploaded: imageId=${imageId}, slug=${slug}, userId=${userId}, length=${bytes.length}, fileName=${fileName}`);
    return {
      id: imageId!,
      slug: slug!,
      timestamp
    };
  };

  setUserPassword = async (userId: EntityId, password: string): Promise<void> => {
    this.logger.info(`(UserLogic) setting user password: id=${userId}`);

    if (!isPasswordSecure(password)) {
      this.logger.warn('(UserLogic) cannot set password, its insecure');
      throw new AppException(AppExceptionCodeEnum.BAD_REQUEST, 'password is insecure', 'error-stub');
    }

    const passwordSalt = getSomeSalt();
    const updateResult = await this.dbRepository.user.updateMany({
      where: { id: userId, isDeleted: false },
      data: {
        passwordHash: calculatePasswordHash(`${passwordSalt}${password}`),
        passwordSalt,
        modifiedUtc: dayjs().utc().toDate()
      }
    });
    if (updateResult.count === 0) {
      this.logger.warn(`(UserLogic) seems like users doesnt exist in DB or is deleted: id=${userId}`);
      throw new AppException(AppExceptionCodeEnum.OBJECT_NOT_FOUND, 'user not found', 'error-page');
    }

    this.logger.info(`(UserLogic) user password set: id=${userId}`);
  };

  verifyUserPassword = async (email: string, password: string): Promise<IUserMinimalInfo | undefined> => {
    email = email.trim();
    this.logger.verbose(`(UserLogic) verifying user password: email=${maskLog(email)}`);

    const userEntity = await this.findUserByEmail(email, true, 'profile');
    if (!userEntity) {
      this.logger.verbose(`(UserLogic) password was not verified as user with specified email was not found or email hasn't been verified yet, email=${maskLog(email)}`);
      return undefined;
    }

    if (!userEntity.passwordHash || !userEntity.passwordSalt) {
      // password was not set - this may happen in case third-paty auth provider was used for creating user's profile
      this.logger.verbose(`(UserLogic) password was not verified as password hasn't been setup for the user profile, email=${maskLog(email)}`);
      return undefined;
    }

    if (!verifyPassword(password, userEntity.passwordSalt, userEntity.passwordHash)) {
      this.logger.verbose(`(UserLogic) password verification failed, email=${maskLog(email)}`);
      return undefined;
    }

    return userEntity;
  };

  registerUserByEmail = async (email: string, password: string, verification: RegisterVerificationFlow, firstName?: string | undefined, lastName?: string | undefined, theme?: Theme, locale?: Locale): Promise<RegisterUserByEmailResponse> => {
    email = email.trim();
    this.logger.info(`(UserLogic) registering user by email: email=${maskLog(email)}, verification=${verification}, firstName=${maskLog(firstName)}, lastName=${maskLog(lastName)}, theme=${theme}, locale=${locale}`);
    locale ??= DefaultLocale;

    const isUserRegistrationLinkExpired = (userInfo: IUserMinimalInfo) => {
      if (userInfo.authProvider !== AuthProvider.Email) {
        return false;
      }
      if (userInfo.emails.length !== 1) {
        return false;
      }
      const verificationToken = userInfo.emails[0].verificationToken;
      if (!verificationToken) {
        return true;
      }
      if (this.tokenLogic.isTokenActive(verificationToken.isDeleted, verificationToken.attemptsMade, verificationToken.createdUtc) === 'token-expired') {
        return true;
      }
      return false;
    };

    const existingUser = await this.findUserByEmail(email, false, 'minimal');
    if (existingUser) {
      if (isUserRegistrationLinkExpired(existingUser)) {
        this.logger.info(`(UserLogic) previous user registration expired, removing old user: id=${existingUser.id}, createdUtc=${existingUser.createdUtc}, email=${maskLog(email)}`);
        await this.dbRepository.user.delete({ where: { id: existingUser.id } });
      } else {
        this.logger.warn(`(UserLogic) cannot register user by email as it is already exists, email=${maskLog(email)}`);
        return 'already-exists';
      }
    }

    if (!isPasswordSecure(password)) {
      this.logger.warn('(UserLogic) cannot register user by email as provided password is not secure');
      return 'insecure-password';
    }

    const passwordSalt = getSomeSalt();
    const userEntity = await this.dbRepository.user.create({
      data: {
        authProvider: 'EMAIL',
        providerIdentity: email,
        version: DbVersionInitial,
        firstName: firstName ?? null,
        lastName: lastName ?? null,
        passwordSalt,
        passwordHash: calculatePasswordHash(`${passwordSalt}${password}`),
        emails: {
          create: {
            email,
            order: 0,
            version: DbVersionInitial,
            isVerified: verification === 'verified'
          }
        }
      },
      select: {
        id: true,
        emails: true
      }
    });

    if (verification === 'send-email') {
      try {
        const userEmailId = userEntity.emails[0].id;
        await this.sendConfirmationEmail(userEntity.id, userEmailId, email, locale, TokenKind.RegisterAccount, theme ?? DefaultEmailTheme);
      } catch (err: any) {
        this.logger.warn(`(UserLogic) failed to send registration verification email to user: id=${userEntity.id}, email=${maskLog(email)}`, err);
        await this.dbRepository.user.delete({ where: { id: userEntity.id } });
        throw err;
      }
    }

    this.logger.info(`(UserLogic) user registered by email successfully: id=${userEntity.id}, email=${maskLog(email)}`);
    return userEntity.id;
  };

  sendConfirmationEmail = async (userId: EntityId, userEmailId: EntityId, email: string, locale: Locale, kind: TokenKind.RegisterAccount | TokenKind.EmailVerify, theme?: Theme): Promise<void> => {
    this.logger.verbose(`(UserLogic) sending email to user: userId=${userId}, email=${maskLog(email)}, emailId=${userEmailId}, theme=${theme}, locale=${locale}, kind=${kind}`);
    const tokenData = await this.tokenLogic.issueToken(kind, userId, false);
    const emailParams : IEmailParams = {
      locale,
      subject: this.serverI18n.getLocalizedResource(getI18nResName3('emails', kind === TokenKind.RegisterAccount ? 'registerAccount' : 'emailVerify', 'subject'), locale),
      title: this.serverI18n.getLocalizedResource(getI18nResName3('emails', kind === TokenKind.RegisterAccount ? 'registerAccount' : 'emailVerify', 'title'), locale),
      to: email,
      token: tokenData,
      userId,
      theme: theme ?? DefaultEmailTheme
    };
    await this.emailSender.sendEmail(kind === TokenKind.RegisterAccount ? EmailTemplate.RegisterAccount : EmailTemplate.EmailVerify, emailParams);
    await this.dbRepository.userEmail.update({
      where: { id: userEmailId },
      data: {
        verificationToken: {
          connect: {
            id: tokenData.id
          }
        }
      }
    });
    this.logger.verbose(`(UserLogic) email sent to user: userId=${userId}, email=${maskLog(email)}, emailId=${userEmailId}, theme=${theme}, locale=${locale}, kind=${kind}`);
  };

  getUser = async <TDataSet extends keyof UserResponseDataSet>(userId: EntityId, dataSet: TDataSet): Promise<UserResponseDataSet[TDataSet] | undefined> => {
    this.logger.verbose(`(UserLogic) get user: id=${userId}, dataSet=${dataSet}`);

    const filterQuery = {
      isDeleted: false,
      id: userId
    };

    if (dataSet === 'profile') {
      const userProfileQuery = {
        where: filterQuery,
        select: UserProfileQuery.select
      };
      const userEntity = await this.dbRepository.user.findFirst(userProfileQuery);
      if (!userEntity) {
        this.logger.warn(`(UserLogic) get user - not found: id=${userId}, dataSet=${dataSet}`);
        return undefined;
      }

      this.logger.verbose(`(UserLogic) get user - found: id=${userId}}`);
      return MapUserEntityProfile(userEntity);
    } else {
      const userMinimalQuery = {
        where: filterQuery,
        select: UserMinimalQuery.select
      };
      const userEntity = await this.dbRepository.user.findFirst(userMinimalQuery);
      if (!userEntity) {
        this.logger.warn(`(UserLogic) get user - not found: id=${userId}, dataSet=${dataSet}`);
        return undefined;
      }

      this.logger.verbose(`(UserLogic) get user - found: id=${userId}}`);
      return MapUserEntityMinimal(userEntity);
    }
  };

  findUser = async <TDataSet extends keyof UserResponseDataSet>(
    authProvider: AuthProvider, providerIdentity: string, dataSet: TDataSet): Promise<UserResponseDataSet[TDataSet] | undefined> => {
    this.logger.verbose(`(UserLogic) finding user: authProvider=${authProvider}, providerIdentity=${providerIdentity}, dataSet=${dataSet}`);
    if (dataSet === 'profile') {
      const userProfileQuery = {
        where: {
          authProvider: mapEnumValue(authProvider),
          providerIdentity,
          isDeleted: false
        },
        select: UserProfileQuery.select
      };
      const userEntity = await this.dbRepository.user.findFirst(userProfileQuery);
      if (!userEntity) {
        this.logger.verbose(`(UserLogic) user not found: authProvider=${authProvider}, providerIdentity=${providerIdentity}`);
        return undefined;
      }

      this.logger.verbose(`(UserLogic) user found: id=${userEntity.id}, authProvider=${authProvider}, providerIdentity=${providerIdentity}`);
      return MapUserEntityProfile(userEntity);
    } else {
      const userMinimalQuery = {
        where: {
          authProvider: mapEnumValue(authProvider),
          providerIdentity,
          isDeleted: false
        },
        select: UserMinimalQuery.select
      };
      const userEntity = await this.dbRepository.user.findFirst(userMinimalQuery);
      if (!userEntity) {
        this.logger.verbose(`(UserLogic) user not found: authProvider=${authProvider}, providerIdentity=${providerIdentity}`);
        return undefined;
      }

      this.logger.verbose(`(UserLogic) user found: id=${userEntity.id}, authProvider=${authProvider}, providerIdentity=${providerIdentity}`);
      return MapUserEntityMinimal(userEntity);
    }
  };

  findUserByEmail = async <TDataSet extends keyof UserResponseDataSet>(
    email: string, mustBeVerified: boolean, dataSet: TDataSet): Promise<UserResponseDataSet[TDataSet] | undefined> => {
    this.logger.verbose(`(UserLogic) finding user by email: email=${maskLog(email)}, mustBeVerified=${mustBeVerified}, dataSet=${dataSet}`);

    const filterQuery = {
      isDeleted: false,
      emails: {
        some: {
          email,
          isDeleted: false,
          ...{ isVerified: mustBeVerified ? true : undefined }
        }
      }
    };

    if (dataSet === 'profile') {
      const userProfileQuery = {
        where: filterQuery,
        select: UserProfileQuery.select
      };
      const userEntity = await this.dbRepository.user.findFirst(userProfileQuery);
      if (!userEntity) {
        this.logger.verbose(`(UserLogic) user not found: email=${maskLog(email)}, mustBeVerified=${mustBeVerified}, dataSet=${dataSet}`);
        return undefined;
      }

      this.logger.verbose(`(UserLogic) user found: id=${userEntity.id}, email=${maskLog(email)}, mustBeVerified=${mustBeVerified}`);
      return MapUserEntityProfile(userEntity);
    } else {
      const userMinimalQuery = {
        where: filterQuery,
        select: UserMinimalQuery.select
      };
      const userEntity = await this.dbRepository.user.findFirst(userMinimalQuery);
      if (!userEntity) {
        this.logger.verbose(`(UserLogic) user not found: email=${maskLog(email)}, mustBeVerified=${mustBeVerified}, dataSet=${dataSet}`);
        return undefined;
      }

      this.logger.verbose(`(UserLogic) user found: id=${userEntity.id}, email=${maskLog(email)}, mustBeVerified=${mustBeVerified}`);
      return MapUserEntityMinimal(userEntity);
    }
  };

  ensureOAuthUser = async (authProvider: AuthProvider, providerIdentity: string, firstName?: string, lastName?: string, email?: string, emailVerified?: boolean): Promise<IUserProfileInfo> => {
    this.logger.info(`(UserLogic) ensuring oauth user: authProvider=${authProvider}, providerIdentity=${providerIdentity}, email=${maskLog(email)}, emailVerified=${emailVerified}, firstName=${maskLog(firstName)}, lastName=${maskLog(lastName)}`);
    if (authProvider === AuthProvider.Email) {
      throw new Error(`Provider [${AuthProvider.Email}] is not considered as OAuth`);
    }

    const filterQuery = {
      isDeleted: false,
      authProvider: mapEnumValue(authProvider),
      providerIdentity
    };

    const userProfileQuery = {
      where: filterQuery,
      select: UserProfileQuery.select
    };
    const userEntity = await this.dbRepository.user.findFirst(userProfileQuery);
    if (userEntity) {
      this.logger.verbose(`(UserLogic) oauth user found: id=${userEntity.id}, authProvider=${authProvider}, providerIdentity=${providerIdentity}`);
      return MapUserEntityProfile(userEntity);
    }

    this.logger.info(`(UserLogic) oauth user not found, creating new: authProvider=${authProvider}, providerIdentity=${providerIdentity}, email=${maskLog(email)}, emailVerified=${emailVerified}, firstName=${maskLog(firstName)}, lastName=${maskLog(lastName)}`);
    const emails = email
      ? {
          create: [{
            email,
            order: 0,
            version: DbVersionInitial,
            isVerified: emailVerified
          }]
        }
      : undefined;
    const newUserEntity = await this.dbRepository.user.create({
      data: {
        authProvider: mapEnumValue(authProvider),
        providerIdentity,
        version: DbVersionInitial,
        emails,
        firstName,
        lastName
      },
      select: UserMinimalQuery.select
    });

    const result: IUserProfileInfo = MapUserEntityMinimal(newUserEntity);
    this.logger.info(`(UserLogic) new oauth user created: id=${result.id}, authProvider=${authProvider}, providerIdentity=${providerIdentity}`);

    return result;
  };

  recoverUserPassword = async (email: string, theme?: Theme, locale?: Locale): Promise<PasswordRecoveryResult> => {
    this.logger.info(`(UserLogic) recovering user password: email=${maskLog(email)}, theme=${theme}, locale=${locale}`);
    locale ??= DefaultLocale;

    try {
      const userEntity = await this.findUserByEmail(email, false, 'minimal');
      if (!userEntity) {
        this.logger.info(`(UserLogic) cannot find user by specified email to recover password, email=${maskLog(email)}`);
        return 'user-not-found';
      }

      // KB: use direct request to DB to query changed emails for which new emails haven't been verified yet
      // const userEmails = userEntity.emails.filter(e => e.email === email);
      const userEmails = await this.dbRepository.userEmail.findMany({
        where: {
          isDeleted: false,
          isVerified: true,
          userId: userEntity.id,
          email
        },
        select: {
          email: true,
          verificationToken: true,
          isVerified: true
        }
      });
      if (userEmails.length === 0) {
        this.logger.warn(`(UserLogic) cannot find user by specified email to recover password, but seems like internal exception, email=${maskLog(email)}`);
        return 'user-not-found';
      }
      const verificationToken = userEmails[0].verificationToken;
      if (!userEmails[0].isVerified && (!verificationToken || this.tokenLogic.isTokenActive(verificationToken.isDeleted, verificationToken.attemptsMade, verificationToken.createdUtc) === 'active')) {
        this.logger.info(`(UserLogic) user email verification pending, no need to recover password, email=${maskLog(email)}`);
        return 'email-not-verified';
      }

      this.logger.verbose(`(UserLogic) sending password recovery email to user: id=${userEntity.id}, email=${maskLog(email)}`);
      const tokenData = await this.tokenLogic.issueToken(TokenKind.PasswordRecovery, userEntity.id, true);
      const emailParams : IEmailParams = {
        locale,
        subject: this.serverI18n.getLocalizedResource(getI18nResName3('emails', 'passwordRecovery', 'subject'), locale),
        title: this.serverI18n.getLocalizedResource(getI18nResName3('emails', 'passwordRecovery', 'title'), locale),
        to: email,
        token: tokenData,
        userId: userEntity.id,
        theme: theme ?? DefaultEmailTheme
      };
      await this.emailSender.sendEmail(EmailTemplate.PasswordRecovery, emailParams);

      this.logger.info(`(UserLogic) user password recovery started successfully (email sent): email=${maskLog(email)}`);
      return 'success';
    } catch (err: any) {
      this.logger.warn(`(UserLogic) failed to send password recovery email to user: email=${maskLog(email)}`, err);
      throw err;
    }
  };
}
