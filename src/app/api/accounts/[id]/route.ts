import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, errorResponse, HttpError } from "@/lib/session";
import { softDeleteAccount } from "@/modules/accounts/service";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  groupId: z.string().nullable().optional(),
  timezone: z.string().optional(),
  defaultCaption: z.string().max(2200).nullable().optional(),
  defaultHashtags: z.string().max(500).nullable().optional(),
});

// Atualiza conta: grupo, fuso, defaults (README 35, 103).
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const acc = await prisma.instagramAccount.findFirst({ where: { id, userId: user.id, deletedAt: null } });
    if (!acc) throw new HttpError(404, "account_not_found");
    const data = patchSchema.parse(await req.json());
    if (data.groupId) {
      const g = await prisma.accountGroup.findFirst({ where: { id: data.groupId, userId: user.id } });
      if (!g) throw new HttpError(404, "group_not_found");
    }
    return Response.json(await prisma.instagramAccount.update({ where: { id }, data }));
  } catch (e) {
    if (e instanceof z.ZodError) {
      return Response.json({ error: "validation_error", issues: e.issues }, { status: 400 });
    }
    return errorResponse(e);
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    await softDeleteAccount(user.id, id);
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
