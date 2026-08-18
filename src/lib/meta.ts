// Integração oficial com a Graph API da Meta (Instagram Content Publishing).
// Fluxo: Facebook Login -> token curto -> token long-lived -> Página -> IG Business account.
const GRAPH = "https://graph.facebook.com/v21.0";
const OAUTH_DIALOG = "https://www.facebook.com/v21.0/dialog/oauth";

// Escopos necessários para publicar Reels/feed em contas Instagram Business.
const SCOPES = [
  "instagram_basic",
  "instagram_content_publish",
  "pages_show_list",
  "business_management",
];

export function metaConfigured(): boolean {
  return !!(process.env.META_CLIENT_ID && process.env.META_CLIENT_SECRET);
}

// redirect_uri usado no OAuth. Precisa bater EXATAMENTE com a allowlist do app Meta.
// Normaliza barras finais para evitar '...app//api/accounts/callback' (que o Facebook bloqueia).
export function redirectUri(): string {
  if (process.env.META_REDIRECT_URI) return process.env.META_REDIRECT_URI.trim().replace(/\/+$/, "");
  const base = (process.env.APP_URL ?? "http://localhost:3000").trim().replace(/\/+$/, "");
  return `${base}/api/accounts/callback`;
}

export function buildAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.META_CLIENT_ID!,
    redirect_uri: redirectUri(),
    scope: SCOPES.join(","),
    response_type: "code",
    state,
  });
  return `${OAUTH_DIALOG}?${params.toString()}`;
}

// Timeout padrão em toda chamada externa (README 98).
async function graphGet<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 30_000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error?.message ?? `graph_error_${res.status}`);
    }
    return data as T;
  } finally {
    clearTimeout(t);
  }
}

// Verifica se o token ainda é válido (README 10, 47). true = ok, false = expirado/revogado.
export async function isTokenValid(accessToken: string): Promise<boolean> {
  try {
    await graphGet<{ id: string }>(`${GRAPH}/me?fields=id&access_token=${encodeURIComponent(accessToken)}`);
    return true;
  } catch {
    return false;
  }
}

export async function exchangeCodeForToken(code: string): Promise<string> {
  const url = `${GRAPH}/oauth/access_token?${new URLSearchParams({
    client_id: process.env.META_CLIENT_ID!,
    client_secret: process.env.META_CLIENT_SECRET!,
    redirect_uri: redirectUri(),
    code,
  })}`;
  const data = await graphGet<{ access_token: string }>(url);
  return data.access_token;
}

export async function toLongLivedToken(
  shortToken: string,
): Promise<{ token: string; expiresInSec: number }> {
  const url = `${GRAPH}/oauth/access_token?${new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: process.env.META_CLIENT_ID!,
    client_secret: process.env.META_CLIENT_SECRET!,
    fb_exchange_token: shortToken,
  })}`;
  const data = await graphGet<{ access_token: string; expires_in: number }>(url);
  return { token: data.access_token, expiresInSec: data.expires_in ?? 60 * 24 * 3600 };
}

export type IgAccount = {
  igUserId: string;
  username: string;
  name?: string;
  profilePictureUrl?: string;
  pageAccessToken: string;
};

// Descobre a primeira conta Instagram Business ligada a uma Página do usuário.
export async function findInstagramAccount(userToken: string): Promise<IgAccount> {
  const pages = await graphGet<{ data: { id: string; access_token: string }[] }>(
    `${GRAPH}/me/accounts?fields=id,access_token&access_token=${userToken}`,
  );
  for (const page of pages.data ?? []) {
    const info = await graphGet<{ instagram_business_account?: { id: string } }>(
      `${GRAPH}/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`,
    );
    const igId = info.instagram_business_account?.id;
    if (!igId) continue;
    const profile = await graphGet<{
      username: string;
      name?: string;
      profile_picture_url?: string;
    }>(
      `${GRAPH}/${igId}?fields=username,name,profile_picture_url&access_token=${page.access_token}`,
    );
    return {
      igUserId: igId,
      username: profile.username,
      name: profile.name,
      profilePictureUrl: profile.profile_picture_url,
      pageAccessToken: page.access_token,
    };
  }
  throw new Error("nenhuma_conta_instagram_business_encontrada");
}
