import { z } from "zod";
import { requireUser, errorResponse } from "@/lib/session";
import { updatePost } from "@/modules/posts/service";

export const dynamic = "force-dynamic";

const schema = z.object({
  scheduledAt: z.string().datetime().optional(),
  caption: z.string().max(2200).optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const body = schema.parse(await req.json());
    const post = await updatePost(user.id, id, {
      scheduledAtUtc: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
      caption: body.caption,
    });
    return Response.json(post);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return Response.json({ error: "validation_error", issues: e.issues }, { status: 400 });
    }
    return errorResponse(e);
  }
}
