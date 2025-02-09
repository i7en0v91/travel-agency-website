import { AppExceptionCodeEnum, AppException, type IAppLogger } from '@golobe-demo/shared';
import type { DatePickerDate } from 'v-calendar/dist/types/src/use/datePicker.js';
import type Locale from 'v-calendar/dist/types/src/utils/locale.js';
import isDate from 'lodash-es/isDate';
import isNumber from 'lodash-es/isNumber';
import isString from 'lodash-es/isString';

export function datePickerValueToDate(value: DatePickerDate, locale: Locale | undefined, logger: IAppLogger): Date {
  if(isDate(value)) {
    logger.debug('(helpers:components) selected value is Date', value);
    return value;
  }
  if(isNumber(value)) {
    logger.debug('(helpers:components) selected value is number', value);
    return new Date(value);
  }

  if(!locale) {
    logger.warn('(helpers:components) failed to convert selected date - locale not initialized', null, value);
    throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'failed to parse selected date', 'error-stub');
  }

  logger.debug('(helpers:components) converting selected value', value);
  let result: Date;
  if(isString(value)) {
    result = locale.parseDate(value, locale.masks);
  } else {
    const parsed = value ? locale.toDateOrNull(value) : null;
    if(!parsed) {
      logger.warn('(helpers:components) failed to parse selected date', null, value);
      throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'failed to parse selected date', 'error-stub');
    }        
    result = parsed;
  }    
  logger.debug('(helpers:components) selected value converted', result);

  return result;
}

export const IconSvgCustomizers = {
  fill(color: string) {
    return (content: string) => content.replace(/fill="[^"]*"/gi,  `fill="${color}"`);
  },
  /**
   * @param value from 0.0 to 1.0
   */
  opacity(value: number) {
    return (content: string) => content.replace(/fill="/gi,  ` opacity="${value.toFixed(2)}" fill="`);
  }
};