import * as Crypto from 'expo-crypto';

/** Generates a RFC4122 v4 UUID for use as a primary key. */
export function newId(): string {
  return Crypto.randomUUID();
}

export function now(): number {
  return Date.now();
}
