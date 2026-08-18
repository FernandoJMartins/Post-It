import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";
import { acquireLock, releaseLock } from "@/lib/lock";
import { createScheduledPost, cancelPost } from "@/modules/posts/service";
import { HttpError } from "@/lib/errors";

// Requer Postgres + Redis (docker compose up). Se indisponível, a suíte é pulada.
const infraUp = await prisma
  .$queryRaw`SELECT 1`
  .then(() => true)
  .catch(() => false);
const suite = describe.skipIf(!infraUp);

// Fixtures isoladas (prefixo t_ para limpeza).
let userId: string;
let otherUserId: string;
let accountId: string;
let disconnectedAccountId: string;
let mediaReadyId: string;
let mediaProcessingId: string;

beforeAll(async () => {
  if (!infraUp) return;
  const user = await prisma.user.create({
    data: { name: "T", email: `t_${crypto.randomUUID()}@test.dev`, passwordHash: "x" },
  });
  userId = user.id;
  const other = await prisma.user.create({
    data: { name: "O", email: `t_${crypto.randomUUID()}@test.dev`, passwordHash: "x" },
  });
  otherUserId = other.id;

  const acc = await prisma.instagramAccount.create({
    data: { userId, username: "@t", status: "CONNECTED" },
  });
  accountId = acc.id;
  const accOff = await prisma.instagramAccount.create({
    data: { userId, username: "@toff", status: "DISCONNECTED" },
  });
  disconnectedAccountId = accOff.id;

  const m1 = await prisma.media.create({
    data: { userId, storageKey: "k1", filename: "a.mp4", status: "READY" },
  });
  mediaReadyId = m1.id;
  const m2 = await prisma.media.create({
    data: { userId, storageKey: "k2", filename: "b.mp4", status: "PROCESSING" },
  });
  mediaProcessingId = m2.id;
});

afterAll(async () => {
  if (infraUp && userId) {
    await prisma.user.deleteMany({ where: { id: { in: [userId, otherUserId] } } });
  }
  await prisma.$disconnect();
  redis.disconnect();
});

const future = () => new Date(Date.now() + 3_600_000);

suite("lock distribuído (README 30, 122)", () => {
  it("só um detentor por vez; libera e readquire", async () => {
    const key = `test-${crypto.randomUUID()}`;
    const a = await acquireLock(key, 5000);
    const b = await acquireLock(key, 5000);
    expect(a).toBeTruthy();
    expect(b).toBeNull(); // segundo worker não pega o mesmo lock
    await releaseLock(key, a!);
    const c = await acquireLock(key, 5000);
    expect(c).toBeTruthy();
    await releaseLock(key, c!);
  });
});

suite("reserva atômica do scheduler (README 33)", () => {
  it("apenas um tick move SCHEDULED -> QUEUED", async () => {
    const post = await createScheduledPost({
      userId,
      instagramAccountId: accountId,
      mediaId: mediaReadyId,
      scheduledAtUtc: future(),
      timezone: "America/Fortaleza",
    });

    // Duas reservas concorrentes com guarda de status.
    const reserve = () =>
      prisma.post.updateMany({
        where: { id: post.id, status: "SCHEDULED" },
        data: { status: "QUEUED" },
      });
    const [r1, r2] = await Promise.all([reserve(), reserve()]);
    expect(r1.count + r2.count).toBe(1); // exatamente um vence

    await prisma.post.delete({ where: { id: post.id } });
  });
});

suite("regras de agendamento (README 21)", () => {
  it("cria post SCHEDULED no caminho feliz", async () => {
    const post = await createScheduledPost({
      userId,
      instagramAccountId: accountId,
      mediaId: mediaReadyId,
      scheduledAtUtc: future(),
      timezone: "America/Fortaleza",
    });
    expect(post.status).toBe("SCHEDULED");
    expect(post.idempotencyKey).toMatch(/^publish:/);
    await prisma.post.delete({ where: { id: post.id } });
  });

  it("rejeita horário no passado", async () => {
    await expect(
      createScheduledPost({
        userId,
        instagramAccountId: accountId,
        mediaId: mediaReadyId,
        scheduledAtUtc: new Date(Date.now() - 1000),
        timezone: "America/Fortaleza",
      }),
    ).rejects.toMatchObject({ code: "scheduled_in_past" });
  });

  it("rejeita conta desconectada", async () => {
    await expect(
      createScheduledPost({
        userId,
        instagramAccountId: disconnectedAccountId,
        mediaId: mediaReadyId,
        scheduledAtUtc: future(),
        timezone: "America/Fortaleza",
      }),
    ).rejects.toMatchObject({ code: "account_not_connected" });
  });

  it("rejeita mídia não pronta", async () => {
    await expect(
      createScheduledPost({
        userId,
        instagramAccountId: accountId,
        mediaId: mediaProcessingId,
        scheduledAtUtc: future(),
        timezone: "America/Fortaleza",
      }),
    ).rejects.toMatchObject({ code: "media_not_ready" });
  });

  it("rejeita conflito de horário na mesma conta (README 22)", async () => {
    const at = future();
    const p = await createScheduledPost({
      userId,
      instagramAccountId: accountId,
      mediaId: mediaReadyId,
      scheduledAtUtc: at,
      timezone: "America/Fortaleza",
    });
    await expect(
      createScheduledPost({
        userId,
        instagramAccountId: accountId,
        mediaId: mediaReadyId,
        scheduledAtUtc: at,
        timezone: "America/Fortaleza",
      }),
    ).rejects.toMatchObject({ code: "time_conflict" });
    await prisma.post.delete({ where: { id: p.id } });
  });
});

suite("multi-tenancy (README 48, 125)", () => {
  it("usuário não cancela post de outro (404)", async () => {
    const p = await createScheduledPost({
      userId,
      instagramAccountId: accountId,
      mediaId: mediaReadyId,
      scheduledAtUtc: future(),
      timezone: "America/Fortaleza",
    });
    let err: unknown;
    try {
      await cancelPost(otherUserId, p.id);
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(HttpError);
    expect((err as HttpError).status).toBe(404);
    await prisma.post.delete({ where: { id: p.id } });
  });
});
