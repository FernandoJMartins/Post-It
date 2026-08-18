import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/errors";

type BulkInput = {
  userId: string;
  accountId: string;
  mediaIds: string[];
  firstAtUtc: Date;
  intervalMinutes: number;
  timezone: string;
};

export type BulkSlot = {
  mediaId: string;
  filename: string;
  scheduledAt: string;
  conflict: boolean;
};

// Calcula os horários (1º horário + intervalo) e marca conflitos (README 60, 61).
export async function planBulk(input: BulkInput): Promise<BulkSlot[]> {
  const { userId, accountId, mediaIds, firstAtUtc, intervalMinutes } = input;

  const account = await prisma.instagramAccount.findFirst({
    where: { id: accountId, userId, deletedAt: null },
  });
  if (!account) throw new HttpError(404, "account_not_found");

  const media = await prisma.media.findMany({
    where: { id: { in: mediaIds }, userId, deletedAt: null, status: "READY" },
    select: { id: true, filename: true },
  });
  const nameById = new Map(media.map((m) => [m.id, m.filename]));

  const slots: BulkSlot[] = [];
  for (let i = 0; i < mediaIds.length; i++) {
    const mediaId = mediaIds[i];
    if (!nameById.has(mediaId)) continue; // ignora mídia inválida/não pronta
    const at = new Date(firstAtUtc.getTime() + i * intervalMinutes * 60_000);

    const conflict = await prisma.post.findFirst({
      where: {
        instagramAccountId: accountId,
        scheduledAt: at,
        status: { in: ["SCHEDULED", "QUEUED", "PROCESSING", "PUBLISHING"] },
        deletedAt: null,
      },
      select: { id: true },
    });

    slots.push({
      mediaId,
      filename: nameById.get(mediaId)!,
      scheduledAt: at.toISOString(),
      conflict: !!conflict,
    });
  }
  return slots;
}

// Cria os posts do plano. Pula conflitos (não sobrescreve — README 61).
export async function commitBulk(input: BulkInput): Promise<{ created: number; skipped: number }> {
  const slots = await planBulk(input);
  if (input.firstAtUtc.getTime() <= Date.now()) throw new HttpError(422, "scheduled_in_past");

  const toCreate = slots.filter((s) => !s.conflict);
  if (toCreate.length === 0) return { created: 0, skipped: slots.length };

  await prisma.post.createMany({
    data: toCreate.map((s) => ({
      userId: input.userId,
      instagramAccountId: input.accountId,
      mediaId: s.mediaId,
      scheduledAt: new Date(s.scheduledAt),
      timezone: input.timezone,
      status: "SCHEDULED" as const,
      idempotencyKey: `publish:${crypto.randomUUID()}`,
    })),
  });

  return { created: toCreate.length, skipped: slots.length - toCreate.length };
}
