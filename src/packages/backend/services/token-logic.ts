import { MaxTokenConsumeAttempts, TokenKind, type IAppLogger, type EntityId, lookupValueOrThrow, DbVersionInitial, AppException, AppExceptionCodeEnum, newUniqueId } from '@golobe-demo/shared';
import type { PrismaClient } from '@prisma/client';
import type { TokenConsumeResult, ITokenLogic, ITokenIssueResult } from './../types';
import { mapEnumDbValue, executeInTransaction } from '../helpers/db';
import { generateNewTokenValue, verifyTokenValue, isTokenActive } from './../helpers/tokens';

export class TokenLogic implements ITokenLogic {
  private logger: IAppLogger;
  private dbRepository: PrismaClient;

  public static inject = ['logger', 'dbRepository'] as const;
  constructor (logger: IAppLogger, dbRepository: PrismaClient) {
    this.logger = logger.addContextProps({ component: 'TokenLogic' });
    this.dbRepository = dbRepository;
  }

  deleteToken =  async (id: EntityId): Promise<void> => {
    this.logger.verbose('deleting token', id);
    await this.dbRepository.verificationToken.update({
      where: {
        id,
        isDeleted: false
      },
      data: {
        isDeleted: true,
        version: { increment: 1 }
      }
    });
    this.logger.verbose('token deleted', id);
  };

  onTokenConsumeAction = async (kind: TokenKind, tokenId: EntityId, userId?: EntityId | undefined): Promise<void> => {
    this.logger.verbose('performing token consume action', { kind, tokenId, userId });

    if (kind === TokenKind.RegisterAccount) {
      this.logger.info('marking user email for register token as verified', { kind, tokenId, userId });
      const updateResult = (await this.dbRepository.userEmail.updateMany({
        where: { verificationTokenId: tokenId, isDeleted: false },
        data: { 
          isVerified: true, 
          version: { increment: 1 } 
        }
      }));
      if (updateResult.count === 0) {
        this.logger.warn('cannot find email to mark registration verified', undefined, { kind, tokenId, userId });
        return;
      }
    } else if (kind === TokenKind.EmailVerify) {
      this.logger.info('marking user email for email token as verified', { kind, tokenId, userId });
      await executeInTransaction(async () => {
        let updateResult = (await this.dbRepository.userEmail.update({
          where: { verificationTokenId: tokenId, isDeleted: false },
          data: { 
            isVerified: true, 
            version: { increment: 1 } 
          },
          select: {
            id: true,
            changedEmailId: true
          }
        }));
        if (!(updateResult?.id ?? 0)) {
          this.logger.warn('cannot find email to mark verified', undefined, { kind, tokenId, userId });
          throw new Error('cannot find email to verify');
        }

        const verifiedEmailId = updateResult.id;
        let changedEmailId = updateResult.changedEmailId ?? undefined;
        while (changedEmailId) {
          this.logger.info('deleting edited emails in chain of verified email', { kind, tokenId, verifiedEmailId, editedEmailId: changedEmailId });
          updateResult = (await this.dbRepository.userEmail.update({
            where: { id: changedEmailId },
            data: { 
              isDeleted: true, 
              version: { increment: 1 } 
            },
            select: {
              id: true,
              changedEmailId: true
            }
          }));
          changedEmailId = updateResult?.changedEmailId ?? undefined;
        }
      }, this.dbRepository);
    } else if (kind === TokenKind.PasswordRecovery) {
      // nothing special for this
    } else {
      this.logger.warn('token consume action - unexpected token kind', undefined, { kind, tokenId, userId });
      throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'token consume action - unexpected token kind', 'error-page');
    }

    this.logger.verbose('token consume action done', { kind, tokenId, userId });
  };

  issueToken = async (kind: TokenKind, userId?: EntityId | undefined, expirePrevious?: boolean | undefined): Promise<ITokenIssueResult> => {
    this.logger.verbose('issuing new token', { kind, userId, expirePrevious });

    const tokenValue = generateNewTokenValue();
    let tokenEntity: { id: EntityId };
    if (!userId) {
      tokenEntity = await this.dbRepository.verificationToken.create({
        data: {
          id: newUniqueId(),
          kind: mapEnumDbValue(kind),
          version: DbVersionInitial,
          attemptsMade: 0,
          hash: tokenValue.hash
        },
        select: {
          id: true
        }
      });
    } else {
      if (expirePrevious) {
        const updated = await this.dbRepository.verificationToken.updateMany({
          where: {
            userId,
            kind: mapEnumDbValue(kind),
            attemptsMade: {
              lt: MaxTokenConsumeAttempts
            },
            isDeleted: false
          },
          data: {
            attemptsMade: MaxTokenConsumeAttempts,
            isDeleted: true,
            version: { increment: 1 }
          }
        });
        this.logger.verbose('expired previous tokens', { kind, userId, count: updated.count });
      }

      tokenEntity = await this.dbRepository.verificationToken.create({
        data: {
          id: newUniqueId(),
          kind: mapEnumDbValue(kind),
          version: DbVersionInitial,
          attemptsMade: 0,
          hash: tokenValue.hash,
          user: {
            connect: {
              id: userId
            }
          }
        },
        select: {
          id: true
        }
      });
    }

    const result: ITokenIssueResult = {
      id: tokenEntity.id,
      value: tokenValue.value
    };

    this.logger.verbose('token issued', { kind, userId, expirePrevious, id: result.id });
    return result;
  };

  consumeToken = async (id: EntityId, value: string): Promise<TokenConsumeResult> => {
    this.logger.verbose('consuming token', id);

    const tokenEntity = await this.dbRepository.verificationToken.findUnique({
      where: {
        id
      },
      select: {
        attemptsMade: true,
        hash: true,
        kind: true,
        userId: true,
        isDeleted: true,
        createdUtc: true,
        version: true
      }
    });
    if (!tokenEntity) {
      this.logger.info('token not found', id);
      return { code: 'not-found', userId: undefined };
    }

    const activeStatus = isTokenActive(tokenEntity.isDeleted, tokenEntity.attemptsMade, tokenEntity.createdUtc);
    switch (activeStatus) {
      case 'token-expired':
        this.logger.info('maximum number of consume attempts has been reached', id);
        return { code: 'token-expired', userId: tokenEntity.userId ?? undefined };
      case 'already-consumed':
        this.logger.info('token has been already consumed', id);
        return { code: 'already-consumed', userId: tokenEntity.userId ?? undefined };
    }

    if (!verifyTokenValue(value, tokenEntity.hash)) {
      this.logger.info('token consume failed', id);
      await this.dbRepository.verificationToken.update({
        where: {
          id
        },
        data: {
          attemptsMade: tokenEntity.attemptsMade + 1,
          version: { increment: 1 }
        }
      });
      return { code: 'failed', userId: tokenEntity.userId ?? undefined };
    } else {
      await this.onTokenConsumeAction(lookupValueOrThrow(TokenKind, tokenEntity.kind), id, tokenEntity.userId ?? undefined);

      this.logger.info('token consumed', id);
      await this.dbRepository.verificationToken.update({
        where: {
          id
        },
        data: {
          isDeleted: true,
          version: { increment: 1 }
        }
      });
      return { code: 'success', userId: tokenEntity.userId ?? undefined };
    }
  };
}
