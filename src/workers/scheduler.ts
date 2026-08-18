import { prisma } from "@/lib/db";
import { publishQueue } from "@/lib/queues";
import { env } from "@/lib/env";

// Scheduler (README 32, 141): detecta posts vencidos e enfileira. NÃO publica.
// Reserva atômica via updateMany para evitar dupla-detecção entre schedulers.
export async function runSchedulerTick(): Promise<number> {
  const now = new Date();

  const due = await prisma.post.findMany({
    where: {
      status: "SCHEDULED",
      scheduledAt: { lte: now },
      deletedAt: null,
      account: { status: "CONNECTED", postingEnabled: true, deletedAt: null },
    },
    orderBy: { scheduledAt: "asc" },
    take: 100,
    select: { id: true },
  });

  let enqueued = 0;
  for (const { id } of due) {
    // Reserva: só um tick consegue mover SCHEDULED -> QUEUED.
    const reserved = await prisma.post.updateMany({
      where: { id, status: "SCHEDULED" },
      data: { status: "QUEUED" },
    });
    if (reserved.count === 0) continue;

    await publishQueue.add(
      "publish",
      { postId: id },
      {
        jobId: `publish-${id}`, // idempotência na fila (sem ':')
        attempts: env.scheduler.maxAttempts,
        backoff: { type: "fixed", delay: 30_000 },
        removeOnComplete: 1000,
        removeOnFail: 5000,
      },
    );
    enqueued++;
  }
  return enqueued;
}

export function startScheduler(): NodeJS.Timeout {
  console.log(`[scheduler] iniciado (poll ${env.scheduler.pollMs}ms)`);
  return setInterval(async () => {
    try {
      const n = await runSchedulerTick();
      if (n > 0) console.log(`[scheduler] enfileirados ${n} posts`);
    } catch (e) {
      console.error("[scheduler] erro", e);
    }
  }, env.scheduler.pollMs);
}
