import { type IUserProfileInfo, type IUserMinimalInfo, type IImageInfo, obtainFreeSlug, EmailTemplateEnum, getI18nResName3, ImageCategory, AppConfig, AppException, AppExceptionCodeEnum, maskLog, isPasswordSecure, DbVersionInitial, type Locale, type Theme, SecretValueMask, DefaultEmailTheme, DefaultLocale, newUniqueId, type IAppLogger, AuthProvider, TokenKind, type EntityId, type Timestamp } from '@golobe-demo/shared';
import type { UpdateUserAccountResult, IFileLogic, IUserProfileFileInfoUnresolved, IMailTemplateLogic, IImageProvider, IEmailParams, PasswordRecoveryResult, IImageLogic, ITokenLogic, IEmailSender, IUserLogic, UserResponseDataSet, RegisterVerificationFlow, RegisterUserByEmailResponse } from './../types';
import type { PrismaClient } from '@prisma/client';
import groupBy from 'lodash-es/groupBy';
import values from 'lodash-es/values';
import { MapUserEntityMinimal, UserProfileQuery, MapUserEntityProfile, UserMinimalQuery } from './queries';
import type { IServerI18n } from './../common-services/i18n';
import { mapEnumDbValue, executeInTransaction } from '../helpers/db';
import { calculatePasswordHash, getSomeSalt, verifyPassword } from './../helpers/utils';
import { isTokenActive } from './../helpers/tokens';
import type { H3Event } from 'h3';

export class UserLogic implements IUserLogic {
  private logger: IAppLogger;
  private dbRepository: PrismaClient;
  private tokenLogic: ITokenLogic;
  private mailTemplateLogic: IMailTemplateLogic;
  private emailSender: IEmailSender;
  private serverI18n: IServerI18n;
  private imageLogic: IImageLogic;
  private fileLogic: IFileLogic;
  private imageProvider: IImageProvider;

  public static inject = ['logger', 'imageLogic', 'fileLogic', 'imageProvider', 'tokenLogic', 'mailTemplateLogic', 'emailSender', 'serverI18n', 'dbRepository'] as const;
  constructor (logger: IAppLogger, imageLogic: IImageLogic, fileLogic: IFileLogic, imageProvider: IImageProvider, tokenLogic: ITokenLogic, mailTemplateLogic: IMailTemplateLogic, emailSender: IEmailSender, serverI18n: IServerI18n, dbRepository: PrismaClient) {
    this.logger = logger.addContextProps({ component: 'UserLogic' });
    this.dbRepository = dbRepository;
    this.tokenLogic = tokenLogic;
    this.emailSender = emailSender;
    this.mailTemplateLogic = mailTemplateLogic;
    this.serverI18n = serverI18n;
    this.imageLogic = imageLogic;
    this.fileLogic = fileLogic;
    this.imageProvider = imageProvider;
  }

  getMailTemplate = async(kind: EmailTemplateEnum, params: IEmailParams): Promise<string> => {
    const mailTemplateMarkup = await this.mailTemplateLogic.getTemplateMarkup(kind, params.locale, false);
    if (!mailTemplateMarkup) {
      this.logger.warn('mail template markup not found', undefined, { kind, subject: params.subject, to: params.to, userId: params.userId, locale: params.locale });
      throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'mail template markup not found', 'error-page');
    }
    return mailTemplateMarkup;
  };

  deleteUser = async (id: EntityId): Promise<void> => {
    this.logger.verbose('deleting user', { userId: id });
    await executeInTransaction(async () => {
      await this.dbRepository.userEmail.updateMany({
        where: {
          user: {
            id,
            isDeleted: false
          },
          isDeleted: false
        },
        data: {
          isDeleted: true,
          version: { increment: 1 }
        }
      });
      await this.dbRepository.image.updateMany({
        where: {
          owner: {
            id,
            isDeleted: false
          },
          isDeleted: false
        },
        data: {
          isDeleted: true,
          version: { increment: 1 }
        }
      });
      await this.dbRepository.user.update({
        where: {
          id,
          isDeleted: false
        },
        data: {
          isDeleted: true,
          version: { increment: 1 }
        }
      });
    }, this.dbRepository);
    this.logger.verbose('user deleted', { userId: id });
  };

  updateUserAccount = async (userId: EntityId, firstName: string | undefined, lastName: string | undefined, password: string | undefined, emails: string[] | undefined, theme: Theme | undefined, locale: Locale | undefined): Promise<UpdateUserAccountResult> => {
    const logParams = `userId=${userId}, firstName=${firstName !== undefined ? maskLog(firstName) : '[skip]'}, lastName=${lastName !== undefined ? maskLog(lastName) : '[skip]'}, password=${password !== undefined ? SecretValueMask : '[skip]'}, ${emails !== undefined ? ((emails.length ?? 0).toString() + ' emails') : '[skip]'}, locale=${locale ?? '[none]'}`;
    this.logger.info('updating user account', logParams);
    locale ??= DefaultLocale;

    const emailingEnabled = AppConfig.email;
    let isAutoVerified: boolean | undefined = emailingEnabled ? false : undefined;

    const userInfo = await this.getUser(userId, 'minimal');
    if (!userInfo) {
      this.logger.warn('cannot update user account - user was not found', undefined, logParams);
      throw new AppException(AppExceptionCodeEnum.OBJECT_NOT_FOUND, 'user was not found', 'error-page');
    }

    if (password !== undefined && !isPasswordSecure(password)) {
      this.logger.warn('cannot update user account - password is insecure', undefined, logParams);
      throw new AppException(AppExceptionCodeEnum.BAD_REQUEST, 'password is insecure', 'error-stub');
    }

    if (userInfo.authProvider === AuthProvider.Email && emails !== undefined && emails.length === 0) {
      this.logger.info('cannot remove last email from Email user with auth provider', logParams);
      return 'deleting-last-email';
    }

    if ((emails?.length ?? 0) > AppConfig.maxUserEmailsCount) {
      this.logger.warn('cannot update user account - maximum number of allowed emails limit exceeded', undefined, logParams);
      throw new AppException(AppExceptionCodeEnum.BAD_REQUEST, 'maximum emails count limit exceeded', 'error-stub');
    }

    const hasDuplicates = emails !== undefined && values(groupBy(emails)).some(v => v.length > 1);
    if (hasDuplicates) {
      this.logger.info('cannot update user account - email duplicates detected', logParams);
      return 'email-already-exists';
    }

    const emailIdsToDelete = emails !== undefined ? userInfo.emails.filter(ue => !ue.isDeleted && !emails.includes(ue.email)).map(e => e.id) : undefined;
    const emailsToAdd = emails !== undefined ? emails.filter(e => e.length > 0 && !userInfo.emails.some(ue => !ue.isDeleted && ue.email === e)) : undefined;
    if ((emailsToAdd?.length ?? 0) > 1) {
      this.logger.warn('cannot update user account - too many changes in emails', undefined, logParams);
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
        this.logger.info('cannot update user account - adding email already exists', logParams);
        return 'email-already-exists';
      }

      this.logger.verbose('adding new email to user account', { userId, email: maskLog(emailToAdd), emailingEnambed: emailingEnabled });
      changedEmailId = ((emailIdsToDelete?.length === 1) && emailToAdd) ? emailIdsToDelete[0] : undefined;
      isAutoVerified = !emailingEnabled;
      const newEmailEntity = await this.dbRepository.userEmail.create({
        data: {
          id: newUniqueId(),
          email: emailToAdd,
          orderNum: ((userInfo.emails?.length ?? 0) > 0 ? Math.max(...userInfo.emails.map(x => x.order)) : 0) + 1,
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
          this.logger.warn('failed to send verification for newly addded email', err, { id: userId, email: maskLog(emailToAdd) });
          await this.dbRepository.userEmail.delete({ where: { id: newEmailEntity.id } });
          throw err;
        }
      }
    }

    this.logger.verbose('updating user account data', logParams);
    await executeInTransaction(async () => {
      if ((emailIdsToDelete?.length ?? 0) > 0) {
        const deleteEmailWithEditChain = async (emailId: EntityId): Promise<void> => {
          let deletingId : EntityId | undefined = emailId;
          while (deletingId) {
            this.logger.debug('updating user account data - deleting email in chain', { userId, emailId: deletingId, originalEmailId: emailId });
            deletingId = (await this.dbRepository.userEmail.update({
              where: {
                id: deletingId
              },
              data: {
                isDeleted: true,
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
            this.logger.debug('updating user account data - deleting emails in autoverified email edit chain', userId);
            for (let i = 0; i < emailIdsToDelete!.length; i++) {
              await deleteEmailWithEditChain(emailIdsToDelete![i]);
            }
          } else {
            this.logger.debug('updating user account data - marking changed unverified email deleted', { userId, emailId: changedEmailId });
            await this.dbRepository.userEmail.updateMany({
              where: {
                id: changedEmailId,
                isVerified: false,
                isDeleted: false
              },
              data: {
                isDeleted: true,
                version: { increment: 1 }
              }
            });
          }
        } else {
          this.logger.debug('updating user account data - delete emails', { userId, emailIds: emailIdsToDelete });
          for (let i = 0; i < emailIdsToDelete!.length; i++) {
            await deleteEmailWithEditChain(emailIdsToDelete![i]);
          }
        }
      }

      if (password !== undefined) {
        this.logger.debug('updating user account data - set password', userId);
        await this.setUserPassword(userId, password);
      }

      if (firstName !== undefined || lastName !== undefined) {
        this.logger.debug('updating user account data - first/last name', userId);
        await this.dbRepository.user.update({
          where: {
            id: userId,
            isDeleted: false
          },
          data: {
            version: { increment: 1 },
            ...(firstName !== undefined ? { firstName } : {}),
            ...(lastName !== undefined ? { lastName } : {})
          }
        });
      }
    }, this.dbRepository);

    this.logger.info('user account updated', logParams);
    return isAutoVerified ? 'email-autoverified' : 'success';
  };

  uploadUserImage = async (userId: EntityId, category: ImageCategory, bytes: Buffer, mimeType: string, fileName: string | undefined, event: H3Event): Promise<{ id: EntityId, slug: string, timestamp: Timestamp }> => {
    this.logger.info('uploading user image', { userId, category, length: bytes.length, mimeType, fileName });

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
            fileId: true
          }
        },
        avatar: {
          select: {
            id: true,
            slug: true,
            fileId: true
          }
        }
      }
    });
    if (!userImagesInfo) {
      this.logger.warn('cannot upload image - user was not found', undefined, { id: userId });
      throw new AppException(AppExceptionCodeEnum.OBJECT_NOT_FOUND, 'user was not found', 'error-page');
    }

    let targetCategoryImageInfo: { imageId: EntityId, fileId: EntityId, slug: string, isDeleted: boolean } | undefined;
    const mapImageInfo = (dbInfo: { id: EntityId, slug: string, fileId: EntityId }): { imageId: EntityId, fileId: EntityId, slug: string, isDeleted: boolean } => {
      return { imageId: dbInfo.id, fileId: dbInfo.fileId, slug: dbInfo.slug, isDeleted: false };
    };
    switch (category) {
      case ImageCategory.UserAvatar:
        targetCategoryImageInfo = userImagesInfo.avatar ? mapImageInfo(userImagesInfo.avatar) : undefined;
        break;
      case ImageCategory.UserCover:
        targetCategoryImageInfo = userImagesInfo.cover ? mapImageInfo(userImagesInfo.cover) : undefined;
        break;
      default:
        this.logger.warn('unexpected uploading image category', undefined, { userId, category });
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
      this.logger.verbose('updating existing image', { imageId: targetCategoryImageInfo!.imageId, fileId: imageFileId, slug, userId, length: bytes.length, fileName });
      imageId = targetCategoryImageInfo!.imageId;
      const queryResult = await this.imageLogic.updateImage(targetCategoryImageInfo!.imageId, {
        bytes,
        originalName: fileName,
        slug: slug!,
        mimeType,
        category,
        ownerId: userId,
        stubCssStyle: undefined,
        invertForDarkTheme: false
      }, imageFileId, userId, event, false);
      timestamp = queryResult.timestamp;

      await this.imageProvider.clearImageCache(targetCategoryImageInfo!.imageId, category);
      if (slug) {
        await this.imageProvider.clearImageCache(slug, category);
      }
    } else {
      this.logger.verbose('creating new image file', { slug, userId, category, length: bytes.length, fileName });
      await executeInTransaction(async () => {
        const queryResult = await this.imageLogic.createImage({
          bytes,
          originalName: fileName,
          slug: slug!,
          category,
          ownerId: userId,
          mimeType,
          stubCssStyle: undefined,
          invertForDarkTheme: false
        }, userId, false);
        timestamp = queryResult.timestamp;
        imageId = queryResult.id;

        await this.dbRepository.user.update({
          where: userFilterQuery,
          data: {
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
      }, this.dbRepository);
    }

    this.logger.info('user image uploaded', { imageId, slug, userId, length: bytes.length, fileName });
    return {
      id: imageId!,
      slug: slug!,
      timestamp
    };
  };

  setUserPassword = async (userId: EntityId, password: string): Promise<void> => {
    this.logger.info('setting user password', { id: userId });

    if (!isPasswordSecure(password)) {
      this.logger.warn('cannot set password, its insecure');
      throw new AppException(AppExceptionCodeEnum.BAD_REQUEST, 'password is insecure', 'error-stub');
    }

    const passwordSalt = getSomeSalt();
    const updateResult = await this.dbRepository.user.updateMany({
      where: { id: userId, isDeleted: false },
      data: {
        passwordHash: calculatePasswordHash(`${passwordSalt}${password}`),
        passwordSalt,
        version: { increment: 1 }
      }
    });
    if (updateResult.count === 0) {
      this.logger.warn('seems like users doesnt exist in DB or is deleted', undefined, { id: userId });
      throw new AppException(AppExceptionCodeEnum.OBJECT_NOT_FOUND, 'user not found', 'error-page');
    }

    this.logger.info('user password set', { id: userId });
  };

  verifyUserPassword = async (email: string, password: string): Promise<IUserMinimalInfo | undefined> => {
    email = email.trim();
    this.logger.verbose('verifying user password', { email: maskLog(email) });

    const userEntity = await this.findUserByEmail(email, true, 'profile');
    if (!userEntity) {
      this.logger.verbose('password was not verified as user with specified email was not found or email hasn', { email: maskLog(email) });
      return undefined;
    }

    if (!userEntity.passwordHash || !userEntity.passwordSalt) {
      // password was not set - this may happen in case third-paty auth provider was used for creating user's profile
      this.logger.verbose('password was not verified as password hasn', { email: maskLog(email) });
      return undefined;
    }

    if (!verifyPassword(password, userEntity.passwordSalt, userEntity.passwordHash)) {
      this.logger.verbose('password verification failed', { email: maskLog(email) });
      return undefined;
    }

    return userEntity;
  };

  registerUserByEmail = async (email: string, password: string, verification: RegisterVerificationFlow, firstName: string | undefined, lastName: string | undefined, theme: Theme | undefined, locale: Locale | undefined): Promise<RegisterUserByEmailResponse> => {
    email = email.trim();
    this.logger.info('registering user by email', { email: maskLog(email), verification, firstName: maskLog(firstName), lastName: maskLog(lastName), theme, locale });
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
      if (isTokenActive(verificationToken.isDeleted, verificationToken.attemptsMade, verificationToken.createdUtc) === 'token-expired') {
        return true;
      }
      return false;
    };

    const existingUser = await this.findUserByEmail(email, false, 'minimal');
    if (existingUser) {
      if (isUserRegistrationLinkExpired(existingUser)) {
        this.logger.info('previous user registration expired, removing old user', { id: existingUser.id, createdUtc: existingUser.createdUtc, email: maskLog(email) });
        await this.dbRepository.user.delete({ where: { id: existingUser.id } });
      } else {
        this.logger.warn('cannot register user by email as it is already exists', undefined, { email: maskLog(email) });
        return 'already-exists';
      }
    }

    if (!isPasswordSecure(password)) {
      this.logger.warn('cannot register user by email as provided password is not secure');
      return 'insecure-password';
    }

    const passwordSalt = getSomeSalt();
    const userEntity = await this.dbRepository.user.create({
      data: {
        id: newUniqueId(),
        authProvider: 'EMAIL',
        providerIdentity: email,
        version: DbVersionInitial,
        firstName: firstName ?? null,
        lastName: lastName ?? null,
        passwordSalt,
        passwordHash: calculatePasswordHash(`${passwordSalt}${password}`),
        emails: {
          create: {
            id: newUniqueId(),
            email,
            orderNum: 0,
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
        this.logger.warn('failed to send registration verification email to user', err, { id: userEntity.id, email: maskLog(email) });
        await this.dbRepository.user.delete({ where: { id: userEntity.id } });
        throw err;
      }
    }

    this.logger.info('user registered by email successfully', { id: userEntity.id, email: maskLog(email) });
    return userEntity.id;
  };

  sendConfirmationEmail = async (userId: EntityId, userEmailId: EntityId, email: string, locale: Locale, kind: TokenKind.RegisterAccount | TokenKind.EmailVerify, theme?: Theme): Promise<void> => {
    this.logger.verbose('sending email to user', { userId, email: maskLog(email), emailId: userEmailId, theme, locale, kind });
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
    const emailKind = kind === TokenKind.RegisterAccount ? EmailTemplateEnum.RegisterAccount : EmailTemplateEnum.EmailVerify;
    const mailTemplateMarkup = await this.getMailTemplate(emailKind, emailParams);
    await this.emailSender.sendEmail(emailKind, mailTemplateMarkup, emailParams);
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
    this.logger.verbose('email sent to user', { userId, email: maskLog(email), emailId: userEmailId, theme, locale, kind });
  };

  resolveUserFiles = async (userProfileUnresolved: IUserProfileFileInfoUnresolved): Promise<IUserProfileInfo> => {
    const userId = userProfileUnresolved.id;
    this.logger.debug('resoving user files', userId);
    let avatarFileInfo: IImageInfo | undefined;
    let coverFileInfo: IImageInfo | undefined;
    if(userProfileUnresolved.avatar) {
      this.logger.debug('get user - resoving avatar file', { id: userId, fileId: userProfileUnresolved.avatar.fileId });
      const fileInfos = await this.fileLogic.findFiles([userProfileUnresolved.avatar.fileId]);
      if (!fileInfos?.length) {
        this.logger.warn('cannot found avatar file', undefined, { id: userProfileUnresolved.avatar.id, slug: userProfileUnresolved.avatar.slug, fileId: userProfileUnresolved.avatar.fileId });
      }
      avatarFileInfo = {
        ...userProfileUnresolved.avatar,
        file: fileInfos[0]
      };
    }

    if(userProfileUnresolved.cover) {
      this.logger.debug('get user - resoving cover file', { id: userId, fileId: userProfileUnresolved.cover.fileId });
      const fileInfos = await this.fileLogic.findFiles([userProfileUnresolved.cover.fileId]);
      if (!fileInfos?.length) {
        this.logger.warn('cannot found cover file', undefined, { id: userProfileUnresolved.cover.id, slug: userProfileUnresolved.cover.slug, fileId: userProfileUnresolved.cover.fileId });
      }
      coverFileInfo = {
        ...userProfileUnresolved.cover,
        file: fileInfos[0]
      };
    }

    this.logger.debug('user files resolving completed', userId);
    return {
      ...userProfileUnresolved,
      avatar: avatarFileInfo,
      cover: coverFileInfo
    };
  };

  getUser = async <TDataSet extends keyof UserResponseDataSet>(userId: EntityId, dataSet: TDataSet): Promise<UserResponseDataSet[TDataSet] | undefined> => {
    this.logger.verbose('get user', { id: userId, dataSet });

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
        this.logger.warn('get user - not found', undefined, { id: userId, dataSet });
        return undefined;
      }

      const userProfileUnresolved = MapUserEntityProfile(userEntity);
      const result = await this.resolveUserFiles(userProfileUnresolved);
      
      this.logger.verbose('get user - found', { id: userId });
      return result;
    } else {
      const userMinimalQuery = {
        where: filterQuery,
        select: UserMinimalQuery.select
      };
      const userEntity = await this.dbRepository.user.findFirst(userMinimalQuery);
      if (!userEntity) {
        this.logger.warn('get user minimal - not found', undefined, { id: userId, dataSet });
        return undefined;
      }

      this.logger.verbose('get user minimal - found', { id: userId });
      return MapUserEntityMinimal(userEntity);
    }
  };

  findUser = async <TDataSet extends keyof UserResponseDataSet>(
    authProvider: AuthProvider, providerIdentity: string, dataSet: TDataSet): Promise<UserResponseDataSet[TDataSet] | undefined> => {
    this.logger.verbose('finding user', { authProvider, providerIdentity, dataSet });
    if (dataSet === 'profile') {
      const userProfileQuery = {
        where: {
          authProvider: mapEnumDbValue(authProvider),
          providerIdentity,
          isDeleted: false
        },
        select: UserProfileQuery.select
      };
      const userEntity = await this.dbRepository.user.findFirst(userProfileQuery);
      if (!userEntity) {
        this.logger.verbose('user not found', { authProvider, providerIdentity });
        return undefined;
      }

      const userProfileUnresolved = MapUserEntityProfile(userEntity);
      const result = await this.resolveUserFiles(userProfileUnresolved);
      
      this.logger.verbose('user found', { id: userEntity.id, authProvider, providerIdentity });
      return result;
    } else {
      const userMinimalQuery = {
        where: {
          authProvider: mapEnumDbValue(authProvider),
          providerIdentity,
          isDeleted: false
        },
        select: UserMinimalQuery.select
      };
      const userEntity = await this.dbRepository.user.findFirst(userMinimalQuery);
      if (!userEntity) {
        this.logger.verbose('user not found (minimal', { authProvider, providerIdentity });
        return undefined;
      }

      this.logger.verbose('user found (minimal', { id: userEntity.id, authProvider, providerIdentity });
      return MapUserEntityMinimal(userEntity);
    }
  };

  findUserByEmail = async <TDataSet extends keyof UserResponseDataSet>(
    email: string, mustBeVerified: boolean, dataSet: TDataSet): Promise<UserResponseDataSet[TDataSet] | undefined> => {
    this.logger.verbose('finding user by email', { email: maskLog(email), mustBeVerified, dataSet });

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
        this.logger.verbose('user not found', { email: maskLog(email), mustBeVerified, dataSet });
        return undefined;
      }

      const userProfileUnresolved = MapUserEntityProfile(userEntity);
      const result = await this.resolveUserFiles(userProfileUnresolved);
      this.logger.verbose('user found', { id: userEntity.id, email: maskLog(email), mustBeVerified });
      return result;
    } else {
      const userMinimalQuery = {
        where: filterQuery,
        select: UserMinimalQuery.select
      };
      const userEntity = await this.dbRepository.user.findFirst(userMinimalQuery);
      if (!userEntity) {
        this.logger.verbose('user not found (minimal', { email: maskLog(email), mustBeVerified, dataSet });
        return undefined;
      }

      this.logger.verbose('user found (minimal', { id: userEntity.id, email: maskLog(email), mustBeVerified });
      return MapUserEntityMinimal(userEntity);
    }
  };

  ensureOAuthUser = async (authProvider: AuthProvider, providerIdentity: string, firstName: string | undefined, lastName: string | undefined, email: string | undefined, emailVerified: boolean | undefined): Promise<IUserProfileInfo> => {
    this.logger.info('ensuring oauth user', { authProvider, providerIdentity, email: maskLog(email), emailVerified, firstName: maskLog(firstName), lastName: maskLog(lastName) });
    if (authProvider === AuthProvider.Email) {
      throw new Error(`Provider [${AuthProvider.Email}] is not considered as OAuth`);
    }

    const filterQuery = {
      isDeleted: false,
      authProvider: mapEnumDbValue(authProvider),
      providerIdentity
    };

    const userProfileQuery = {
      where: filterQuery,
      select: UserProfileQuery.select
    };
    const userEntity = await this.dbRepository.user.findFirst(userProfileQuery);
    if (userEntity) {
      const userProfileUnresolved = MapUserEntityProfile(userEntity);
      const result = await this.resolveUserFiles(userProfileUnresolved);
      this.logger.verbose('oauth user found', { id: userEntity.id, authProvider, providerIdentity });
      return result;
    }

    this.logger.info('oauth user not found, creating new', { authProvider, providerIdentity, email: maskLog(email), emailVerified, firstName: maskLog(firstName), lastName: maskLog(lastName) });
    const emails = email
      ? {
          create: [{
            id: newUniqueId(),
            email,
            orderNum: 0,
            version: DbVersionInitial,
            isVerified: emailVerified
          }]
        }
      : undefined;
    const newUserEntity = await this.dbRepository.user.create({
      data: {
        id: newUniqueId(),
        authProvider: mapEnumDbValue(authProvider),
        providerIdentity,
        version: DbVersionInitial,
        emails,
        firstName,
        lastName
      },
      select: UserMinimalQuery.select
    });

    const result: IUserProfileInfo = MapUserEntityMinimal(newUserEntity);
    this.logger.info('new oauth user created', { id: result.id, authProvider, providerIdentity });

    return result;
  };

  recoverUserPassword = async (email: string, theme: Theme | undefined, locale: Locale | undefined): Promise<PasswordRecoveryResult> => {
    this.logger.info('recovering user password', { email: maskLog(email), theme, locale });
    locale ??= DefaultLocale;

    try {
      const userEntity = await this.findUserByEmail(email, false, 'minimal');
      if (!userEntity) {
        this.logger.info('cannot find user by specified email to recover password', { email: maskLog(email) });
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
        this.logger.warn('cannot find user by specified email to recover password, but seems like internal exception', undefined, { email: maskLog(email) });
        return 'user-not-found';
      }
      const verificationToken = userEmails[0].verificationToken;
      if (!userEmails[0].isVerified && (!verificationToken || isTokenActive(verificationToken.isDeleted, verificationToken.attemptsMade, verificationToken.createdUtc) === 'active')) {
        this.logger.info('user email verification pending, no need to recover password', { email: maskLog(email) });
        return 'email-not-verified';
      }

      this.logger.verbose('sending password recovery email to user', { id: userEntity.id, email: maskLog(email) });
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
      const mailTemplateMarkup = await this.getMailTemplate(EmailTemplateEnum.PasswordRecovery, emailParams);
      await this.emailSender.sendEmail(EmailTemplateEnum.PasswordRecovery, mailTemplateMarkup, emailParams);

      this.logger.info('user password recovery started successfully (email sent', { email: maskLog(email) });
      return 'success';
    } catch (err: any) {
      this.logger.warn('failed to send password recovery email to user', err, { email: maskLog(email) });
      throw err;
    }
  };
}
