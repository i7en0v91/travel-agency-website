import { type LogAlwaysLevel, AppConfig, AppLoggerBase, type IAppLogger, type LogLevel } from '@golobe-demo/shared';
import { EOL } from 'os';
import { appendFileSync } from 'fs';
import { resolve } from 'pathe';
import omit from 'lodash-es/omit';

const LogFilePath = resolve('./testrun.log');

class TestFileLogger extends AppLoggerBase<typeof AppConfig['logging']['common']> {
  ts = () => new Date().toISOString();

  override getLogDestinations(): { local: boolean; outside: boolean; } {
    return {
      local: false,
      outside: true
    };
  }

  override logOutside(logData: { msg: string; level: LogLevel | (typeof LogAlwaysLevel); }): void {
    appendFileSync(LogFilePath, `${logData.level} ${this.ts()} ${logData.msg}, data=${JSON.stringify(omit(logData, 'msg', 'level'))}${EOL}`);
  }
}

export function createLogger (testCase: string) : IAppLogger {
  const result = new TestFileLogger(AppConfig.logging.common);
  return result.addContextProps({ prefix: testCase });
}
