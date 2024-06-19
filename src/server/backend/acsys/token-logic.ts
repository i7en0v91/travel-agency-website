import type { TokenKind, IAppLogger, ITokenLogic, ITokenIssueResult, EntityId, TokenConsumeResult } from './../../backend/app-facade/interfaces';
import type { TokenLogic as TokenLogicPrisma } from '../services/token-logic';

export class TokenLogic implements ITokenLogic {
  private readonly logger: IAppLogger;
  private readonly prismaImplementation: TokenLogicPrisma;

  public static inject = ['tokenLogicPrisma', 'logger'] as const;
  constructor (prismaImplementation: TokenLogicPrisma, logger: IAppLogger) {
    this.logger = logger;
    this.prismaImplementation = prismaImplementation;
  }

  deleteToken =  async (id: EntityId): Promise<void> => {
    this.logger.debug(`(TokenLogic-Acsys) deleting token: id=${id}`);
    await this.prismaImplementation.deleteToken(id);
    this.logger.debug(`(TokenLogic-Acsys) token deleted: id=${id}`);
  };

  issueToken = async (kind: TokenKind, userId?: EntityId | undefined, expirePrevious?: boolean | undefined): Promise<ITokenIssueResult> => {
    this.logger.debug(`(TokenLogic-Acsys) issuing new token: kind=${kind}, userId=${userId}, expirePrevious=${expirePrevious}`);
    const result = await this.prismaImplementation.issueToken(kind, userId, expirePrevious);
    this.logger.debug(`(TokenLogic-Acsys) token issued: kind=${kind}, userId=${userId}, expirePrevious=${expirePrevious}, id=${result.id}`);
    return result;
  };

  isTokenActive = (isDeleted: boolean, attemptsMade: number, createdUtc: Date): 'token-expired' | 'already-consumed' | 'active' => {
    this.logger.debug(`(TokenLogic-Acsys) checking token active status: isDeleted=${isDeleted}, attemptsMade=${attemptsMade}, createdUtc=${createdUtc}`);
    const result = this.prismaImplementation.isTokenActive(isDeleted, attemptsMade, createdUtc);
    this.logger.debug(`(TokenLogic-Acsys) token active status checked: isDeleted=${isDeleted}, attemptsMade=${attemptsMade}, createdUtc=${createdUtc}, result=${result}`);
    return result;
  };

  consumeToken = async (id: EntityId, value: string): Promise<TokenConsumeResult> => {
    this.logger.debug(`(TokenLogic-Acsys) consuming token: id=${id}`);
    const result = this.prismaImplementation.consumeToken(id, value);
    this.logger.debug(`(TokenLogic-Acsys) token consumed: id=${id}`);
    return result;
  };
}
