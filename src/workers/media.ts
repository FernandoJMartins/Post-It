import { Worker } from "bullmq";
import { HeadObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";
import { QUEUE, type MediaJob, notificationsQueue } from "@/lib/queues";
import { s3, presignGet } from "@/lib/storage";
import { scanObject } from "@/lib/antivirus";
import { processMedia } from "@/modules/media/process";
import { PlatformMediaRules } from "@/modules/media/rules";

const bucket = process.env.STORAGE_BUCKET ?? "postador-media";

// Media worker (README 14, 52, 56): valida integridade/assinatura, extrai metadados,
// gera thumbnail e libera a mídia. Não agenda posts.
export function startMedia(): Worker {
  const worker = new Worker<MediaJob>(
    QUEUE.media,
    async (job) => {
      const { mediaId } = job.data;
      const media = await prisma.media.findUnique({ where: { id: mediaId } });
      if (!media || media.deletedAt) return;

      try {
        // Objeto existe no storage?
        await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: media.storageKey }));

        // Antivírus antes de processar (README 53).
        const scan = await scanObject(media.storageKey);
        if (!scan.clean) {
          await prisma.media.update({ where: { id: mediaId }, data: { status: "FAILED" } });
          return;
        }

        // Assinatura real + metadados (ffprobe) + thumbnail (ffmpeg).
        const probe = await processMedia(media.storageKey);

        // MIME real por file signature (README 52).
        if (!probe.mime || !PlatformMediaRules.allowedMime.includes(probe.mime)) {
          await prisma.media.update({ where: { id: mediaId }, data: { status: "FAILED" } });
          console.warn(`[media] ${mediaId} MIME real invalido: ${probe.mime}`);
          return;
        }

        const fileUrl = await presignGet(media.storageKey);
        await prisma.media.update({
          where: { id: mediaId },
          data: {
            status: "READY",
            fileUrl,
            mimeType: probe.mime,
            durationSeconds: probe.durationSeconds,
            width: probe.width,
            height: probe.height,
            thumbnailUrl: probe.thumbnailUrl,
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
    { connection: redis, concurrency: 2 },
  );
  console.log("[media] iniciado");
  return worker;
}
