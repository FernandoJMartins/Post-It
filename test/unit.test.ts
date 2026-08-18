import { describe, it, expect } from "vitest";
import { encryptToken, decryptToken } from "@/lib/crypto";
import { validateUpload, PlatformMediaRules } from "@/modules/media/rules";
import { env } from "@/lib/env";

describe("crypto de tokens (README 11)", () => {
  it("faz roundtrip encrypt/decrypt", () => {
    const secret = "token_super_secreto_123";
    const enc = encryptToken(secret);
    expect(enc).not.toContain(secret); // nunca em texto puro
    expect(enc.split(":")).toHaveLength(3); // iv:tag:ciphertext
    expect(decryptToken(enc)).toBe(secret);
  });

  it("gera ciphertext diferente a cada chamada (IV aleatório)", () => {
    expect(encryptToken("x")).not.toBe(encryptToken("x"));
  });

  it("falha ao adulterar o ciphertext (GCM auth)", () => {
    const enc = encryptToken("abc");
    const [iv, tag, data] = enc.split(":");
    const tampered = `${iv}:${tag}:${data.slice(0, -2)}ff`;
    expect(() => decryptToken(tampered)).toThrow();
  });
});

describe("PlatformMediaRules (README 15)", () => {
  it("aceita mp4 dentro do limite", () => {
    expect(validateUpload("video/mp4", 1024)).toBeNull();
  });
  it("rejeita mime não suportado", () => {
    expect(validateUpload("image/png", 1024)).toBe("mime_nao_suportado");
  });
  it("rejeita arquivo acima do limite", () => {
    expect(validateUpload("video/mp4", PlatformMediaRules.maxSizeBytes + 1)).toBe("arquivo_muito_grande");
  });
});

describe("config de retry (README 27)", () => {
  it("backoff é crescente (exponential-ish)", () => {
    const b = env.retryBackoffMs;
    expect(b.length).toBeGreaterThanOrEqual(5);
    for (let i = 1; i < b.length; i++) expect(b[i]).toBeGreaterThan(b[i - 1]);
  });
});
