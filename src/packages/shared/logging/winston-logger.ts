import { AppLoggerBase } from './base-logger';
import omit from 'lodash-es/omit';
import type AppConfig from './../appconfig';
import type { LogLevel } from './../types';
import type { LogAlwaysLevel } from './../constants';
import { type transport as WinstonTransport, type Logger as WinstonLogger, createLogger as createWinstonLogger, format as WinstonFormat } from 'winston';
import traverse from 'traverse';
const { combine, timestamp, json } = WinstonFormat;

export abstract class AppWinstonLoggerBase<TOptions extends typeof AppConfig.logging.common> extends AppLoggerBase<TOptions> {
  winstonLogger: WinstonLogger;

  constructor (options: TOptions) {
    super(options);
    this.winstonLogger = this.createLogger();
  }

  abstract getTransports(): WinstonTransport[];

  override logOutside(logData: { level: LogLevel | (typeof LogAlwaysLevel) }) {
    const logLevel = logData.level;
    const logDataAdj = omit(logData, 'level');
    switch(logLevel) {
      case 'never':
        break;
      default:
        this.winstonLogger.log(logLevel, logDataAdj);
    }
  }

  createLogger () {
    const redactFormat = this.getRedactFormat(this.options.redact)();
  
    const timezoned = () => {
      return new Date().toLocaleString(this.options.region, {
        timeZone: this.options.timeZone,
        hour12: false
      });
    };
  
    const result: WinstonLogger = createWinstonLogger({
      level: this.options.level,
      levels: {
        always: 0,
        error: 1,
        warn: 2,
        info: 3,
        http: 4,
        verbose: 5,
        debug: 6,
        silly: 7
      },
      format: combine(
        timestamp({ format: timezoned }),
        redactFormat,
        json()
      ),
      transports: this.getTransports()
    });
    return result;
  }  

  getRedactFormat (sensitiveKeys: string[]) {
    return WinstonFormat((info) => {
      const result = traverse(info).forEach(function redactor (this: any) {
        if (this.key && sensitiveKeys.includes(this.key)) {
          this.update('[REDACTED]');
        }
      });
  
      const levelSym = Symbol.for('level');
      const splatSym = Symbol.for('splat');
  
      result[levelSym] = info[(levelSym as unknown) as string];
      result[splatSym] = info[(splatSym as unknown) as string];
  
      return result;
    });
  }
}
