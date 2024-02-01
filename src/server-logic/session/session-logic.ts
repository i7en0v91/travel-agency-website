import { randomBytes } from 'crypto';
import { type Storage, type StorageValue } from 'unstorage';
import { PrismaClient } from '@prisma/client';
import dayjs from 'dayjs';
import { destr } from 'destr';
import { type IAppLogger } from '../../shared/applogger';
import { type SessionId, type ISessionLogic, type Session, type EntityId } from '../../shared/interfaces';
import { DbConcurrencyVersions } from '../../shared/constants';

export class SessionLogic implements ISessionLogic {
  private logger: IAppLogger;
  private cache: Storage<StorageValue>;
  private dbRepository: PrismaClient;

  public static inject = ['logger', 'cache', 'dbRepository'] as const;
  constructor (logger: IAppLogger, cache: Storage<StorageValue>, dbRepository: PrismaClient) {
    this.logger = logger;
    this.cache = cache;
    this.dbRepository = dbRepository;
  }

  getSessionStorageKey (sessionId: string): string {
    const res = `session:${sessionId}`;
    return res;
  }

  createNewSessionId (): string {
    const result = randomBytes(32).toString('base64');
    this.logger.debug(`(SessionLogic) new sessionId generated, sessionId=${result}`);
    return result;
  }

  async clearSessionCache (id: SessionId): Promise<void> {
    this.logger.debug(`(SessionLogic) clearing session cache, sessionId=${id}`);
    const storageKey = this.getSessionStorageKey(id);
    await this.cache.removeItem(storageKey);
  }

  async findSession (id: string): Promise<Session | undefined> {
    const storageKey = this.getSessionStorageKey(id);
    const cached = await this.cache.getItem(storageKey) as Session;
    if (cached) {
      this.logger.debug(`(SessionLogic) returning cached session data, sessionId=${id}`);
      return (cached);
    }

    this.logger.verbose(`(SessionLogic) cache-miss, loading session data from DB, sessionId=${id}`);
    const sessionEntity = await this.dbRepository.userSession.findUnique({ where: { id, isDeleted: false }, select: { data: true, version: true, userId: true } });
    if (!sessionEntity) {
      this.logger.verbose(`(SessionLogic) session was not found in DB, sessionId=${id}`);
      return undefined;
    }

    const storageValue = sessionEntity.data!.toString();
    const session = destr<Session>(storageValue);
    session.version = sessionEntity.version;
    session.userId = sessionEntity.userId ?? undefined;

    this.logger.verbose(`(SessionLogic) setting session in storage, ${(JSON.stringify(session))}`);
    await this.cache.setItem(storageKey, session);
    return session;
  }

  async doPersistSession (session: Session, userId: EntityId | undefined): Promise<void> {
    const id = session.sessionId;
    const storageKey = this.getSessionStorageKey(id);

    const storageValue = JSON.stringify(session);
    this.logger.verbose(`(SessionLogic) saving session in DB, sessionId=${id}, values=${storageValue}, userId=${userId}`);

    let userData = { } as any;
    if (userId) {
      userData = { user: { connect: { id: userId! } } };
    }

    if (session.version === DbConcurrencyVersions.DraftVersion) {
      await this.dbRepository.userSession.create({
        data: { data: storageValue, id, ...userData, version: DbConcurrencyVersions.InitialVersion },
        select: { id: true }
      });
      session.version = DbConcurrencyVersions.InitialVersion;
    } else {
      await this.dbRepository.userSession.upsert({
        where: { id, version: session.version },
        create: { data: storageValue, id, ...userData, version: session.version },
        update: { data: storageValue, ...userData, version: session.version + 1, modifiedUtc: dayjs().utc().toDate() },
        select: { id: true }
      });
      session.version++;
    }

    this.logger.verbose(`(SessionLogic) resetting session in storage, sessionId=${id}`);
    await this.cache.removeItem(storageKey);
  }

  async persistSession (session: Session): Promise<void> {
    await this.doPersistSession(session, undefined);
  }

  async setSessionUser (sessionId: SessionId, userId: EntityId): Promise<void> {
    this.logger.verbose(`(SessionLogic) updating session user, sessionId=${sessionId}, userId=${userId}`);
    try {
      const session = await this.findSession(sessionId);
      if (!session) {
        this.logger.warn(`(SessionLogic) cannot update session user, session not found, sessionId=${sessionId}, userId=${userId}`);
        return;
      }
      if (session.userId && session.userId === userId) {
        this.logger.debug(`(SessionLogic) session user hasn't changed, sessionId=${sessionId}, userId=${userId}`);
        return;
      }

      await this.doPersistSession(session, userId);
      this.logger.verbose(`(SessionLogic) session user updated, sessionId=${sessionId}, userId=${userId}`);
    } catch (err: any) {
      this.logger.warn(`(SessionLogic) failed to update session user, sessionId=${sessionId}, userId=${userId}`, err);
    }
  }
}
