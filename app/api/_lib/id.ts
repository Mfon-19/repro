import { randomUUID } from 'crypto';

export function generateId(prefix: string) {
  return `${prefix}_${randomUUID()}`;
}
