import { requireUser, errorResponse } from "@/lib/session";
import { metaConfigured, redirectUri } from "@/lib/meta";

export const dynamic = "force-dynamic";

// Diagnóstico do OAuth: mostra o redirect_uri EXATO que o app envia à Meta,
// para colar idêntico na allowlist do app (evita "URL bloqueada").
export async function GET() {
  try {
    await requireUser();
    return Response.json({ configured: metaConfigured(), redirectUri: redirectUri() });
  } catch (e) {
    return errorResponse(e);
  }
}
