import { z } from "zod";
import { requireUser, errorResponse } from "@/lib/session";
import { setActive, deleteRecurring } from "@/modules/recurring/service";

export const dynamic = "force-dynamic";

const schema = z.object({ active: z.boolean() });

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const { active } = schema.parse(await req.json());
    return Response.json(await setActive(user.id, id, active));
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    await deleteRecurring(user.id, id);
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
