import { randomBytes, scrypt, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
const derive = promisify(scrypt);
export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export const newToken = () => randomBytes(32).toString('hex');
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const key = await derive(password, salt, 64) as Buffer;
  return `scrypt:${salt}:${key.toString('hex')}`;
}
export async function verifyPassword(password: string, encoded: string) {
  const [algorithm, salt, hash] = encoded.split(':');
  if (algorithm !== 'scrypt' || !salt || !hash) return false;
  const actual = await derive(password, salt, 64) as Buffer;
  const expected = Buffer.from(hash, 'hex');
  return expected.length === actual.length && timingSafeEqual(actual, expected);
}
export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
