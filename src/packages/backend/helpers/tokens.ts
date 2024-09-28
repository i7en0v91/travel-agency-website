import { MaxTokenConsumeAttempts, AppConfig } from '@golobe-demo/shared';
import { randomBytes } from 'crypto';
import { sha256 } from 'ohash';
import dayjs from 'dayjs';

export function generateNewTokenValue (): { value: string, hash: string } {
  const value = randomBytes(12).toString('base64');
  return { value, hash: sha256(value) };
}

export function verifyTokenValue (value: string, hash: string): boolean {
  return sha256(value) === hash;
}

export function isTokenActive (isDeleted: boolean, attemptsMade: number, createdUtc: Date): 'token-expired' | 'already-consumed' | 'active' {
  let result: 'token-expired' | 'already-consumed' | 'active' = 'active';
  if (attemptsMade >= MaxTokenConsumeAttempts) {
    result = 'token-expired';
  }
  if (isDeleted) {
    result = 'already-consumed';
  }
  if (dayjs().utc().add(-AppConfig.verificationTokenExpirationHours, 'hour').isAfter(createdUtc)) {
    result = 'token-expired';
  }

  return result;
};