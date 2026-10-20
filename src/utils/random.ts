import { randomBytes } from 'node:crypto';

/** Unique, readable username so parallel runs never collide, e.g. qa_w0_m1x2k3_a1b2c3. */
export function uniqueUsername(prefix = 'qa'): string {
  return `${prefix}_${Date.now().toString(36)}_${randomBytes(3).toString('hex')}`;
}

export function randomPassword(): string {
  return `Pw_${randomBytes(8).toString('hex')}`;
}
