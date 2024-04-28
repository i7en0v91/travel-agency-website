import type { PrismaClient } from '@prisma/client';
import dayjs from 'dayjs';
import { type IAppLogger } from '../shared/applogger';
import { AppException, AppExceptionCodeEnum } from '../shared/exceptions';
import { type ITokenLogic, type ITokenIssueResult, TokenKind, type EntityId, type TokenConsumeResult } from '../shared/interfaces';
import { DbVersionInitial } from '../shared/constants';
import AppConfig from '../appconfig';
import { mapEnumValue } from './helpers/db';
import { generateNewTokenValue, verifyTokenValue } from './helpers/crypto';
import { parseEnumOrThrow } from './../shared/common';

export class TokenLogic implements ITokenLogic {
  static readonly MAX_TOKEN_CONSUME_ATTEMPTS = 3;

  private logger: IAppLogger;
  private dbRepository: PrismaClient;

  public static inject = ['logger', 'dbRepository'] as const;
  constructor (logger: IAppLogger, dbRepository: PrismaClient) {
    this.logger = logger;
    this.dbRepository = dbRepository;
  }

  onTokenConsumeAction = async (kind: TokenKind, tokenId: EntityId, userId?: EntityId | undefined): Promise<void> => {
    this.logger.verbose(`(TokenLogic) performing token consume action: kind=${kind}, tokenId=${tokenId}, userId=${userId}`);

    if (kind === TokenKind.RegisterAccount) {
      this.logger.info(`(TokenLogic) marking user email for token as verified: kind=${kind}, tokenId=${tokenId}, userId=${userId}`);
      const updateResult = (await this.dbRepository.userEmail.updateMany({
        where: { verificationTokenId: tokenId, isDeleted: false },
        data: { isVerified: true, modifiedUtc: dayjs().utc().toDate(), version: { increment: 1 } }
      }));
      if (updateResult.count === 0) {
        this.logger.warn(`(TokenLogic) cannot find email to mark verified: kind=${kind}, tokenId=${tokenId}, userId=${userId}`);
        return;
      }
    } else if (kind === TokenKind.EmailVerify) {
      this.logger.info(`(TokenLogic) marking user email for token as verified: kind=${kind}, tokenId=${tokenId}, userId=${userId}`);
      await this.dbRepository.$transaction(async () => {
        let updateResult = (await this.dbRepository.userEmail.update({
          where: { verificationTokenId: tokenId, isDeleted: false },
          data: { isVerified: true, modifiedUtc: dayjs().utc().toDate(), version: { increment: 1 } },
          select: {
            id: true,
            changedEmailId: true
          }
        }));
        if (!(updateResult?.id ?? 0)) {
          this.logger.warn(`(TokenLogic) cannot find email to mark verified: kind=${kind}, tokenId=${tokenId}, userId=${userId}`);
          throw new Error('cannot find email to verify');
        }

        const verifiedEmailId = updateResult.id;
        let changedEmailId = updateResult.changedEmailId ?? undefined;
        while (changedEmailId) {
          this.logger.info(`(TokenLogic) deleting edited emails in chain of verified email: kind=${kind}, tokenId=${tokenId}, verifiedEmailId=${verifiedEmailId}, editedEmailId=${changedEmailId}`);
          updateResult = (await this.dbRepository.userEmail.update({
            where: { id: changedEmailId },
            data: { isDeleted: true, modifiedUtc: dayjs().utc().toDate(), version: { increment: 1 } },
            select: {
              id: true,
              changedEmailId: true
            }
          }));
          changedEmailId = updateResult?.changedEmailId ?? undefined;
        }
      });
    } else if (kind === TokenKind.PasswordRecovery) {
      // nothing special for this
    } else {
      const msg = `(TokenLogic) token consume action - unexpected token kind: kind=${kind}, tokenId=${tokenId}, userId=${userId}`;
      this.logger.warn(msg);
      throw new AppException(AppExceptionCodeEnum.UNKNOWN, msg, 'error-page');
    }

    this.logger.verbose(`(TokenLogic) token consume action done: kind=${kind}, tokenId=${tokenId}, userId=${userId}`);
  };

  issueToken = async (kind: TokenKind, userId?: EntityId | undefined, expirePrevious?: boolean | undefined): Promise<ITokenIssueResult> => {
    this.logger.verbose(`(TokenLogic) issuing new token: kind=${kind}, userId=${userId}, expirePrevious=${expirePrevious}`);

    const tokenValue = generateNewTokenValue();
    let tokenEntity: { id: number };
    if (!userId) {
      tokenEntity = await this.dbRepository.verificationToken.create({
        data: {
          kind: mapEnumValue(kind),
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
            kind: mapEnumValue(kind),
            attemptsMade: {
              lt: TokenLogic.MAX_TOKEN_CONSUME_ATTEMPTS
            },
            isDeleted: false
          },
          data: {
            attemptsMade: TokenLogic.MAX_TOKEN_CONSUME_ATTEMPTS,
            isDeleted: true,
            version: { increment: 1 }
          }
        });
        this.logger.verbose(`(TokenLogic) expired previous tokens: kind=${kind}, userId=${userId}, count=${updated.count}`);
      }

      tokenEntity = await this.dbRepository.verificationToken.create({
        data: {
          kind: mapEnumValue(kind),
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

    this.logger.verbose(`(TokenLogic) token issued: kind=${kind}, userId=${userId}, expirePrevious=${expirePrevious}, id=${result.id}`);
    return result;
  };

  isTokenActive = (isDeleted: boolean, attemptsMade: number, createdUtc: Date): 'token-expired' | 'already-consumed' | 'active' => {
    this.logger.debug(`(TokenLogic) checking token active status: isDeleted=${isDeleted}, attemptsMade=${attemptsMade}, createdUtc=${createdUtc}`);

    let result: 'token-expired' | 'already-consumed' | 'active' = 'active';
    if (attemptsMade >= TokenLogic.MAX_TOKEN_CONSUME_ATTEMPTS) {
      result = 'token-expired';
    }
    if (isDeleted) {
      result = 'already-consumed';
    }
    if (dayjs().utc().add(-AppConfig.verificationTokenExpirationHours, 'hour').isAfter(createdUtc)) {
      result = 'token-expired';
    }

    this.logger.debug(`(TokenLogic) token active status checked: isDeleted=${isDeleted}, attemptsMade=${attemptsMade}, createdUtc=${createdUtc}, result=${result}`);
    return result;
  };

  consumeToken = async (id: EntityId, value: string): Promise<TokenConsumeResult> => {
    this.logger.verbose(`(TokenLogic) consuming token: id=${id}`);

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
      this.logger.info(`(TokenLogic) token not found: id=${id}`);
      return { code: 'not-found', userId: undefined };
    }

    const activeStatus = this.isTokenActive(tokenEntity.isDeleted, tokenEntity.attemptsMade, tokenEntity.createdUtc);
    switch (activeStatus) {
      case 'token-expired':
        this.logger.info(`(TokenLogic) maximum number of consume attempts has been reached: id=${id}`);
        return { code: 'token-expired', userId: tokenEntity.userId ?? undefined };
      case 'already-consumed':
        this.logger.info(`(TokenLogic) token has been already consumed: id=${id}`);
        return { code: 'already-consumed', userId: tokenEntity.userId ?? undefined };
    }

    if (!verifyTokenValue(value, tokenEntity.hash)) {
      this.logger.info(`(TokenLogic) token consume failed: id=${id}`);
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
      await this.onTokenConsumeAction(parseEnumOrThrow(TokenKind, tokenEntity.kind), id, tokenEntity.userId ?? undefined);

      this.logger.info(`(TokenLogic) token consumed: id=${id}`);
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
