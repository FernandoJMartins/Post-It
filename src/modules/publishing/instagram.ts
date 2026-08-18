// Cliente de publicação oficial (stub). README 151: apenas integrações oficiais.
// Substituir por chamadas reais à Graph API (Instagram Content Publishing).
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

export async function publishToInstagram(args: {
  accessToken: string;
  externalAccountId: string;
  mediaUrl: string;
  caption?: string;
  idempotencyKey: string;
}): Promise<PublishResult> {
  // TODO: implementar fluxo real:
  //   POST /{ig-user-id}/media  -> creation_id
  //   POST /{ig-user-id}/media_publish -> id
  // Respeitar timeout (README 98) e mapear erros permanentes vs temporários.
  if (!args.accessToken) throw new PermanentPublishError("invalid_token");
  return { externalPostId: `stub_${args.idempotencyKey}` };
}
