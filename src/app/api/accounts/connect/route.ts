import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { requireUser, errorResponse, HttpError } from "@/lib/session";
import { buildAuthorizeUrl, metaConfigured, redirectUri } from "@/lib/meta";

export const dynamic = "force-dynamic";

// Inicia o OAuth: gera state anti-CSRF em cookie HttpOnly e devolve a URL do diálogo.
export async function POST() {
  try {
    await requireUser();
    if (!metaConfigured()) throw new HttpError(400, "meta_not_configured");

    const state = randomBytes(16).toString("hex");
    const jar = await cookies();
    jar.set("ig_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    });

    const ruri = redirectUri();
    // Loga o redirect_uri exato para conferência com a allowlist do app Meta.
    console.log(`[oauth] redirect_uri enviado: ${ruri}`);
    return Response.json({ url: buildAuthorizeUrl(state), redirectUri: ruri });
  } catch (e) {
    return errorResponse(e);
  }
}
