import { randomBytes } from 'crypto';
import { sha256 } from 'ohash';

export function getSomeSalt (): string {
  return randomBytes(12).toString('base64');
}

export function calculatePasswordHash (password: string): string {
  return sha256(password);
};

export function verifyPassword (password: string, salt: string, expectedHash: string) {
  return expectedHash === calculatePasswordHash(`${salt}${password}`);
}

export function generateNewTokenValue (): { value: string, hash: string } {
  const value = randomBytes(12).toString('base64');
  return { value, hash: sha256(value) };
}

export function verifyTokenValue (value: string, hash: string): boolean {
  return sha256(value) === hash;
}
