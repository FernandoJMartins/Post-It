"use client";

import { useEffect, useState, useCallback } from "react";

type Post = {
  id: string;
  caption: string | null;
  scheduledAt: string;
  status: string;
  publishedAt: string | null;
  errorCode: string | null;
  account: { username: string };
  media: { filename: string };
};

const STATUS_STYLE: Record<string, string> = {
  SCHEDULED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  QUEUED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  PROCESSING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  PUBLISHING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  PUBLISHED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  FAILED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  FAILED_PERMANENTLY: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  CANCELLED: "bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
};

const CANCELLABLE = ["SCHEDULED", "QUEUED", "RETRYING"];

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/posts");
    if (res.ok) setPosts(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  async function cancel(id: string) {
    if (!confirm("Cancelar esta publicação?")) return;
    await fetch(`/api/posts/${id}/cancel`, { method: "POST" });
    load();
  }

  const fmt = (s: string) => new Date(s).toLocaleString();

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Publicações</h1>
        <div className="flex gap-3 text-sm">
          <a href="/schedule" className="rounded-lg bg-indigo-600 px-3 py-1.5 text-white">+ Agendar</a>
          <a href="/dashboard" className="text-indigo-500">← Dashboard</a>
        </div>
      </div>

      {loading ? (
        <p className="text-neutral-500">Carregando…</p>
      ) : posts.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-neutral-500 dark:border-neutral-800">
          Nenhuma publicação ainda. <a href="/schedule" className="text-indigo-500">Agende a primeira.</a>
        </div>
      ) : (
        <ul className="space-y-2">
          {posts.map((p) => (
            <li key={p.id} className="flex items-center justify-between rounded-xl border p-3 text-sm dark:border-neutral-800">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`rounded px-1.5 py-0.5 text-xs ${STATUS_STYLE[p.status] ?? ""}`}>{p.status}</span>
                  <span className="font-medium">{p.account.username}</span>
                </div>
                <div className="mt-1 truncate text-neutral-500">
                  {p.media.filename} · {fmt(p.scheduledAt)}
                  {p.errorCode && <span className="text-red-500"> · {p.errorCode}</span>}
                </div>
              </div>
              {CANCELLABLE.includes(p.status) && (
                <button onClick={() => cancel(p.id)} className="ml-3 shrink-0 rounded border px-2 py-1 text-xs">
                  Cancelar
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
