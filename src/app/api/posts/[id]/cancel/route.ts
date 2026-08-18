import { requireUser, errorResponse } from "@/lib/session";
import { cancelPost } from "@/modules/posts/service";
import { audit } from "@/lib/audit";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const post = await cancelPost(user.id, id);
    await audit(user.id, "POST_CANCELLED", "post", id, _req);
    return Response.json(post);
  } catch (e) {
    return errorResponse(e);
  }
}
