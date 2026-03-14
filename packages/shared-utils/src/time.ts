import type { IsoUtcDateTimeString } from '@upi-spend-tracker/shared-types';

export function toIsoUtcDateTimeString(date: Date): IsoUtcDateTimeString {
  return date.toISOString() as IsoUtcDateTimeString;
}

export function getCurrentUtcTimestamp(): IsoUtcDateTimeString {
  return toIsoUtcDateTimeString(new Date());
}
