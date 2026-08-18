"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Account = { id: string; username: string; status: string; postingEnabled: boolean };
type Media = { id: string; filename: string; status: string };

export default function SchedulePage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [media, setMedia] = useState<Media[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  useEffect(() => {
    fetch("/api/accounts").then((r) => r.json()).then((a: Account[]) =>
      setAccounts(a.filter((x) => x.status === "CONNECTED" && x.postingEnabled)),
    );
    fetch("/api/media").then((r) => r.json()).then((m: Media[]) =>
      setMedia(m.filter((x) => x.status === "READY")),
    );
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const f = new FormData(e.currentTarget);
    const local = String(f.get("scheduledAt")); // datetime-local (hora do navegador)
    const scheduledAt = new Date(local).toISOString(); // -> UTC

    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        instagramAccountId: f.get("accountId"),
        mediaId: f.get("mediaId"),
        caption: f.get("caption") || undefined,
        scheduledAt,
        timezone: tz,
      }),
    });
    setLoading(false);
    if (res.ok) {
      router.push("/posts");
    } else {
      const d = await res.json().catch(() => ({}));
      const map: Record<string, string> = {
        scheduled_in_past: "A data precisa estar no futuro.",
        account_not_connected: "Conta não está conectada.",
        media_not_ready: "O vídeo ainda não está pronto.",
        time_conflict: "Já existe publicação nesse horário para esta conta.",
      };
      setError(map[d.error] ?? `Erro: ${d.error ?? res.status}`);
    }
  }

  return (
    <main className="mx-auto max-w-lg p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Agendar publicação</h1>
        <a href="/dashboard" className="text-sm text-indigo-500">← Dashboard</a>
      </div>

      {accounts.length === 0 || media.length === 0 ? (
        <div className="rounded-xl border border-dashed p-6 text-center text-sm text-neutral-500 dark:border-neutral-800">
          {accounts.length === 0 && (
            <p>Nenhuma conta conectada. <a href="/accounts" className="text-indigo-500">Conectar</a></p>
          )}
          {media.length === 0 && (
            <p>Nenhum vídeo pronto. <a href="/media" className="text-indigo-500">Enviar vídeo</a></p>
          )}
        </div>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            Conta
            <select name="accountId" required className="rounded border p-2 dark:bg-neutral-900">
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.username}</option>)}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Vídeo
            <select name="mediaId" required className="rounded border p-2 dark:bg-neutral-900">
              {media.map((m) => <option key={m.id} value={m.id}>{m.filename}</option>)}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Legenda
            <textarea name="caption" rows={4} placeholder="Legenda... #hashtags" className="rounded border p-2 dark:bg-neutral-900" />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Data e hora ({tz})
            <input name="scheduledAt" type="datetime-local" required className="rounded border p-2 dark:bg-neutral-900" />
          </label>

          {error && <p className="text-sm text-red-500">{error}</p>}
          <button disabled={loading} className="rounded-lg bg-indigo-600 p-2 text-white disabled:opacity-50">
            {loading ? "Agendando…" : "Agendar publicação"}
          </button>
        </form>
      )}
    </main>
  );
}
