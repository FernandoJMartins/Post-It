import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, errorResponse, HttpError } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { presignPut } from "@/lib/storage";
import { validateUpload } from "@/modules/media/rules";

export const dynamic = "force-dynamic";

const schema = z.object({
  filename: z.string().min(1).max(200),
  mimeType: z.string(),
  sizeBytes: z.number().int().positive(),
});

// Gera URL assinada e cria o registro de mídia em UPLOADING (README 13).
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const rl = await rateLimit(`upload:${user.id}`, 30);
    if (!rl.ok) throw new HttpError(429, "rate_limited");

    const body = schema.parse(await req.json());
    const err = validateUpload(body.mimeType, body.sizeBytes);
    if (err) throw new HttpError(422, err);

    const media = await prisma.media.create({
      data: {
        userId: user.id,
        filename: body.filename,
        mimeType: body.mimeType,
        sizeBytes: BigInt(body.sizeBytes),
        status: "UPLOADING",
        storageKey: "", // preenchido abaixo com o id
      },
    });
    // Isolamento por usuário no path (README 54).
    const key = `users/${user.id}/media/${media.id}/original`;
    await prisma.media.update({ where: { id: media.id }, data: { storageKey: key } });

    const uploadUrl = await presignPut(key, body.mimeType);
    return Response.json({ mediaId: media.id, uploadUrl }, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return Response.json({ error: "validation_error", issues: e.issues }, { status: 400 });
    }
    return errorResponse(e);
  }
}
