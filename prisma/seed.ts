import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";
import { encryptToken } from "../src/lib/crypto";

const prisma = new PrismaClient();

// Seed de desenvolvimento: usuário demo + conta conectada + mídia pronta.
async function main() {
  const email = "demo@postador.dev";
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: "Demo",
      passwordHash: await hashPassword("demo12345"),
    },
  });

  const account = await prisma.instagramAccount.create({
    data: {
      userId: user.id,
      username: "@conta_demo",
      displayName: "Conta Demo",
      status: "CONNECTED",
      externalAccountId: "1784xxxx",
      accessTokenEncrypted: encryptToken("token_falso_demo"),
    },
  });

  await prisma.media.create({
    data: {
      userId: user.id,
      storageKey: `users/${user.id}/media/demo/original`,
      filename: "video_demo.mp4",
      mimeType: "video/mp4",
      fileUrl: "https://example.com/video_demo.mp4",
      status: "READY",
      durationSeconds: 30,
      width: 1080,
      height: 1920,
    },
  });

  console.log("Seed pronto.");
  console.log("Login: demo@postador.dev / demo12345");
  console.log("Conta:", account.username);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
