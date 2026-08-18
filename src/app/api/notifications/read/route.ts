import { prisma } from "@/lib/db";
import { requireUser, errorResponse } from "@/lib/session";

export const dynamic = "force-dynamic";

// Marca todas como lidas (README 106).
export async function POST() {
  try {
    const user = await requireUser();
    await prisma.notification.updateMany({
      where: { userId: user.id, read: false },
      data: { read: true },
    });
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
