import { Worker } from "bullmq";
import { redis } from "@/lib/redis";
import { QUEUE, type NotificationJob } from "@/lib/queues";

// Notification worker (README 143): apenas envia notificações.
export function startNotifications(): Worker {
  const worker = new Worker<NotificationJob>(
    QUEUE.notifications,
    async (job) => {
      // TODO: in-app / email / push. Por ora, log estruturado.
      console.log(JSON.stringify({ level: "info", event: "notification", ...job.data }));
    },
    { connection: redis, concurrency: 10 },
  );
  console.log("[notifications] iniciado");
  return worker;
}
