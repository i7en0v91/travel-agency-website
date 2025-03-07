import type { TokenKind, IAppLogger, EntityId } from '@golobe-demo/shared';
import type { ITokenLogic, ITokenIssueResult, TokenConsumeResult } from './../types';

export class TokenLogic implements ITokenLogic {
  private readonly logger: IAppLogger;
  private readonly prismaImplementation: ITokenLogic;

  public static inject = ['tokenLogicPrisma', 'logger'] as const;
  constructor (prismaImplementation: ITokenLogic, logger: IAppLogger) {
    this.logger = logger.addContextProps({ component: 'TokenLogic-Acsys' });
    this.prismaImplementation = prismaImplementation;
  }

  deleteToken =  async (id: EntityId): Promise<void> => {
    this.logger.debug('deleting token', id);
    await this.prismaImplementation.deleteToken(id);
    this.logger.debug('token deleted', id);
  };

  issueToken = async (kind: TokenKind, userId?: EntityId | undefined, expirePrevious?: boolean | undefined): Promise<ITokenIssueResult> => {
    this.logger.debug('issuing new token', { kind, userId, expirePrevious });
    const result = await this.prismaImplementation.issueToken(kind, userId, expirePrevious);
    this.logger.debug('token issued', { kind, userId, expirePrevious, id: result.id });
    return result;
  };

  consumeToken = async (id: EntityId, value: string): Promise<TokenConsumeResult> => {
    this.logger.debug('consuming token', id);
    const result = this.prismaImplementation.consumeToken(id, value);
    this.logger.debug('token consumed', id);
    return result;
  };
}
