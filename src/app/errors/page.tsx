"use client";

import { useEffect, useState, useCallback } from "react";

type Post = {
  id: string;
  status: string;
  errorCode: string | null;
  scheduledAt: string;
  account: { username: string };
  media: { filename: string };
};

// Central de erros (README 46): posts que falharam, com ação de reprocessar.
export default function ErrorsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/posts");
    if (res.ok) {
      const all: Post[] = await res.json();
      setPosts(all.filter((p) => ["FAILED", "FAILED_PERMANENTLY"].includes(p.status)));
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 6000);
    return () => clearInterval(t);
  }, [load]);

  async function retry(id: string) {
    setMsg(null);
    const res = await fetch(`/api/posts/${id}/retry`, { method: "POST" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      const map: Record<string, string> = {
        account_not_connected: "Conta desconectada — reconecte primeiro.",
        media_not_ready: "Vídeo não está pronto.",
      };
      setMsg(map[d.error] ?? `Falha: ${d.error ?? res.status}`);
    }
    load();
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Central de erros</h1>
        <a href="/dashboard" className="text-sm text-indigo-500">← Dashboard</a>
      </div>

      {msg && <p className="mb-3 text-sm text-red-500">{msg}</p>}

      {posts.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-neutral-500 dark:border-neutral-800">
          🎉 Nenhum erro. Tudo em ordem.
        </div>
      ) : (
        <ul className="space-y-2">
          {posts.map((p) => (
            <li key={p.id} className="rounded-xl border border-red-200 p-3 text-sm dark:border-red-900">
              <div className="flex items-center justify-between">
                <span className="font-medium text-red-600">🔴 {p.account.username}</span>
                <span className="text-xs text-neutral-400">{p.status}</span>
              </div>
              <div className="mt-1 text-neutral-500">
                {p.media.filename} · código: {p.errorCode ?? "desconhecido"}
              </div>
              <div className="mt-2 flex gap-2">
                <button onClick={() => retry(p.id)} className="rounded border px-2 py-1 text-xs">Tentar novamente</button>
                <a href="/accounts" className="rounded border px-2 py-1 text-xs">Reconectar conta</a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
