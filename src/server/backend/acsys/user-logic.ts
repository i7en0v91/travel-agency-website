import type { AuthProvider, IAppLogger, IUserProfileInfo, UserResponseDataSet, RegisterVerificationFlow, RegisterUserByEmailResponse, IUserLogic, IUserMinimalInfo, PasswordRecoveryResult, EntityId, Timestamp, UpdateUserAccountResult } from './../../backend/app-facade/interfaces';
import { type ImageCategory, maskLog, type Locale, type Theme, SecretValueMask } from './../app-facade/implementation';
import type { UserLogic as UserLogicPrisma } from '../services/user-logic';
import { type H3Event } from 'h3';

export class UserLogic implements IUserLogic {
  private readonly logger: IAppLogger;
  private readonly prismaImplementation: UserLogicPrisma;

  public static inject = ['userLogicPrisma', 'logger'] as const;
  constructor (prismaImplementation: UserLogicPrisma, logger: IAppLogger) {
    this.logger = logger;
    this.prismaImplementation = prismaImplementation;
  }

  deleteUser =  async (userId: EntityId): Promise<void> => {
    this.logger.debug(`(UserLogic-Acsys) deleting user: userId=${userId}`);
    await this.prismaImplementation.deleteUser(userId);
    this.logger.debug(`(UserLogic-Acsys) user deleted: userId=${userId}`);
  };

  updateUserAccount = async (userId: EntityId, firstName: string | undefined, lastName: string | undefined, password: string | undefined, emails: string[] | undefined, theme: Theme, locale: Locale, event: H3Event): Promise<UpdateUserAccountResult> => {
    const logParams = `userId=${userId}, firstName=${firstName !== undefined ? maskLog(firstName) : '[skip]'}, lastName=${lastName !== undefined ? maskLog(lastName) : '[skip]'}, password=${password !== undefined ? SecretValueMask : '[skip]'}, ${emails !== undefined ? ((emails.length ?? 0).toString() + ' emails') : '[skip]'}, locale=${locale ?? '[none]'}`;
    this.logger.debug(`(UserLogic-Acsys) updating user account: ${logParams}`);
    const result = await this.prismaImplementation.updateUserAccount(userId, firstName, lastName, password, emails, theme, locale, event);
    this.logger.debug(`(UserLogic-Acsys) user account updated: ${logParams}`);
    return result;
  };

  uploadUserImage = async (userId: EntityId, category: ImageCategory, bytes: Buffer, mimeType: string, fileName: string | undefined, event: H3Event): Promise<{ id: EntityId, slug: string, timestamp: Timestamp }> => {
    this.logger.debug(`(UserLogic-Acsys) uploading user image: userId=${userId}, category=${category}, length=${bytes.length}, mimeType=${mimeType}, fileName=${fileName}`);
    const result = await this.prismaImplementation.uploadUserImage(userId, category, bytes, mimeType, fileName, event);
    this.logger.debug(`(UserLogic-Acsys) user image uploaded: imageId=${result.id}, slug=${result.slug}, userId=${userId}, length=${bytes.length}, fileName=${fileName}`);
    return result;
  };

  setUserPassword = async (userId: EntityId, password: string): Promise<void> => {
    this.logger.debug(`(UserLogic-Acsys) setting user password: id=${userId}`);
    await this.prismaImplementation.setUserPassword(userId, password);
    this.logger.debug(`(UserLogic-Acsys) user password set: id=${userId}`);
  };

  verifyUserPassword = async (email: string, password: string): Promise<IUserMinimalInfo | undefined> => {
    this.logger.debug('(UserLogic-Acsys) verifying user password', { email });
    const result = await this.prismaImplementation.verifyUserPassword(email, password);
    this.logger.debug(`(UserLogic-Acsys) user password verify, id=${result?.id}`, { email });
    return result;
  };

  registerUserByEmail = async (email: string, password: string, verification: RegisterVerificationFlow, firstName: string | undefined, lastName: string | undefined, theme: Theme | undefined, locale: Locale | undefined, event: H3Event): Promise<RegisterUserByEmailResponse> => {
    email = email.trim();
    this.logger.debug(`(UserLogic-Acsys) registering user by email: email=${maskLog(email)}, verification=${verification}, firstName=${maskLog(firstName)}, lastName=${maskLog(lastName)}, theme=${theme}, locale=${locale}`);
    const result = await this.prismaImplementation.registerUserByEmail(email, password, verification, firstName, lastName, theme, locale, event);
    this.logger.debug(`(UserLogic-Acsys) user registered by email completed, email=${maskLog(email)}, result=${result}`);
    return result;
  };

  getUser = async <TDataSet extends keyof UserResponseDataSet>(userId: EntityId, dataSet: TDataSet, event: H3Event): Promise<UserResponseDataSet[TDataSet] | undefined> => {
    this.logger.debug(`(UserLogic-Acsys) get user: id=${userId}, dataSet=${dataSet}`);
    const result = await this.prismaImplementation.getUser(userId, dataSet, event);
    this.logger.debug(`(UserLogic-Acsys) get user - found: id=${result?.id}}`);
    return result;
  };

  findUser = async <TDataSet extends keyof UserResponseDataSet>(
    authProvider: AuthProvider, providerIdentity: string, dataSet: TDataSet, event: H3Event): Promise<UserResponseDataSet[TDataSet] | undefined> => {
    this.logger.debug(`(UserLogic-Acsys) finding user: authProvider=${authProvider}, providerIdentity=${providerIdentity}, dataSet=${dataSet}`);
    const result = await this.prismaImplementation.findUser(authProvider, providerIdentity, dataSet, event);
    this.logger.debug(`(UserLogic-Acsys) find user result: authProvider=${authProvider}, providerIdentity=${providerIdentity}, dataSet=${dataSet}, id=${result?.id}`);
    return result;
  };

  findUserByEmail = async <TDataSet extends keyof UserResponseDataSet>(
    email: string, mustBeVerified: boolean, dataSet: TDataSet, event: H3Event): Promise<UserResponseDataSet[TDataSet] | undefined> => {
    this.logger.debug(`(UserLogic-Acsys) finding user by email: email=${maskLog(email)}, mustBeVerified=${mustBeVerified}, dataSet=${dataSet}`);
    const result = await this.prismaImplementation.findUserByEmail(email, mustBeVerified, dataSet, event);
    this.logger.debug(`(UserLogic-Acsys) find user by email result: email=${maskLog(email)}, mustBeVerified=${mustBeVerified}, dataSet=${dataSet}, id=${result?.id}`);
    return result;
  };

  ensureOAuthUser = async (authProvider: AuthProvider, providerIdentity: string, firstName?: string, lastName?: string, email?: string, emailVerified?: boolean): Promise<IUserProfileInfo> => {
    this.logger.debug(`(UserLogic-Acsys) ensuring oauth user: authProvider=${authProvider}, providerIdentity=${providerIdentity}, email=${maskLog(email)}, emailVerified=${emailVerified}, firstName=${maskLog(firstName)}, lastName=${maskLog(lastName)}`);
    const result = await this.prismaImplementation.ensureOAuthUser(authProvider, providerIdentity, firstName, lastName, email, emailVerified);
    this.logger.debug(`(UserLogic-Acsys) oauth user ensured: authProvider=${authProvider}, providerIdentity=${providerIdentity}, email=${maskLog(email)}, emailVerified=${emailVerified}, firstName=${maskLog(firstName)}, lastName=${maskLog(lastName)}`);
    return result;
  };

  recoverUserPassword = async (email: string, theme: Theme | undefined, locale: Locale | undefined, event: H3Event): Promise<PasswordRecoveryResult> => {
    this.logger.debug(`(UserLogic-Acsys) recovering user password: email=${maskLog(email)}, theme=${theme}, locale=${locale}`);
    const result = await this.prismaImplementation.recoverUserPassword(email, theme, locale, event);
    this.logger.debug(`(UserLogic-Acsys) user password recover result: email=${maskLog(email)}, theme=${theme}, locale=${locale}, result=${result}`);
    return result;
  };
}
