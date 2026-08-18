import { redis } from "./redis";

// Lock distribuído (README 30). SET NX PX + release seguro via Lua.
export async function acquireLock(key: string, ttlMs: number): Promise<string | null> {
  const token = crypto.randomUUID();
  const res = await redis.set(`lock:${key}`, token, "PX", ttlMs, "NX");
  return res === "OK" ? token : null;
}

const releaseScript = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end`;

export async function releaseLock(key: string, token: string): Promise<void> {
  await redis.eval(releaseScript, 1, `lock:${key}`, token);
}
