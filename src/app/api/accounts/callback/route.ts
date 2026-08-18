import { cookies } from "next/headers";
import { requireUser } from "@/lib/session";
import {
  exchangeCodeForToken,
  toLongLivedToken,
  getProfile,
} from "@/lib/meta";
import { upsertConnectedAccount } from "@/modules/accounts/service";

export const dynamic = "force-dynamic";

// Callback do OAuth: valida state, troca code por token long-lived, acha a conta IG e salva.
export async function GET(req: Request) {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  try {
    const user = await requireUser();
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    const jar = await cookies();
    const expected = jar.get("ig_oauth_state")?.value;
    jar.delete("ig_oauth_state");

    if (!code || !state || !expected || state !== expected) {
      return Response.redirect(`${base}/accounts?error=invalid_state`);
    }

    // Instagram anexa "#_" ao code no redirect; remove qualquer sujeira.
    const cleanCode = code.split("#")[0];

    // Cada etapa marca sua origem no erro, pra diagnosticar (ex.: "exchange: ...").
    let step = "exchange";
    try {
      const { token: shortToken, userId } = await exchangeCodeForToken(cleanCode);
      step = "long_lived";
      const { token, expiresInSec } = await toLongLivedToken(shortToken);
      step = "profile";
      const ig = await getProfile(token, userId);
      step = "save";
      await upsertConnectedAccount({
        userId: user.id,
        externalAccountId: ig.igUserId,
        username: `@${ig.username}`,
        displayName: ig.name,
        profilePictureUrl: ig.profilePictureUrl,
        // Token do próprio Instagram (long-lived) usado para publicar.
        accessToken: token,
        expiresInSec,
      });
      return Response.redirect(`${base}/accounts?connected=1`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "erro";
      console.error(`[oauth callback] falha na etapa ${step}:`, msg);
      return Response.redirect(`${base}/accounts?error=${encodeURIComponent(`${step}: ${msg}`)}`);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "erro";
    return Response.redirect(`${base}/accounts?error=${encodeURIComponent(msg)}`);
  }
}
