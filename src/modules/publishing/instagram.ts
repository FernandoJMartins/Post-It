// Publicação oficial via Instagram Graph API (Content Publishing).
// README 151: SOMENTE integração oficial — sem API privada, fingerprint ou device spoofing.
// Fluxo (vídeo/Reels):
//   1) POST /{ig-user-id}/media           -> creation_id (container)
//   2) GET  /{creation_id}?fields=status_code  (polling até FINISHED)
//   3) POST /{ig-user-id}/media_publish   -> id publicado
const GRAPH = "https://graph.facebook.com/v21.0";

export type PublishResult = { externalPostId: string };

export class PermanentPublishError extends Error {
  constructor(public code: string) {
    super(code);
  }
}
export class TemporaryPublishError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

// Códigos da Graph API que NÃO devem sofrer retry (README 28).
const PERMANENT_CODES = new Set([
  100, // parâmetro inválido / mídia inválida
  190, // token inválido/expirado
  200, // permissão insuficiente
  10, // permissão negada
  803, // objeto inexistente
  9004, // não foi possível baixar a mídia (video_url inacessível)
  2207026, // formato de vídeo não suportado
]);

type GraphError = { error?: { message?: string; code?: number; error_subcode?: number } };

async function graphFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 30_000); // timeout (README 98)
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    const data = (await res.json().catch(() => ({}))) as T & GraphError;
    if (!res.ok) {
      const code = data?.error?.code ?? res.status;
      const msg = data?.error?.message ?? `graph_error_${res.status}`;
      if (PERMANENT_CODES.has(code) || (res.status >= 400 && res.status < 500 && res.status !== 429)) {
        throw new PermanentPublishError(String(code));
      }
      // 429/5xx/transientes -> temporário (retry com backoff)
      throw new TemporaryPublishError(String(code) + ":" + msg.slice(0, 80));
    }
    return data as T;
  } catch (e) {
    if (e instanceof PermanentPublishError || e instanceof TemporaryPublishError) throw e;
    // abort/erro de rede -> temporário
    throw new TemporaryPublishError((e as Error).name === "AbortError" ? "timeout" : "network_error");
  } finally {
    clearTimeout(t);
  }
}

function form(params: Record<string, string>): string {
  return new URLSearchParams(params).toString();
}

export async function publishToInstagram(args: {
  accessToken: string;
  externalAccountId: string;
  mediaUrl: string;
  caption?: string;
  idempotencyKey: string;
}): Promise<PublishResult> {
  const { accessToken, externalAccountId, mediaUrl, caption } = args;
  if (!accessToken) throw new PermanentPublishError("190");
  if (!externalAccountId) throw new PermanentPublishError("803");
  if (!mediaUrl) throw new PermanentPublishError("9004");

  // 1) Cria o container do Reel. video_url deve ser HTTPS público (presigned R2).
  const created = await graphFetch<{ id: string }>(
    `${GRAPH}/${externalAccountId}/media`,
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: form({
        media_type: "REELS",
        video_url: mediaUrl,
        caption: caption ?? "",
        access_token: accessToken,
      }),
    },
  );
  const creationId = created.id;

  // 2) Polling do processamento do vídeo até FINISHED (máx ~2min).
  const maxTries = 24;
  for (let i = 0; i < maxTries; i++) {
    const status = await graphFetch<{ status_code: string; status?: string }>(
      `${GRAPH}/${creationId}?fields=status_code,status&access_token=${encodeURIComponent(accessToken)}`,
    );
    if (status.status_code === "FINISHED") break;
    if (status.status_code === "ERROR" || status.status_code === "EXPIRED") {
      throw new PermanentPublishError("container_" + status.status_code.toLowerCase());
    }
    if (i === maxTries - 1) {
      // Ainda IN_PROGRESS -> tenta de novo depois (temporário).
      throw new TemporaryPublishError("container_timeout");
    }
    await new Promise((r) => setTimeout(r, 5000));
  }

  // 3) Publica o container.
  const published = await graphFetch<{ id: string }>(
    `${GRAPH}/${externalAccountId}/media_publish`,
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: form({ creation_id: creationId, access_token: accessToken }),
    },
  );

  return { externalPostId: published.id };
}
