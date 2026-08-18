import { Queue } from "bullmq";
import { redis } from "./redis";

// Filas (README 26). Cada job carrega somente IDs — nunca token/arquivo.
export const QUEUE = {
  publish: "publish_posts",
  media: "media_processing",
  notifications: "notifications",
} as const;

const connection = redis;

export const publishQueue = new Queue(QUEUE.publish, { connection });
export const mediaQueue = new Queue(QUEUE.media, { connection });
export const notificationsQueue = new Queue(QUEUE.notifications, { connection });

export type PublishJob = { postId: string };
export type MediaJob = { mediaId: string };
export type NotificationJob = {
  userId: string;
  type: string;
  payload: Record<string, unknown>;
};
