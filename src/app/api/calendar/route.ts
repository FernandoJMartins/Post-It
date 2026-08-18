import { prisma } from "@/lib/db";
import { requireUser, errorResponse } from "@/lib/session";
import type { Prisma, PostStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

// Calendário (README 70): posts em uma janela, com filtros opcionais.
export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const url = new URL(req.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const accountId = url.searchParams.get("account_id");
    const status = url.searchParams.get("status");

    const where: Prisma.PostWhereInput = { userId: user.id, deletedAt: null };
    if (from || to) {
      where.scheduledAt = {};
      if (from) where.scheduledAt.gte = new Date(from);
      if (to) where.scheduledAt.lte = new Date(to);
    }
    if (accountId) where.instagramAccountId = accountId;
    if (status) where.status = status as PostStatus;

    const posts = await prisma.post.findMany({
      where,
      orderBy: { scheduledAt: "asc" },
      select: {
        id: true,
        caption: true,
        scheduledAt: true,
        status: true,
        account: { select: { username: true } },
        media: { select: { filename: true } },
      },
    });
    return Response.json(posts);
  } catch (e) {
    return errorResponse(e);
  }
}
