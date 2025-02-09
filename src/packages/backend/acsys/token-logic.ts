import type { TokenKind, IAppLogger, EntityId } from '@golobe-demo/shared';
import type { ITokenLogic, ITokenIssueResult, TokenConsumeResult } from './../types';

export class TokenLogic implements ITokenLogic {
  private readonly logger: IAppLogger;
  private readonly prismaImplementation: ITokenLogic;

  public static inject = ['tokenLogicPrisma', 'logger'] as const;
  constructor (prismaImplementation: ITokenLogic, logger: IAppLogger) {
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

  consumeToken = async (id: EntityId, value: string): Promise<TokenConsumeResult> => {
    this.logger.debug(`(TokenLogic-Acsys) consuming token: id=${id}`);
    const result = this.prismaImplementation.consumeToken(id, value);
    this.logger.debug(`(TokenLogic-Acsys) token consumed: id=${id}`);
    return result;
  };
}
