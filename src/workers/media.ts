import { Worker } from "bullmq";
import { HeadObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";
import { QUEUE, type MediaJob, notificationsQueue } from "@/lib/queues";
import { s3, presignGet } from "@/lib/storage";
import { scanObject } from "@/lib/antivirus";

const bucket = process.env.STORAGE_BUCKET ?? "postador-media";

// Media worker (README 14, 142): apenas processa mídia. Não agenda posts.
export function startMedia(): Worker {
  const worker = new Worker<MediaJob>(
    QUEUE.media,
    async (job) => {
      const { mediaId } = job.data;
      const media = await prisma.media.findUnique({ where: { id: mediaId } });
      if (!media || media.deletedAt) return;

      try {
        // Confirma integridade: o objeto existe no storage?
        const head = await s3.send(
          new HeadObjectCommand({ Bucket: bucket, Key: media.storageKey }),
        );

        // Verificação antivírus antes de liberar (README 53).
        const scan = await scanObject(media.storageKey);
        if (!scan.clean) {
          await prisma.media.update({ where: { id: mediaId }, data: { status: "FAILED" } });
          console.warn(`[media] ${mediaId} reprovado no antivirus (${scan.engine})`);
          return;
        }

        const fileUrl = await presignGet(media.storageKey);

        // TODO: extrair duração/resolução e gerar thumbnail (ffmpeg/ffprobe).
        await prisma.media.update({
          where: { id: mediaId },
          data: {
            status: "READY",
            fileUrl,
            sizeBytes: head.ContentLength ? BigInt(head.ContentLength) : media.sizeBytes,
          },
        });

        await notificationsQueue.add("notify", {
          userId: media.userId,
          type: "MEDIA_READY",
          payload: { mediaId },
        });
      } catch (e) {
        await prisma.media.update({ where: { id: mediaId }, data: { status: "FAILED" } });
        console.error(`[media] falha ${mediaId}:`, (e as Error).message);
      }
    },
    { connection: redis, concurrency: 3 },
  );
  console.log("[media] iniciado");
  return worker;
}
