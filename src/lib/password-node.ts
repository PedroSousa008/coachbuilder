import { pbkdf2Sync, randomBytes, timingSafeEqual } from "crypto";

/** Alinhado com `password-crypto.ts` (browser). */
const ITERATIONS = 120_000;
const SALT_BYTES = 16;
const HASH_BYTES = 32;

function bufferToHex(buf: Buffer): string {
  return buf.toString("hex");
}

export function hashPasswordNode(password: string): { salt: string; hash: string } {
  const salt = randomBytes(SALT_BYTES);
  const hash = pbkdf2Sync(password, salt, ITERATIONS, HASH_BYTES, "sha256");
  return { salt: bufferToHex(salt), hash: bufferToHex(hash) };
}

export function verifyPasswordNode(password: string, saltHex: string, hashHex: string): boolean {
  try {
    const salt = Buffer.from(saltHex, "hex");
    if (salt.length !== SALT_BYTES) return false;
    const expected = Buffer.from(hashHex, "hex");
    if (expected.length !== HASH_BYTES) return false;
    const computed = pbkdf2Sync(password, salt, ITERATIONS, HASH_BYTES, "sha256");
    return timingSafeEqual(computed, expected);
  } catch {
    return false;
  }
}
