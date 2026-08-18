import { Worker } from "bullmq";
import { redis } from "@/lib/redis";
import { prisma } from "@/lib/db";
import { QUEUE, type NotificationJob } from "@/lib/queues";

// Traduz o tipo do evento em título/corpo para exibição in-app (README 45, 106).
function render(type: string, payload: Record<string, unknown>): { title: string; body?: string } {
  switch (type) {
    case "POST_PUBLISHED":
      return { title: "Publicação concluída", body: "Seu post foi publicado com sucesso." };
    case "POST_FAILED":
      return { title: "Falha na publicação", body: `Erro: ${payload.code ?? "desconhecido"}.` };
    case "MEDIA_READY":
      return { title: "Vídeo pronto", body: "Seu vídeo terminou o processamento." };
    case "ACCOUNT_DISCONNECTED":
      return { title: "Conta desconectada", body: "Reconecte a conta para voltar a publicar." };
    default:
      return { title: type };
  }
}

// Notification worker (README 143): apenas persiste notificações in-app.
export function startNotifications(): Worker {
  const worker = new Worker<NotificationJob>(
    QUEUE.notifications,
    async (job) => {
      const { userId, type, payload } = job.data;
      const { title, body } = render(type, payload ?? {});
      await prisma.notification.create({
        data: {
          userId,
          type,
          title,
          body,
          resourceId: (payload?.postId as string) ?? (payload?.mediaId as string) ?? null,
        },
      });
      console.log(JSON.stringify({ level: "info", event: "notification", type, userId }));
    },
    { connection: redis, concurrency: 10 },
  );
  console.log("[notifications] iniciado");
  return worker;
}
