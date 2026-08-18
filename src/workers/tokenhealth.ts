import { prisma } from "@/lib/db";
import { decryptToken } from "@/lib/crypto";
import { isTokenValid, metaConfigured } from "@/lib/meta";
import { notificationsQueue } from "@/lib/queues";

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
