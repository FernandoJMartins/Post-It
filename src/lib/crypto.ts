import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "./env";

// AES-256-GCM para tokens de acesso (README 11). Nunca guardar token em texto puro.
// Formato armazenado: iv(hex):authTag(hex):ciphertext(hex)
function key(): Buffer {
  const k = Buffer.from(env.encryptionKey, "hex");
  if (k.length !== 32) {
    throw new Error("ENCRYPTION_KEY deve ter 32 bytes (64 chars hex).");
  }
  return k;
}

export function encryptToken(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${enc.toString("hex")}`;
}

export function decryptToken(stored: string): string {
  const [ivHex, tagHex, dataHex] = stored.split(":");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]).toString("utf8");
}
