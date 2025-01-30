import { type LogAlwaysLevel, LogLevelEnum, type LogLevel, HeaderAppVersion, AppConfig, AppLoggerBase } from '@golobe-demo/shared';
import { getClientServices } from './../helpers/service-accessors';
import { post } from './../helpers/rest-utils';
import deepmerge from 'lodash-es/merge';
import { consola } from 'consola';

const ClientLoggingOptions = deepmerge(
  {},
  AppConfig.logging.common,
  AppConfig.logging.client
);

export class Logger extends AppLoggerBase<typeof ClientLoggingOptions> {
  logLevel: LogLevelEnum;
  serverLogLevel: LogLevelEnum;

  constructor () {
    super(ClientLoggingOptions);

    this.logLevel = LogLevelEnum[this.options.level as LogLevel];
    this.serverLogLevel = LogLevelEnum[this.options.serverSend as LogLevel];
    if (!this.logLevel || !this.serverLogLevel) {
      this.logLevel = LogLevelEnum.warn;
      consola.error(`invalid level specified for logging subsystem: ${this.logLevel} / ${this.serverLogLevel}`);
    }
  }

  override getLogDestinations(level: LogLevelEnum): { local: boolean; outside: boolean; } {
    const local = this.checkPassLogLevel(level);
    return {
      local,
      outside: local && this.checkNeedServerLogging(level)
    }
  }

  override logOutside(logData: { level: LogLevel | (typeof LogAlwaysLevel) }): void {
    this.sendLogData(logData);
  }
  
  checkPassLogLevel (level: LogLevelEnum) : boolean {
    return level.valueOf() >= this.logLevel.valueOf();
  }

  checkNeedServerLogging (level: LogLevelEnum) : boolean {
    return level.valueOf() >= this.serverLogLevel.valueOf();
  }

  async sendLogData (logData: { level: LogLevel | (typeof LogAlwaysLevel) }) {
    try {
      if(getClientServices()?.appMounted || logData.level === 'error') {
        const headers = [[HeaderAppVersion, AppConfig.versioning.appVersion.toString()]] as [string, string][];
        await post(AppConfig.logging.client.path, undefined, logData, headers, false, undefined, 'default');
      }
    } catch(error: any) {
      consola.warn('error occured while sending logs to server', error);
    }
  }
}
