import { maskLog, buildParamsLogData, DefaultLocale, SecretValueMask, AppConfig, AppException, AppExceptionCodeEnum, EmailTemplateEnum, AppPage, getPagePath, type IAppLogger } from '@golobe-demo/shared';
import { type IEmailParams, type IEmailSender } from './../types';
import type { PrismaClient } from '@prisma/client';
import { createTransport } from 'nodemailer';
import { type Logger as MailLogger } from 'nodemailer/lib/shared';
import template from 'lodash-es/template';
import { withQuery, joinURL } from 'ufo';
import juice from 'juice';

interface IMailSettings {
  host: string,
  port: number,
  secure: boolean,
  from: string,
  appName: string,
  siteUrl: string
};

interface IMailTemplateParams {
  subject: string,
  title: string,
  preheader?: string,
  siteUrl: string,
  pageLinkQuery?: string,
  appName: string,
  userName?: string,
  theme: string
}

export class EmailSender implements IEmailSender {
  private logger: IAppLogger;
  private smtpTransporter?: ReturnType<typeof createTransport>;
  private dbRepository: PrismaClient;

  public static inject = ['logger', 'dbRepository'] as const;
  constructor (logger: IAppLogger, dbRepository: PrismaClient) {
    this.logger = logger;
    this.dbRepository = dbRepository;
  }

  throwEmailNotConfigured = () => {
    this.logger.error('(EmailSender) cannot perform operation as emailing disabled');
    throw new AppException(AppExceptionCodeEnum.EMAILING_DISABLED, 'emailing disabled', 'error-page');
  };

  initialize = async (): Promise<void> => {
    this.logger.info('(EmailSender) initialize - verifying setup');

    if (AppConfig.email) {
      this.smtpTransporter = this.createNodeMailer();

      const mailSettings = this.getMailSettingsOrThrow();
      if (mailSettings.siteUrl.endsWith('/')) {
        throw new Error(`site URL must be configured without trailing slash: ${AppConfig.siteUrl}`);
      }

      const result = await this.smtpTransporter?.verify();
      if (!result) {
        const msg = 'setup verification failed';
        this.logger.warn('(EmailSender) ' + msg);
        throw new Error(msg);
      }
    } else if (process.env.PUBLISH) {
      this.logger.error('Emailing is not configured!');
      throw new Error('Emailing is not configured!');
    } else {
      this.logger.info('skipping email infrastructure check as it is disabled');
    }

    this.logger.info('(EmailSender) setup verification completed');
  };

  getMailSettingsOrThrow = (): IMailSettings => {
    this.logger.verbose('(EmailSender) accessing mail settings');
    if (!AppConfig.email) {
      this.throwEmailNotConfigured();
    }
    const result : IMailSettings = AppConfig.email as IMailSettings;
    return result;
  };

  createMailLogger = (): MailLogger => {
    return {
      level: () => {},
      trace: (...params: any[]) => { this.logger.debug('(MailLogger) trace ', buildParamsLogData(params)); },
      debug: (...params: any[]) => { this.logger.verbose('(MailLogger) debug ', buildParamsLogData(params)); },
      info: (...params: any[]) => { this.logger.info('(MailLogger) info ', buildParamsLogData(params)); },
      warn: (...params: any[]) => { this.logger.warn('(MailLogger) warn ', buildParamsLogData(params)); },
      error: (...params: any[]) => { this.logger.warn('(MailLogger) exception ', buildParamsLogData(params)); },
      fatal: (...params: any[]) => { this.logger.warn('(MailLogger) fatal ', buildParamsLogData(params)); }
    };
  };

  createNodeMailer = (): ReturnType<typeof createTransport> => {
    if (!this.smtpTransporter) {
      const mailSettings = this.getMailSettingsOrThrow();

      this.logger.info(`(EmailSender) initializing node mailer transporter: host=${`${mailSettings.host}:${mailSettings.port}`}, secure=${mailSettings.secure}`);
      this.smtpTransporter = createTransport({
        host: mailSettings.host,
        port: mailSettings.port,
        secure: mailSettings.secure,
        auth: {
          user: process.env.SMTP_USERNAME,
          pass: process.env.SMTP_PASSWORD
        },
        tls: {
          rejectUnauthorized: true,
          requestCert: true
        },
        logger: this.createMailLogger()
      });
    }
    return this.smtpTransporter;
  };

  createMailTemplateParams = async (kind: EmailTemplateEnum, params: IEmailParams): Promise<IMailTemplateParams> => {
    this.logger.verbose(`(EmailSender) creating mail template params, kind=${kind}, subject=${params.subject}, to=${params.to}, userId=${params.userId}, theme=${params.theme}, locale=${params.locale}`);

    const mailSettings = this.getMailSettingsOrThrow();

    let pageLinkQuery: string | undefined;
    if (params.token) {
      let pageUrlSegment: AppPage;
      switch (kind) {
        case EmailTemplateEnum.EmailVerify:
          pageUrlSegment = AppPage.EmailVerifyComplete;
          break;
        case EmailTemplateEnum.PasswordRecovery:
          pageUrlSegment = AppPage.ForgotPasswordSet;
          break;
        case EmailTemplateEnum.RegisterAccount:
          pageUrlSegment = AppPage.SignupComplete;
          break;
      }

      const localeSegment = (params.locale !== DefaultLocale ? params.locale : '').toLowerCase();
      pageLinkQuery = withQuery(joinURL(localeSegment, getPagePath(pageUrlSegment)), { token_id: params.token.id, token_value: params.token.value });
    }

    let userName = '';
    if (params.userId) {
      const userEntity = await this.dbRepository.user.findUnique({ where: { id: params.userId, isDeleted: false }, select: { firstName: true } });
      if (userEntity) {
        userName = userEntity.firstName ?? '';
      }
    }

    const result: IMailTemplateParams = {
      siteUrl: mailSettings.siteUrl,
      subject: params.subject,
      title: params.title,
      pageLinkQuery,
      preheader: params.preheader,
      appName: mailSettings.appName,
      userName,
      theme: params.theme
    };

    this.logger.verbose(`(EmailSender) mail template params created, kind=${kind}, subject=${params.subject}, to=${params.to}, userId=${params.userId}, locale=${params.locale}`);
    return result;
  };

  buildMailHtml = async (kind: EmailTemplateEnum, mailTemplateMarkup: string, params: IEmailParams): Promise<string> => {
    this.logger.verbose(`(EmailSender) building mail html, kind=${kind}, subject=${params.subject}, to=${params.to}, userId=${params.userId}, locale=${params.locale}`);
    const compiled = template(mailTemplateMarkup);
    this.logger.debug(`(EmailSender) preparing template params, kind=${kind}, subject=${params.subject}, to=${params.to}`);
    const templateParams = await this.createMailTemplateParams(kind, params);
    this.logger.debug(`(EmailSender) executing template, kind=${kind}, subject=${params.subject}, to=${params.to}`);
    let mailHtml = compiled(templateParams);
    this.logger.debug(`(EmailSender) postprocessing template, kind=${kind}, subject=${params.subject}, to=${params.to}`);
    mailHtml = juice(mailHtml);

    this.logger.verbose(`(EmailSender) mail html built, kind=${kind}, subject=${params.subject}, to=${params.to}, userId=${params.userId}, locale=${params.locale}, size=${mailHtml.length}`);
    return mailHtml;
  };

  sendEmail = async (kind: EmailTemplateEnum, template: string, params: IEmailParams): Promise<void> => {
    this.logger.info(`(EmailSender) sending mail, kind=${kind}, subject=${params.subject}, to=${params.to}, token=${params.token ? SecretValueMask : '[empty]'}, userId=${params.userId}, locale=${params.locale}`);

    const mailSettings = this.getMailSettingsOrThrow();
    try {
      const mailHtml = await this.buildMailHtml(kind, template, params);
      await this.smtpTransporter!.sendMail({
        from: mailSettings.from,
        to: params.to,
        subject: params.subject,
        html: mailHtml
      });
    } catch (err: any) {
      this.logger.warn(`(EmailSender) failed to send email kind=${kind}, subject=${params.subject}, to=${maskLog(params.to)}, token=${params.token ? SecretValueMask : '[empty]'}, userId=${params.userId}, locale=${params.locale}`, err);
      if (AppException.isAppException(err)) {
        throw err;
      } else {
        throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'failed to send email', 'error-page');
      }
    }

    this.logger.info(`(EmailSender) mail sent, kind=${kind}, subject=${params.subject}, to=${params.to}`);
  };
}
