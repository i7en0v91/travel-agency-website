import { buildParamsLogData, DefaultLocale, AppConfig, AppException, AppExceptionCodeEnum, EmailTemplateEnum, AppPage, getPagePath, type IAppLogger } from '@golobe-demo/shared';
import type { IEmailParams, IEmailSender } from './../types';
import type { PrismaClient } from '@prisma/client';
import { createTransport } from 'nodemailer';
import type { Logger as MailLogger } from 'nodemailer/lib/shared';
import template from 'lodash-es/template';
import { withQuery, joinURL } from 'ufo';
import juice from 'juice';

const CommonLogProps = { component: 'EmailSender' };
const CommonMailerLogProps = { component: 'Mailer' };

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
    this.logger = logger.addContextProps(CommonLogProps);
    this.dbRepository = dbRepository;
  }

  throwEmailNotConfigured = () => {
    this.logger.error('cannot perform operation as emailing disabled', undefined);
    throw new AppException(AppExceptionCodeEnum.EMAILING_DISABLED, 'emailing disabled', 'error-page');
  };

  initialize = async (): Promise<void> => {
    this.logger.info('initialize - verifying setup');

    if (AppConfig.email) {
      this.smtpTransporter = this.createNodeMailer();

      const mailSettings = this.getMailSettingsOrThrow();
      if (mailSettings.siteUrl.endsWith('/')) {
        throw new Error(`site URL must be configured without trailing slash: ${AppConfig.siteUrl}`);
      }

      const result = await this.smtpTransporter?.verify();
      if (!result) {
        this.logger.warn('setup verification failed', undefined);
        throw new Error('setup verification failed');
      }
    } else if (process.env.PUBLISH) {
      this.logger.error('Emailing is not configured!', undefined);
      throw new Error('Emailing is not configured!');
    } else {
      this.logger.info('skipping email infrastructure check as it is disabled');
    }

    this.logger.info('setup verification completed');
  };

  getMailSettingsOrThrow = (): IMailSettings => {
    this.logger.verbose('accessing mail settings');
    if (!AppConfig.email) {
      this.throwEmailNotConfigured();
    }
    const result : IMailSettings = AppConfig.email as IMailSettings;
    return result;
  };

  createMailLogger = (): MailLogger => {
    const mailLogger = this.logger.addContextProps(CommonMailerLogProps);
    return {
      level: () => {},
      trace: (...params: any[]) => { mailLogger.debug(`trace`, { params: buildParamsLogData(params) }); },
      debug: (...params: any[]) => { mailLogger.debug(`debug`, { params: buildParamsLogData(params) }); },
      info: (...params: any[]) => { mailLogger.info(`info`, { params: buildParamsLogData(params) }); },
      warn: (...params: any[]) => { mailLogger.warn(`warn`, undefined, { params: buildParamsLogData(params) }); },
      error: (...params: any[]) => { mailLogger.error(`exception`, undefined, { params: buildParamsLogData(params) }); },
      fatal: (...params: any[]) => { mailLogger.error(`fatal`, undefined, { params: buildParamsLogData(params) }); }
    };
  };

  createNodeMailer = (): ReturnType<typeof createTransport> => {
    if (!this.smtpTransporter) {
      const mailSettings = this.getMailSettingsOrThrow();

      this.logger.info(`initializing node mailer transporter`, { host: `${mailSettings.host}:${mailSettings.port}`, secure: mailSettings.secure });
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
    this.logger.verbose(`creating mail template params`, { kind, ...params });

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

    this.logger.verbose(`mail template params created`, { kind, ...params });
    return result;
  };

  buildMailHtml = async (kind: EmailTemplateEnum, mailTemplateMarkup: string, params: IEmailParams): Promise<string> => {
    this.logger.verbose(`building mail html`, { kind, ...params });
    const compiled = template(mailTemplateMarkup);
    this.logger.debug(`preparing template params`, { kind, ...params });
    const templateParams = await this.createMailTemplateParams(kind, params);
    this.logger.debug(`executing template`, { kind, ...params });
    let mailHtml = compiled(templateParams);
    this.logger.debug(`postprocessing template`, { kind, ...params });
    mailHtml = juice(mailHtml);

    this.logger.verbose(`mail html built`, { kind, ...params, size: mailHtml.length });
    return mailHtml;
  };

  sendEmail = async (kind: EmailTemplateEnum, template: string, params: IEmailParams): Promise<void> => {
    this.logger.info(`sending mail`, { kind, ...params });

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
      this.logger.warn(`failed to send email`, err, { kind, ...params });
      if (AppException.isAppException(err)) {
        throw err;
      } else {
        throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'failed to send email', 'error-page');
      }
    }

    this.logger.info(`mail sent`, { kind, ...params });
  };
}
