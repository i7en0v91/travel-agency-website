import { SecretValueMask, type EmailTemplateEnum, type IAppLogger } from '@golobe-demo/shared';
import { type IEmailParams, type IEmailSender } from './../types';

export class EmailSender implements IEmailSender {
  private readonly logger: IAppLogger;
  private readonly prismaImplementation: IEmailSender;

  public static inject = ['emailSenderPrisma', 'logger'] as const;
  constructor (prismaImplementation: IEmailSender, logger: IAppLogger) {
    this.logger = logger;
    this.prismaImplementation = prismaImplementation;
  }

  async initialize(): Promise<void> {
    this.logger.debug('(EmailSender-Acsys) initializing');
    await this.prismaImplementation.initialize();
    this.logger.debug('(EmailSender-Acsys) initialized');
  };

  sendEmail = async (kind: EmailTemplateEnum, template: string, params: IEmailParams): Promise<void> => {
    this.logger.debug(`(EmailSender-Acsys) sending mail, kind=${kind}, subject=${params.subject}, to=${params.to}, token=${params.token ? SecretValueMask : '[empty]'}, userId=${params.userId}, locale=${params.locale}`);
    this.prismaImplementation.sendEmail(kind, template, params);
    this.logger.debug(`(EmailSender-Acsys) mail sent, kind=${kind}, subject=${params.subject}, to=${params.to}`);
  };
}
