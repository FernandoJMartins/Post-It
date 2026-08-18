import { requireUser, errorResponse } from "@/lib/session";
import { setPaused } from "@/modules/accounts/service";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    return Response.json(await setPaused(user.id, id, false));
  } catch (e) {
    return errorResponse(e);
  }
}
