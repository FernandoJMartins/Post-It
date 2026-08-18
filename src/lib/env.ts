// Config centralizada (README 90). Nunca espalhar constantes pelo código.
// Não lançar no import: o build do Next executa os módulos sem env carregado.
// Prisma/ioredis validam suas próprias URLs em tempo de execução.
export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  appUrl: process.env.APP_URL ?? "http://localhost:3000",
  databaseUrl: process.env.DATABASE_URL ?? "",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  encryptionKey: process.env.ENCRYPTION_KEY ?? "",
  scheduler: {
    pollMs: Number(process.env.SCHEDULER_POLL_MS ?? 5000),
    maxAttempts: Number(process.env.MAX_ATTEMPTS ?? 5),
  },
  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60000),
    max: Number(process.env.RATE_LIMIT_MAX ?? 100),
  },
  // Backoff em ms por tentativa (README 27). Configurável.
  retryBackoffMs: [0, 30_000, 120_000, 600_000, 1_800_000],
};
