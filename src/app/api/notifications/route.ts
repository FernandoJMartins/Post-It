import { prisma } from "@/lib/db";
import { requireUser, errorResponse } from "@/lib/session";

export const dynamic = "force-dynamic";

// Lista notificações do usuário + contagem de não lidas (README 106).
export async function GET() {
  try {
    const user = await requireUser();
    const [items, unread] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.notification.count({ where: { userId: user.id, read: false } }),
    ]);
    return Response.json({ items, unread });
  } catch (e) {
    return errorResponse(e);
  }
}
