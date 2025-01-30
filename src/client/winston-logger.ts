import { type LogAlwaysLevel, LogLevelEnum, type LogLevel, HeaderAppVersion, AppConfig } from '@golobe-demo/shared';
import { AppWinstonLoggerBase } from '@golobe-demo/shared/winston';
import { post } from './../helpers/rest-utils';
import deepmerge from 'lodash-es/merge';
import { Minipass } from 'minipass';
import { PassThrough as MinipassPassThrough } from 'minipass-collect';
import { transports } from 'winston';
import { consola } from 'consola';
import { StringDecoder } from 'node:string_decoder';
import { setImmediate } from 'node:timers';
import { PassThrough } from 'readable-stream';
import isArray from 'lodash-es/isArray';

(globalThis as any).StringDecoder = (globalThis as any).StringDecoder || StringDecoder;
(globalThis as any).setImmediate = (globalThis as any).setImmediate || setImmediate;
(globalThis as any).Buffer = (globalThis as any).Buffer || Buffer;

const ClientLoggingOptions = deepmerge(
  {},
  AppConfig.logging.common,
  AppConfig.logging.client
);

export class Logger extends AppWinstonLoggerBase<typeof ClientLoggingOptions> {
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

  override getTransports() {
    const collectStream = new MinipassPassThrough({ objectMode: true, async: false });
    const senderStream = new Minipass({ objectMode: true, async: true });
    collectStream.pipe(senderStream);
    senderStream.on('data', (chunk: any) => {
      try {
        const headers = [[HeaderAppVersion, AppConfig.versioning.appVersion.toString()]] as [string, string][];
        post(AppConfig.logging.client.path, undefined, chunk, headers, false, undefined, 'default');
      } catch(error: any) {
        consola.warn('error occured while sending logs to server', error);
      }
    });

    const logEntiresEmitStream = new PassThrough({
      objectMode: true,
      transform: (chunk: any, encoding: BufferEncoding, callback) => {
        try {
          collectStream.write(isArray(chunk) ? chunk : [chunk]);
          callback();
        } catch(err: any) {
          consola.warn('error occured while sending logs to server', err);
          callback(err);
        }
      }
    })

    return [
      new transports.Stream({
        stream: logEntiresEmitStream
      })
    ]
  }

  checkPassLogLevel (level: LogLevelEnum) : boolean {
    return level.valueOf() >= this.logLevel.valueOf();
  }

  checkNeedServerLogging (level: LogLevelEnum) : boolean {
    return level.valueOf() >= this.serverLogLevel.valueOf();
  }

  async sendLogData (logData: { level: LogLevel | (typeof LogAlwaysLevel) } ) {
    const logLevel = logData.level;
    switch(logLevel) {
      case 'never':
        break;
      default:
        this.winstonLogger.log(logLevel, logData);
    }
  }
}