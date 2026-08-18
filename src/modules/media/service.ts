import { prisma } from "@/lib/db";
import { presignGet, deleteObject } from "@/lib/storage";
import { HttpError } from "@/lib/session";

export async function listMedia(userId: string) {
  const items = await prisma.media.findMany({
    where: { userId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  // Serializa BigInt e adiciona URL de preview assinada quando pronta.
  return Promise.all(
    items.map(async (m) => ({
      id: m.id,
      filename: m.filename,
      status: m.status,
      mimeType: m.mimeType,
      sizeBytes: m.sizeBytes ? Number(m.sizeBytes) : null,
      durationSeconds: m.durationSeconds,
      createdAt: m.createdAt,
      previewUrl: m.status === "READY" ? await presignGet(m.storageKey, 3600) : null,
    })),
  );
}

export async function markUploaded(userId: string, mediaId: string) {
  const media = await prisma.media.findFirst({ where: { id: mediaId, userId, deletedAt: null } });
  if (!media) throw new HttpError(404, "media_not_found");
  // Confirma upload e coloca em processamento (README 14).
  return prisma.media.update({
    where: { id: media.id },
    data: { status: "PROCESSING" },
  });
}

export async function softDeleteMedia(userId: string, mediaId: string) {
  const media = await prisma.media.findFirst({ where: { id: mediaId, userId, deletedAt: null } });
  if (!media) throw new HttpError(404, "media_not_found");
  // Bloqueia exclusão se houver post agendado dependente.
  const pending = await prisma.post.count({
    where: { mediaId, status: { in: ["SCHEDULED", "QUEUED", "PROCESSING", "PUBLISHING"] }, deletedAt: null },
  });
  if (pending > 0) throw new HttpError(409, "media_em_uso");

  await prisma.media.update({ where: { id: media.id }, data: { deletedAt: new Date() } });
  try {
    await deleteObject(media.storageKey);
  } catch {
    /* objeto pode não existir; segue */
  }
}
