import { redis } from "./redis";
import { env } from "./env";

// Rate limit por chave (README 50) usando Redis. Janela fixa com INCR + EXPIRE.
export async function rateLimit(
  key: string,
  max = env.rateLimit.max,
  windowMs = env.rateLimit.windowMs,
): Promise<{ ok: boolean; remaining: number }> {
  const redisKey = `ratelimit:${key}`;
  const count = await redis.incr(redisKey);
  if (count === 1) {
    await redis.pexpire(redisKey, windowMs);
  }
  return { ok: count <= max, remaining: Math.max(0, max - count) };
}
