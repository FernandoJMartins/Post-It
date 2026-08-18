"use client";

import { useEffect, useState, useCallback } from "react";

type Notif = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  read: boolean;
  createdAt: string;
};

const ICON: Record<string, string> = {
  POST_PUBLISHED: "✅",
  POST_FAILED: "❌",
  MEDIA_READY: "🎬",
  ACCOUNT_DISCONNECTED: "⚠️",
};

export default function NotificationsPage() {
  const [items, setItems] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    const res = await fetch("/api/notifications");
    if (res.ok) {
      const d = await res.json();
      setItems(d.items);
      setUnread(d.unread);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  async function markAll() {
    await fetch("/api/notifications/read", { method: "POST" });
    load();
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          Notificações {unread > 0 && <span className="ml-2 rounded-full bg-red-500 px-2 py-0.5 text-sm text-white">{unread}</span>}
        </h1>
        <div className="flex gap-3 text-sm">
          {unread > 0 && <button onClick={markAll} className="text-indigo-500">Marcar todas como lidas</button>}
          <a href="/dashboard" className="text-indigo-500">← Dashboard</a>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-neutral-500 dark:border-neutral-800">
          Nenhuma notificação ainda.
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => (
            <li key={n.id} className={`flex items-start gap-3 rounded-xl border p-3 text-sm dark:border-neutral-800 ${n.read ? "opacity-60" : "border-indigo-300 dark:border-indigo-800"}`}>
              <span className="text-lg">{ICON[n.type] ?? "🔔"}</span>
              <div className="min-w-0 flex-1">
                <div className="font-medium">{n.title}</div>
                {n.body && <div className="text-neutral-500">{n.body}</div>}
                <div className="mt-0.5 text-xs text-neutral-400">{new Date(n.createdAt).toLocaleString()}</div>
              </div>
              {!n.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
