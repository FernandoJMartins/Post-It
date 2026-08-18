import { requireUser, errorResponse } from "@/lib/session";
import { duplicatePost } from "@/modules/posts/service";

export const dynamic = "force-dynamic";

// Serve para Duplicar e Reutilizar (README 40, 41): cria novo post.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    const at = body?.scheduledAt ? new Date(body.scheduledAt) : undefined;
    return Response.json(await duplicatePost(user.id, id, at), { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
