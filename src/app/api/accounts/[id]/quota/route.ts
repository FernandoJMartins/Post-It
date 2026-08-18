import { prisma } from "@/lib/db";
import { requireUser, errorResponse, HttpError } from "@/lib/session";
import { decryptToken } from "@/lib/crypto";
import { getPublishingUsage } from "@/modules/publishing/instagram";

export const dynamic = "force-dynamic";

// Cota de publicação restante da conta (README 50). null para contas de teste (dev).
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const acc = await prisma.instagramAccount.findFirst({
      where: { id, userId: user.id, deletedAt: null },
    });
    if (!acc) throw new HttpError(404, "account_not_found");
    if (!acc.accessTokenEncrypted || !acc.externalAccountId) {
      return Response.json({ available: false });
    }
    const token = decryptToken(acc.accessTokenEncrypted);
    if (token.startsWith("dev_token_") || token.startsWith("token_falso")) {
      return Response.json({ available: false });
    }
    const usage = await getPublishingUsage(token, acc.externalAccountId);
    return Response.json({ available: true, ...usage, remaining: Math.max(0, usage.quota - usage.used) });
  } catch (e) {
    return errorResponse(e);
  }
}
