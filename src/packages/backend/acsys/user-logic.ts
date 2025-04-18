import { type IUserMinimalInfo, type IUserProfileInfo, type ImageCategory, maskLog, type Locale, type Theme, SecretValueMask, type AuthProvider, type IAppLogger, type EntityId, type Timestamp } from '@golobe-demo/shared';
import type { UserResponseDataSet, RegisterVerificationFlow, RegisterUserByEmailResponse, IUserLogic, PasswordRecoveryResult, UpdateUserAccountResult } from './../types';
import type { H3Event } from 'h3';

export class UserLogic implements IUserLogic {
  private readonly logger: IAppLogger;
  private readonly prismaImplementation: IUserLogic;

  public static inject = ['userLogicPrisma', 'logger'] as const;
  constructor (prismaImplementation: IUserLogic, logger: IAppLogger) {
    this.logger = logger.addContextProps({ component: 'UserLogic-Acsys' });
    this.prismaImplementation = prismaImplementation;
  }

  deleteUser =  async (userId: EntityId): Promise<void> => {
    this.logger.debug('deleting user', userId);
    await this.prismaImplementation.deleteUser(userId);
    this.logger.debug('user deleted', userId);
  };

  updateUserAccount = async (userId: EntityId, firstName: string | undefined, lastName: string | undefined, password: string | undefined, emails: string[] | undefined, theme: Theme, locale: Locale): Promise<UpdateUserAccountResult> => {
    const logParams = `userId=${userId}, firstName=${firstName !== undefined ? maskLog(firstName) : '[skip]'}, lastName=${lastName !== undefined ? maskLog(lastName) : '[skip]'}, password=${password !== undefined ? SecretValueMask : '[skip]'}, ${emails !== undefined ? ((emails.length ?? 0).toString() + ' emails') : '[skip]'}, locale=${locale ?? '[none]'}`;
    this.logger.debug('updating user account', logParams);
    const result = await this.prismaImplementation.updateUserAccount(userId, firstName, lastName, password, emails, theme, locale);
    this.logger.debug('user account updated', logParams);
    return result;
  };

  uploadUserImage = async (userId: EntityId, category: ImageCategory, bytes: Buffer, mimeType: string, fileName: string | undefined, event: H3Event): Promise<{ id: EntityId, slug: string, timestamp: Timestamp }> => {
    this.logger.debug('uploading user image', { userId, category, length: bytes.length, mimeType, fileName });
    const result = await this.prismaImplementation.uploadUserImage(userId, category, bytes, mimeType, fileName, event);
    this.logger.debug('user image uploaded', { imageId: result.id, slug: result.slug, userId, length: bytes.length, fileName });
    return result;
  };

  setUserPassword = async (userId: EntityId, password: string): Promise<void> => {
    this.logger.debug('setting user password', { id: userId });
    await this.prismaImplementation.setUserPassword(userId, password);
    this.logger.debug('user password set', { id: userId });
  };

  verifyUserPassword = async (email: string, password: string): Promise<IUserMinimalInfo | undefined> => {
    this.logger.debug('verifying user password');
    const result = await this.prismaImplementation.verifyUserPassword(email, password);
    this.logger.debug('user password verify', { id: result?.id });
    return result;
  };

  registerUserByEmail = async (email: string, password: string, verification: RegisterVerificationFlow, firstName: string | undefined, lastName: string | undefined, theme: Theme | undefined, locale: Locale | undefined): Promise<RegisterUserByEmailResponse> => {
    email = email.trim();
    this.logger.debug('registering user by email', { email: maskLog(email), verification, firstName: maskLog(firstName), lastName: maskLog(lastName), theme, locale });
    const result = await this.prismaImplementation.registerUserByEmail(email, password, verification, firstName, lastName, theme, locale);
    this.logger.debug('user registered by email completed', { email: maskLog(email), result });
    return result;
  };

  getUser = async <TDataSet extends keyof UserResponseDataSet>(userId: EntityId, dataSet: TDataSet, event: H3Event): Promise<UserResponseDataSet[TDataSet] | undefined> => {
    this.logger.debug('get user', { id: userId, dataSet });
    const result = await this.prismaImplementation.getUser(userId, dataSet, event);
    this.logger.debug('get user - found', { id: result?.id });
    return result;
  };

  findUser = async <TDataSet extends keyof UserResponseDataSet>(
    authProvider: AuthProvider, providerIdentity: string, dataSet: TDataSet): Promise<UserResponseDataSet[TDataSet] | undefined> => {
    this.logger.debug('finding user', { authProvider, providerIdentity, dataSet });
    const result = await this.prismaImplementation.findUser(authProvider, providerIdentity, dataSet);
    this.logger.debug('find user result', { authProvider, providerIdentity, dataSet, id: result?.id });
    return result;
  };

  findUserByEmail = async <TDataSet extends keyof UserResponseDataSet>(
    email: string, mustBeVerified: boolean, dataSet: TDataSet): Promise<UserResponseDataSet[TDataSet] | undefined> => {
    this.logger.debug('finding user by email', { email: maskLog(email), mustBeVerified, dataSet });
    const result = await this.prismaImplementation.findUserByEmail(email, mustBeVerified, dataSet);
    this.logger.debug('find user by email result', { email: maskLog(email), mustBeVerified, dataSet, id: result?.id });
    return result;
  };

  ensureOAuthUser = async (authProvider: AuthProvider, providerIdentity: string, firstName?: string, lastName?: string, email?: string, emailVerified?: boolean): Promise<IUserProfileInfo> => {
    this.logger.debug('ensuring oauth user', { authProvider, providerIdentity, email: maskLog(email), emailVerified, firstName: maskLog(firstName), lastName: maskLog(lastName) });
    const result = await this.prismaImplementation.ensureOAuthUser(authProvider, providerIdentity, firstName, lastName, email, emailVerified);
    this.logger.debug('oauth user ensured', { authProvider, providerIdentity, email: maskLog(email), emailVerified, firstName: maskLog(firstName), lastName: maskLog(lastName) });
    return result;
  };

  recoverUserPassword = async (email: string, theme: Theme | undefined, locale: Locale | undefined): Promise<PasswordRecoveryResult> => {
    this.logger.debug('recovering user password', { email: maskLog(email), theme, locale });
    const result = await this.prismaImplementation.recoverUserPassword(email, theme, locale);
    this.logger.debug('user password recover result', { email: maskLog(email), theme, locale, result });
    return result;
  };
}
