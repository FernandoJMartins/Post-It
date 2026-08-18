import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/errors";
import { wallTimeToUtc, zonedParts } from "@/lib/tz";
import type { RecurrenceRule } from "@prisma/client";

type CreateInput = {
  userId: string;
  accountId: string;
  name: string;
  rule: RecurrenceRule;
  weekday?: number;
  timeOfDay: string; // "HH:MM"
  timezone: string;
  mediaIds: string[];
};

export async function createRecurring(input: CreateInput) {
  if (!/^\d{2}:\d{2}$/.test(input.timeOfDay)) throw new HttpError(422, "hora_invalida");
  const account = await prisma.instagramAccount.findFirst({
    where: { id: input.accountId, userId: input.userId, deletedAt: null },
  });
  if (!account) throw new HttpError(404, "account_not_found");
  if (input.mediaIds.length === 0) throw new HttpError(422, "fila_vazia");
  if (input.rule === "WEEKLY" && (input.weekday == null || input.weekday < 0 || input.weekday > 6)) {
    throw new HttpError(422, "weekday_invalido");
  }
  return prisma.recurringSchedule.create({ data: { ...input } });
}

export function listRecurring(userId: string) {
  return prisma.recurringSchedule.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { account: { select: { username: true } } },
  });
}

export async function setActive(userId: string, id: string, active: boolean) {
  const r = await prisma.recurringSchedule.findFirst({ where: { id, userId } });
  if (!r) throw new HttpError(404, "recurring_not_found");
  return prisma.recurringSchedule.update({ where: { id }, data: { active } });
}

export async function deleteRecurring(userId: string, id: string) {
  const r = await prisma.recurringSchedule.findFirst({ where: { id, userId } });
  if (!r) throw new HttpError(404, "recurring_not_found");
  await prisma.recurringSchedule.delete({ where: { id } });
}

// Regra dispara hoje (no fuso)? DAILY sempre; WEEKDAYS seg-sex; WEEKLY em weekday.
function firesToday(rule: RecurrenceRule, weekday: number | null, todayWeekday: number): boolean {
  if (rule === "DAILY") return true;
  if (rule === "WEEKDAYS") return todayWeekday >= 1 && todayWeekday <= 5;
  if (rule === "WEEKLY") return weekday === todayWeekday;
  return false;
}

// Processa uma recorrência: se a ocorrência de hoje já venceu e ainda não foi criada,
// cria UM post (rotação da fila) e avança o cursor (README 62 - sob demanda).
export async function processRecurring(now = new Date()): Promise<number> {
  const schedules = await prisma.recurringSchedule.findMany({ where: { active: true } });
  let created = 0;

  for (const s of schedules) {
    const { y, m, d, weekday } = zonedParts(s.timezone, now);
    if (!firesToday(s.rule, s.weekday, weekday)) continue;

    const [hh, mm] = s.timeOfDay.split(":").map(Number);
    const occurrenceUtc = wallTimeToUtc(s.timezone, y, m, d, hh, mm);
    if (now.getTime() < occurrenceUtc.getTime()) continue; // ainda não chegou a hora

    const key = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}@${s.timeOfDay}`;
    if (s.lastOccurrenceKey === key) continue; // já criada

    if (s.mediaIds.length === 0) continue;
    const mediaId = s.mediaIds[s.cursor % s.mediaIds.length];

    // Só cria se a mídia ainda existe e está pronta e a conta conectada.
    const [media, account] = await Promise.all([
      prisma.media.findFirst({ where: { id: mediaId, deletedAt: null, status: "READY" } }),
      prisma.instagramAccount.findFirst({ where: { id: s.accountId, status: "CONNECTED", postingEnabled: true, deletedAt: null } }),
    ]);

    // Avança o marcador mesmo se pular, para não retentar a mesma ocorrência em loop.
    const advance = prisma.recurringSchedule.update({
      where: { id: s.id },
      data: { lastOccurrenceKey: key, cursor: (s.cursor + 1) % Math.max(1, s.mediaIds.length) },
    });

    if (!media || !account) {
      await advance;
      continue;
    }

    await prisma.$transaction([
      prisma.post.create({
        data: {
          userId: s.userId,
          instagramAccountId: s.accountId,
          mediaId,
          scheduledAt: occurrenceUtc,
          timezone: s.timezone,
          status: "SCHEDULED",
          idempotencyKey: `publish:${crypto.randomUUID()}`,
        },
      }),
      advance,
    ]);
    created++;
  }
  return created;
}
