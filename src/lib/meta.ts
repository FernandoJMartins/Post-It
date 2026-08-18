// Integração oficial: "Instagram API com Instagram Login" (graph.instagram.com).
// O usuário loga com o PRÓPRIO @ do Instagram (Business/Creator) — sem Página do Facebook.
// Docs: developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login
const IG_AUTH = "https://www.instagram.com/oauth/authorize";
const IG_TOKEN = "https://api.instagram.com/oauth/access_token";
const IG_GRAPH = "https://graph.instagram.com";

// Escopos do Instagram Login (não são os pages_* do fluxo via Facebook).
const SCOPES = ["instagram_business_basic", "instagram_business_content_publish"];

// Credenciais do app do Instagram (Instagram > API setup with Instagram login).
// Aceita IG_CLIENT_* e, por compatibilidade, cai para META_CLIENT_*.
function clientId(): string {
  return (process.env.IG_CLIENT_ID ?? process.env.META_CLIENT_ID ?? "").trim();
}
function clientSecret(): string {
  return (process.env.IG_CLIENT_SECRET ?? process.env.META_CLIENT_SECRET ?? "").trim();
}

export function metaConfigured(): boolean {
  return !!(clientId() && clientSecret());
}

// redirect_uri usado no OAuth. Precisa bater EXATAMENTE com a allowlist do app.
export function redirectUri(): string {
  if (process.env.META_REDIRECT_URI) return process.env.META_REDIRECT_URI.trim().replace(/\/+$/, "");
  const base = (process.env.APP_URL ?? "http://localhost:3000").trim().replace(/\/+$/, "");
  return `${base}/api/accounts/callback`;
}

export function buildAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: clientId(),
    redirect_uri: redirectUri(),
    scope: SCOPES.join(","),
    response_type: "code",
    state,
  });
  return `${IG_AUTH}?${params.toString()}`;
}

async function withTimeout<T>(fn: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 30_000); // README 98
  try {
    return await fn(controller.signal);
  } finally {
    clearTimeout(t);
  }
}

// Troca o code por token de curta duração + user_id do Instagram.
export async function exchangeCodeForToken(code: string): Promise<{ token: string; userId: string }> {
  return withTimeout(async (signal) => {
    const res = await fetch(IG_TOKEN, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId(),
        client_secret: clientSecret(),
        grant_type: "authorization_code",
        redirect_uri: redirectUri(),
        code,
      }),
      signal,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error_message ?? data?.error?.message ?? `token_error_${res.status}`);
    return { token: data.access_token as string, userId: String(data.user_id) };
  });
}

// Converte o token curto em long-lived (~60 dias).
export async function toLongLivedToken(shortToken: string): Promise<{ token: string; expiresInSec: number }> {
  return withTimeout(async (signal) => {
    const url = `${IG_GRAPH}/access_token?${new URLSearchParams({
      grant_type: "ig_exchange_token",
      client_secret: clientSecret(),
      access_token: shortToken,
    })}`;
    const res = await fetch(url, { signal });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message ?? `exchange_error_${res.status}`);
    return { token: data.access_token as string, expiresInSec: data.expires_in ?? 60 * 24 * 3600 };
  });
}

// Renova o token long-lived (antes de expirar). README 10, 11.
export async function refreshLongLivedToken(token: string): Promise<{ token: string; expiresInSec: number }> {
  return withTimeout(async (signal) => {
    const url = `${IG_GRAPH}/refresh_access_token?${new URLSearchParams({
      grant_type: "ig_refresh_token",
      access_token: token,
    })}`;
    const res = await fetch(url, { signal });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message ?? `refresh_error_${res.status}`);
    return { token: data.access_token as string, expiresInSec: data.expires_in ?? 60 * 24 * 3600 };
  });
}

export type IgProfile = {
  igUserId: string;
  username: string;
  name?: string;
  profilePictureUrl?: string;
};

// Perfil da conta logada.
export async function getProfile(token: string): Promise<IgProfile> {
  return withTimeout(async (signal) => {
    const url = `${IG_GRAPH}/me?fields=user_id,username,name,profile_picture_url&access_token=${encodeURIComponent(token)}`;
    const res = await fetch(url, { signal });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message ?? `profile_error_${res.status}`);
    return {
      igUserId: String(data.user_id ?? data.id),
      username: data.username,
      name: data.name,
      profilePictureUrl: data.profile_picture_url,
    };
  });
}

// Verifica se o token ainda é válido (README 10, 47).
export async function isTokenValid(token: string): Promise<boolean> {
  try {
    await getProfile(token);
    return true;
  } catch {
    return false;
  }
}
