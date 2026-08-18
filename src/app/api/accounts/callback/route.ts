import { cookies } from "next/headers";
import { requireUser } from "@/lib/session";
import {
  exchangeCodeForToken,
  toLongLivedToken,
  findInstagramAccount,
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

    const shortToken = await exchangeCodeForToken(code);
    const { token, expiresInSec } = await toLongLivedToken(shortToken);
    const ig = await findInstagramAccount(token);

    await upsertConnectedAccount({
      userId: user.id,
      externalAccountId: ig.igUserId,
      username: `@${ig.username}`,
      displayName: ig.name,
      profilePictureUrl: ig.profilePictureUrl,
      // Guardamos o token da Página, usado para publicar em nome da conta IG.
      accessToken: ig.pageAccessToken,
      expiresInSec,
    });

    return Response.redirect(`${base}/accounts?connected=1`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "erro";
    return Response.redirect(`${base}/accounts?error=${encodeURIComponent(msg)}`);
  }
}
