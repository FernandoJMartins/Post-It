import IORedis from "ioredis";
import { env } from "./env";

const globalForRedis = globalThis as unknown as { redis?: IORedis };

// BullMQ exige maxRetriesPerRequest: null.
export const redis =
  globalForRedis.redis ??
  new IORedis(env.redisUrl, { maxRetriesPerRequest: null });

if (env.nodeEnv !== "production") globalForRedis.redis = redis;
