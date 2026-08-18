import { prisma } from "@/lib/db";
import { decryptToken, encryptToken } from "@/lib/crypto";
import { isTokenValid, refreshLongLivedToken, metaConfigured } from "@/lib/meta";
import { notificationsQueue } from "@/lib/queues";

const TEN_DAYS_MS = 10 * 24 * 60 * 60 * 1000;

// Saúde dos tokens (README 10, 11, 47): detecta expiração/revogação e marca REAUTH_REQUIRED.
export async function runTokenHealthTick(): Promise<number> {
  if (!metaConfigured()) return 0;
  const accounts = await prisma.instagramAccount.findMany({
    where: { status: "CONNECTED", deletedAt: null, accessTokenEncrypted: { not: null } },
    select: { id: true, userId: true, accessTokenEncrypted: true, tokenExpiresAt: true },
  });

  let flagged = 0;
  for (const acc of accounts) {
    // Tokens de teste (dev) não são verificáveis; ignora.
    const enc = acc.accessTokenEncrypted!;
    let token: string;
    try {
      token = decryptToken(enc);
    } catch {
      continue;
    }
    if (token.startsWith("dev_token_") || token.startsWith("token_falso")) continue;

    const valid = await isTokenValid(token);
    if (!valid) {
      await prisma.instagramAccount.update({
        where: { id: acc.id },
        data: { status: "REAUTH_REQUIRED", connectionStatus: "token_invalido" },
      });
      await notificationsQueue.add("notify", {
        userId: acc.userId,
        type: "ACCOUNT_DISCONNECTED",
        payload: { accountId: acc.id },
      });
      flagged++;
      continue;
    }

    // Renova o token long-lived se estiver perto de expirar (README 10, 11).
    const expiringSoon = acc.tokenExpiresAt && acc.tokenExpiresAt.getTime() - Date.now() < TEN_DAYS_MS;
    if (expiringSoon) {
      try {
        const { token: novo, expiresInSec } = await refreshLongLivedToken(token);
        await prisma.instagramAccount.update({
          where: { id: acc.id },
          data: {
            accessTokenEncrypted: encryptToken(novo),
            tokenExpiresAt: new Date(Date.now() + expiresInSec * 1000),
            lastSyncAt: new Date(),
          },
        });
      } catch {
        // Falha ao renovar não é fatal aqui; a próxima checagem pega se invalidar.
      }
    }
  }
  return flagged;
}

export function startTokenHealth(): NodeJS.Timeout {
  console.log("[tokenhealth] iniciado");
  // A cada 1h. Roda uma vez logo no início também.
  runTokenHealthTick().catch((e) => console.error("[tokenhealth]", e));
  return setInterval(() => {
    runTokenHealthTick().catch((e) => console.error("[tokenhealth]", e));
  }, 60 * 60 * 1000);
}
