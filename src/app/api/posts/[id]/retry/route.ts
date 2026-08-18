import { requireUser, errorResponse } from "@/lib/session";
import { retryPost } from "@/modules/posts/service";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    return Response.json(await retryPost(user.id, id));
  } catch (e) {
    return errorResponse(e);
  }
}
