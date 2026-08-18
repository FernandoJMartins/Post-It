import { Worker } from "bullmq";
import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";
import { QUEUE, type PublishJob, notificationsQueue } from "@/lib/queues";
import { acquireLock, releaseLock } from "@/lib/lock";
import { decryptToken } from "@/lib/crypto";
import { presignGet } from "@/lib/storage";
import {
  publishToInstagram,
  PermanentPublishError,
} from "@/modules/publishing/instagram";

// Publisher (README 141): consome fila, adquire lock, verifica idempotência, publica.
export function startPublisher(): Worker {
  const worker = new Worker<PublishJob>(
    QUEUE.publish,
    async (job) => {
      const { postId } = job.data;

      const post = await prisma.post.findUnique({
        where: { id: postId },
        include: { account: true, media: true },
      });
      if (!post) return;

      // Idempotência (README 24): já publicado -> não repetir.
      if (post.status === "PUBLISHED") return;
      if (["CANCELLED", "FAILED_PERMANENTLY"].includes(post.status)) return;

      // Lock distribuído por post (README 30, 33).
      const token = await acquireLock(`publish:${postId}`, 60_000);
      if (!token) {
        console.log(`[publisher] lock ocupado, pulando ${postId}`);
        return;
      }

      const attemptNumber = post.attemptCount + 1;
      await prisma.post.update({
        where: { id: postId },
        data: { status: "PUBLISHING", attemptCount: attemptNumber, lockedBy: token, lockedAt: new Date() },
      });
      const attempt = await prisma.publicationAttempt.create({
        data: { postId, attemptNumber, status: "PUBLISHING" },
      });

      try {
        if (!post.account.accessTokenEncrypted) {
          throw new PermanentPublishError("invalid_token");
        }
        const accessToken = decryptToken(post.account.accessTokenEncrypted);

        // URL pública fresca para a Meta baixar o vídeo (presigned, não expira no meio).
        const mediaUrl = post.media.storageKey
          ? await presignGet(post.media.storageKey)
          : post.media.fileUrl ?? "";

        const result = await publishToInstagram({
          accessToken,
          externalAccountId: post.account.externalAccountId ?? "",
          mediaUrl,
          caption: post.caption ?? undefined,
          idempotencyKey: post.idempotencyKey,
        });

        await prisma.$transaction([
          prisma.post.update({
            where: { id: postId },
            data: {
              status: "PUBLISHED",
              publishedAt: new Date(),
              externalPostId: result.externalPostId,
              errorCode: null,
              errorMessage: null,
              lockedBy: null,
              lockedAt: null,
            },
          }),
          prisma.publicationAttempt.update({
            where: { id: attempt.id },
            data: { status: "PUBLISHED", finishedAt: new Date(), externalResponseId: result.externalPostId },
          }),
        ]);

        await notificationsQueue.add("notify", {
          userId: post.userId,
          type: "POST_PUBLISHED",
          payload: { postId },
        });
      } catch (err) {
        const permanent = err instanceof PermanentPublishError;
        const code = (err as Error).message ?? "unknown_error";

        await prisma.$transaction([
          prisma.post.update({
            where: { id: postId },
            data: {
              status: permanent ? "FAILED_PERMANENTLY" : "FAILED",
              errorCode: code,
              errorMessage: code,
              lockedBy: null,
              lockedAt: null,
            },
          }),
          prisma.publicationAttempt.update({
            where: { id: attempt.id },
            data: { status: permanent ? "FAILED_PERMANENTLY" : "FAILED", finishedAt: new Date(), errorCode: code, errorMessage: code },
          }),
        ]);

        await notificationsQueue.add("notify", {
          userId: post.userId,
          type: "POST_FAILED",
          payload: { postId, code },
        });

        // Erro permanente não deve sofrer retry (README 28).
        if (permanent) return;
        throw err; // temporário: BullMQ reprocessa com backoff
      } finally {
        await releaseLock(`publish:${postId}`, token);
      }
    },
    { connection: redis, concurrency: 5 },
  );

  worker.on("failed", (job, err) => {
    console.error(`[publisher] job ${job?.id} falhou:`, err.message);
  });
  console.log("[publisher] iniciado");
  return worker;
}
