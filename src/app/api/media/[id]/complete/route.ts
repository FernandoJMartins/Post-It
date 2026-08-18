import { requireUser, errorResponse } from "@/lib/session";
import { markUploaded } from "@/modules/media/service";
import { mediaQueue } from "@/lib/queues";

export const dynamic = "force-dynamic";

// Frontend confirma que enviou o arquivo -> enfileira processamento (README 13, 14).
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const media = await markUploaded(user.id, id);
    await mediaQueue.add("process", { mediaId: id }, { jobId: `media-${id}`, removeOnComplete: 500 });
    return Response.json(media);
  } catch (e) {
    return errorResponse(e);
  }
}
