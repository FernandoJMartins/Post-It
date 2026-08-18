import { prisma } from "@/lib/db";
import { requireUser, errorResponse } from "@/lib/session";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// Exportação de dados do usuário (LGPD — README 117). Nunca inclui tokens.
export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const [profile, accounts, media, posts, notifications, auditLogs] = await Promise.all([
      prisma.user.findUnique({
        where: { id: user.id },
        select: { id: true, name: true, email: true, timezone: true, createdAt: true },
      }),
      prisma.instagramAccount.findMany({
        where: { userId: user.id },
        select: { id: true, username: true, status: true, timezone: true, createdAt: true }, // sem token
      }),
      prisma.media.findMany({
        where: { userId: user.id },
        select: { id: true, filename: true, status: true, createdAt: true },
      }),
      prisma.post.findMany({
        where: { userId: user.id },
        select: { id: true, caption: true, scheduledAt: true, status: true, publishedAt: true },
      }),
      prisma.notification.findMany({ where: { userId: user.id } }),
      prisma.auditLog.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 500 }),
    ]);

    await audit(user.id, "DATA_EXPORTED", "user", user.id, req);

    return new Response(
      JSON.stringify({ profile, accounts, media, posts, notifications, auditLogs }, null, 2),
      {
        status: 200,
        headers: {
          "content-type": "application/json",
          "content-disposition": `attachment; filename="postador-dados-${user.id}.json"`,
        },
      },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
