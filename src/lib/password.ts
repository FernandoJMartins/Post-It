import { hash, verify } from "@node-rs/argon2";

// Argon2id (README 7). Parâmetros conservadores para servidor web.
const opts = { memoryCost: 19456, timeCost: 2, parallelism: 1 };

export function hashPassword(plain: string): Promise<string> {
  return hash(plain, opts);
}

export function verifyPassword(digest: string, plain: string): Promise<boolean> {
  return verify(digest, plain);
}
