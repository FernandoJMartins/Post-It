import { prisma } from "@/lib/db";

// Reconciliation (README 96): posts presos em PUBLISHING > 30min viram UNKNOWN.
export async function runReconciliationTick(): Promise<number> {
  const cutoff = new Date(Date.now() - 30 * 60 * 1000);
  const res = await prisma.post.updateMany({
    where: { status: "PUBLISHING", lockedAt: { lt: cutoff } },
    data: { status: "UNKNOWN", lockedBy: null },
  });
  if (res.count > 0) console.log(`[reconciliation] ${res.count} posts marcados UNKNOWN`);
  return res.count;
}

export function startReconciliation(): NodeJS.Timeout {
  console.log("[reconciliation] iniciado");
  return setInterval(() => {
    runReconciliationTick().catch((e) => console.error("[reconciliation]", e));
  }, 60_000);
}
