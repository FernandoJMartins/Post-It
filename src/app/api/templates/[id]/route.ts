import { prisma } from "@/lib/db";
import { requireUser, errorResponse, HttpError } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const t = await prisma.scheduleTemplate.findFirst({ where: { id, userId: user.id } });
    if (!t) throw new HttpError(404, "template_not_found");
    await prisma.scheduleTemplate.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
