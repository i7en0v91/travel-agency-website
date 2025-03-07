// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./../../node_modules/dayjs/plugin/utc.d.ts" />

import dayjs from 'dayjs';
import { NumMinutesInDay } from './constants';

export function getCurrentTimeUtc(): Date {
  return dayjs().utc().toDate();
}

export function eraseTimeOfDay (dateTime: Date): Date {
  const totalMs = dateTime.getTime();
  return new Date(totalMs - totalMs % (1000 * 60 * 60 * 24));
}

export function convertTimeOfDay (timeOfDayMinutes: number): { hour24: number, minutes: number } {
  timeOfDayMinutes = timeOfDayMinutes % NumMinutesInDay;
  const h = Math.max(0, Math.floor(timeOfDayMinutes / 60));
  const m = Math.max(0, Math.floor(timeOfDayMinutes - 60 * h)) % 60;
  return {
    hour24: h,
    minutes: m
  };
}

export function getTimeOfDay (dateTimeUtc: Date, utcOffsetMinutes: number): number {
  const localDate = dayjs(dateTimeUtc).utcOffset(utcOffsetMinutes);
  return localDate.hour() * 60 + localDate.minute();
}

export function getValueForTimeOfDayFormatting (dateTimeUtc: Date, utcOffsetMinutes: number): Date {
  const timeOfDay = convertTimeOfDay(getTimeOfDay(dateTimeUtc, utcOffsetMinutes));
  return dayjs().local().set('hour', timeOfDay.hour24).set('minute', timeOfDay.minutes).toDate();
}

export function getValueForFlightDurationFormatting (departTimeUtc: Date, arriveTimeUtc: Date): { hours: string, minutes: string } {
  const departFlightDuration = Math.round((arriveTimeUtc.getTime() - departTimeUtc.getTime()) / 60000);
  const duration = convertTimeOfDay(departFlightDuration);
  return {
    hours: duration.hour24.toFixed(0),
    minutes: duration.minutes.toFixed(0)
  };
}

export function getValueForFlightDayFormatting (dateTimeUtc: Date, utcOffsetMinutes: number): Date {
  return dayjs(dateTimeUtc).local().add(utcOffsetMinutes, 'minute').toDate();
}

export function formatValidThruDate(dueDate: Date): string {
  return `${dueDate.getMonth().toString().padStart(2, '0')}/${ (dueDate.getFullYear() % 100).toString().padStart(2, '0')}`;
}
