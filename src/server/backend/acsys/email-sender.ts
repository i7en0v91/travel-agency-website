import { type IAppLogger, type IEmailParams, type IEmailSender } from './../app-facade/interfaces';
import type { EmailTemplate } from './../app-facade/implementation';
import { SecretValueMask } from './../app-facade/implementation';
import type { EmailSender as EmailSenderPrisma } from '../services/email-sender';

export class EmailSender implements IEmailSender {
  private readonly logger: IAppLogger;
  private readonly prismaImplementation: EmailSenderPrisma;

  public static inject = ['emailSenderPrisma', 'logger'] as const;
  constructor (prismaImplementation: EmailSenderPrisma, logger: IAppLogger) {
    this.logger = logger;
    this.prismaImplementation = prismaImplementation;
  }

  verifySetup = async (): Promise<void> => {
    this.logger.debug('(EmailSender-Acsys) verifying setup');
    this.prismaImplementation.verifySetup();
    this.logger.debug('(EmailSender-Acsys) setup verification completed');
  };

  sendEmail = async (kind: EmailTemplate, params: IEmailParams): Promise<void> => {
    this.logger.debug(`(EmailSender-Acsys) sending mail, kind=${kind}, subject=${params.subject}, to=${params.to}, token=${params.token ? SecretValueMask : '[empty]'}, userId=${params.userId}, locale=${params.locale}`);
    this.prismaImplementation.sendEmail(kind, params);
    this.logger.debug(`(EmailSender-Acsys) mail sent, kind=${kind}, subject=${params.subject}, to=${params.to}`);
  };
}
