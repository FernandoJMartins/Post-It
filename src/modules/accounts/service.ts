import { prisma } from "@/lib/db";
import { encryptToken } from "@/lib/crypto";
import { HttpError } from "@/lib/session";
import type { AccountStatus } from "@prisma/client";

// Gerenciamento de contas (README 9, 10, 36, 47). Sempre escopado por userId.
export function listAccounts(userId: string) {
  return prisma.instagramAccount.findMany({
    where: { userId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      username: true,
      displayName: true,
      profilePictureUrl: true,
      status: true,
      postingEnabled: true,
      timezone: true,
      tokenExpiresAt: true,
      lastSyncAt: true,
      createdAt: true,
    },
  });
}

async function ownedAccount(userId: string, id: string) {
  const acc = await prisma.instagramAccount.findFirst({
    where: { id, userId, deletedAt: null },
  });
  if (!acc) throw new HttpError(404, "account_not_found");
  return acc;
}

// Cria ou atualiza a conta após OAuth bem-sucedido (upsert por externalAccountId).
export async function upsertConnectedAccount(input: {
  userId: string;
  externalAccountId: string;
  username: string;
  displayName?: string;
  profilePictureUrl?: string;
  accessToken: string;
  expiresInSec: number;
}) {
  const tokenExpiresAt = new Date(Date.now() + input.expiresInSec * 1000);
  const existing = await prisma.instagramAccount.findFirst({
    where: { userId: input.userId, externalAccountId: input.externalAccountId },
  });

  const data = {
    userId: input.userId,
    username: input.username,
    displayName: input.displayName,
    profilePictureUrl: input.profilePictureUrl,
    externalAccountId: input.externalAccountId,
    accessTokenEncrypted: encryptToken(input.accessToken), // nunca em texto puro
    tokenExpiresAt,
    status: "CONNECTED" as AccountStatus,
    connectionStatus: "ok",
    lastSyncAt: new Date(),
    deletedAt: null,
  };

  const account = existing
    ? await prisma.instagramAccount.update({ where: { id: existing.id }, data })
    : await prisma.instagramAccount.create({ data });

  await prisma.auditLog.create({
    data: {
      userId: input.userId,
      action: "ACCOUNT_CONNECTED",
      resourceType: "instagram_account",
      resourceId: account.id,
    },
  });
  return account;
}

export async function setPaused(userId: string, id: string, paused: boolean) {
  const acc = await ownedAccount(userId, id);
  // Pausar não muda status de conexão; controla postingEnabled (README 36).
  return prisma.instagramAccount.update({
    where: { id: acc.id },
    data: { postingEnabled: !paused },
  });
}

export async function softDeleteAccount(userId: string, id: string) {
  const acc = await ownedAccount(userId, id);
  await prisma.instagramAccount.update({
    where: { id: acc.id },
    // Soft delete + revoga token guardado (README 115, 118).
    data: { deletedAt: new Date(), status: "DISCONNECTED", accessTokenEncrypted: null },
  });
  await prisma.auditLog.create({
    data: {
      userId,
      action: "ACCOUNT_DELETED",
      resourceType: "instagram_account",
      resourceId: id,
    },
  });
}
