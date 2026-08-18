import { prisma } from "@/lib/db";
import { requireUser, errorResponse } from "@/lib/session";

export const dynamic = "force-dynamic";

// Trilha de auditoria do próprio usuário (README 81).
export async function GET() {
  try {
    const user = await requireUser();
    const logs = await prisma.auditLog.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return Response.json(logs);
  } catch (e) {
    return errorResponse(e);
  }
}
