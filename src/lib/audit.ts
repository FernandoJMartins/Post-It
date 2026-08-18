import { prisma } from "@/lib/db";

// Auditoria (README 81): registra ação sem nunca gravar segredos.
export async function audit(
  userId: string | null,
  action: string,
  resourceType: string,
  resourceId?: string | null,
  req?: Request,
): Promise<void> {
  const ip = req?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = req?.headers.get("user-agent") ?? null;
  try {
    await prisma.auditLog.create({
      data: { userId, action, resourceType, resourceId: resourceId ?? null, ip, userAgent },
    });
  } catch {
    // Auditoria nunca deve derrubar a operação principal.
  }
}
