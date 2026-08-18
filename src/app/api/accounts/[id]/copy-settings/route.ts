import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, errorResponse, HttpError } from "@/lib/session";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const schema = z.object({ fromId: z.string() });

// Duplicar configurações de uma conta para outra (README 102).
// NUNCA copia tokens, IDs externos ou credenciais — só preferências.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params; // conta destino
    const { fromId } = schema.parse(await req.json());
    if (fromId === id) throw new HttpError(422, "mesma_conta");

    const [src, dest] = await Promise.all([
      prisma.instagramAccount.findFirst({ where: { id: fromId, userId: user.id, deletedAt: null } }),
      prisma.instagramAccount.findFirst({ where: { id, userId: user.id, deletedAt: null } }),
    ]);
    if (!src || !dest) throw new HttpError(404, "account_not_found");

    const updated = await prisma.instagramAccount.update({
      where: { id },
      data: {
        timezone: src.timezone,
        defaultCaption: src.defaultCaption,
        defaultHashtags: src.defaultHashtags,
        postingEnabled: src.postingEnabled,
        notificationsEnabled: src.notificationsEnabled,
      },
    });
    await audit(user.id, "ACCOUNT_SETTINGS_COPIED", "instagram_account", id, req);
    return Response.json(updated);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return Response.json({ error: "validation_error", issues: e.issues }, { status: 400 });
    }
    return errorResponse(e);
  }
}
