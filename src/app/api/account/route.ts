import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, errorResponse, HttpError } from "@/lib/session";
import { deleteObject } from "@/lib/storage";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const schema = z.object({ confirm: z.literal(true) });

// Exclusão de conta do usuário (LGPD — README 118).
// Remove arquivos do storage e apaga tudo em cascata. Registra auditoria antes.
export async function DELETE(req: Request) {
  try {
    const user = await requireUser();
    schema.parse(await req.json().catch(() => ({})));

    const media = await prisma.media.findMany({
      where: { userId: user.id },
      select: { storageKey: true },
    });
    for (const m of media) {
      if (m.storageKey) {
        try { await deleteObject(m.storageKey); } catch { /* segue */ }
      }
    }

    await audit(user.id, "ACCOUNT_DELETED", "user", user.id, req);
    // Cascade remove contas, mídia, posts, notificações, recorrências, grupos, templates.
    await prisma.user.delete({ where: { id: user.id } });

    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return Response.json({ error: "confirmacao_obrigatoria" }, { status: 400 });
    }
    if (e instanceof HttpError) return errorResponse(e);
    return errorResponse(e);
  }
}
