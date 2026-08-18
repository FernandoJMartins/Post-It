import { requireUser, errorResponse } from "@/lib/session";
import { cancelPost } from "@/modules/posts/service";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const post = await cancelPost(user.id, id);
    return Response.json(post);
  } catch (e) {
    return errorResponse(e);
  }
}
