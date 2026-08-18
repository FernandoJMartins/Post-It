import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/errors";

// Regras de agendamento (README 21, 65). Toda validação no backend.
type CreatePostInput = {
  userId: string;
  instagramAccountId: string;
  mediaId: string;
  caption?: string;
  scheduledAtUtc: Date;
  timezone: string;
};

export async function createScheduledPost(input: CreatePostInput) {
  const { userId, instagramAccountId, mediaId, scheduledAtUtc } = input;

  // Regra 9 / multi-tenancy: recursos devem pertencer ao usuário.
  const account = await prisma.instagramAccount.findFirst({
    where: { id: instagramAccountId, userId, deletedAt: null },
  });
  if (!account) throw new HttpError(404, "account_not_found");

  const media = await prisma.media.findFirst({
    where: { id: mediaId, userId, deletedAt: null },
  });
  if (!media) throw new HttpError(404, "media_not_found");

  // Regra 3: conta desconectada não publica.
  if (account.status !== "CONNECTED") {
    throw new HttpError(422, "account_not_connected");
  }
  // Regra 4: mídia precisa estar pronta.
  if (media.status !== "READY") {
    throw new HttpError(422, "media_not_ready");
  }
  // Não agendar no passado (README 21).
  if (scheduledAtUtc.getTime() <= Date.now()) {
    throw new HttpError(422, "scheduled_in_past");
  }

  // Conflito de horário exato para a mesma conta (README 22).
  const conflict = await prisma.post.findFirst({
    where: {
      instagramAccountId,
      scheduledAt: scheduledAtUtc,
      status: { in: ["SCHEDULED", "QUEUED", "PROCESSING", "PUBLISHING"] },
      deletedAt: null,
    },
  });
  if (conflict) throw new HttpError(409, "time_conflict");

  return prisma.post.create({
    data: {
      userId,
      instagramAccountId,
      mediaId,
      caption: input.caption,
      scheduledAt: scheduledAtUtc,
      timezone: input.timezone,
      status: "SCHEDULED",
      idempotencyKey: `publish:${crypto.randomUUID()}`,
    },
  });
}

// "Tentar novamente" (README 29): nova execução controlada do MESMO post.
export async function retryPost(userId: string, postId: string) {
  const post = await prisma.post.findFirst({
    where: { id: postId, userId, deletedAt: null },
    include: { account: true, media: true },
  });
  if (!post) throw new HttpError(404, "post_not_found");
  if (!["FAILED", "FAILED_PERMANENTLY", "CANCELLED"].includes(post.status)) {
    throw new HttpError(409, "post_nao_retentavel");
  }
  if (post.account.status !== "CONNECTED") throw new HttpError(422, "account_not_connected");
  if (post.media.status !== "READY") throw new HttpError(422, "media_not_ready");

  return prisma.post.update({
    where: { id: postId },
    data: {
      status: "SCHEDULED",
      scheduledAt: new Date(),
      attemptCount: 0,
      errorCode: null,
      errorMessage: null,
      idempotencyKey: `publish:${crypto.randomUUID()}`, // nova execução
    },
  });
}

// Duplicar/Reutilizar (README 40, 41): cria NOVO post a partir de um existente.
// Nunca altera o post original. Reaproveita todas as regras de agendamento.
export async function duplicatePost(userId: string, postId: string, scheduledAtUtc?: Date) {
  const src = await prisma.post.findFirst({ where: { id: postId, userId, deletedAt: null } });
  if (!src) throw new HttpError(404, "post_not_found");
  const at = scheduledAtUtc ?? new Date(Date.now() + 60 * 60 * 1000); // padrão: +1h
  return createScheduledPost({
    userId,
    instagramAccountId: src.instagramAccountId,
    mediaId: src.mediaId,
    caption: src.caption ?? undefined,
    scheduledAtUtc: at,
    timezone: src.timezone,
  });
}

export async function cancelPost(userId: string, postId: string) {
  const post = await prisma.post.findFirst({ where: { id: postId, userId } });
  if (!post) throw new HttpError(404, "post_not_found");

  // README 37: só cancela antes de PUBLISHING.
  if (["PUBLISHING", "PUBLISHED"].includes(post.status)) {
    throw new HttpError(409, "already_processing");
  }
  return prisma.post.update({
    where: { id: postId },
    data: { status: "CANCELLED" },
  });
}
