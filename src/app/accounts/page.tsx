"use client";

import { useEffect, useState, useCallback } from "react";

type Account = {
  id: string;
  username: string;
  displayName?: string | null;
  profilePictureUrl?: string | null;
  status: string;
  postingEnabled: boolean;
  timezone: string;
  tokenExpiresAt?: string | null;
};

const STATUS_STYLE: Record<string, string> = {
  CONNECTED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  REAUTH_REQUIRED: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  TOKEN_EXPIRED: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  DISCONNECTED: "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  ERROR: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  SUSPENDED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [manual, setManual] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/accounts");
    if (res.ok) setAccounts(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("connected")) setMsg("Conta conectada com sucesso.");
    if (p.get("error")) setMsg(`Erro ao conectar: ${p.get("error")}`);
    load();
  }, [load]);

  async function connectOAuth() {
    const res = await fetch("/api/accounts/connect", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.url) {
      window.location.href = data.url;
    } else if (data.error === "meta_not_configured") {
      setMsg("App Meta não configurado. Use a conexão manual (dev) abaixo ou preencha META_CLIENT_ID/SECRET no .env.");
    } else {
      setMsg("Falha ao iniciar OAuth.");
    }
  }

  async function connectManual(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/accounts/manual", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: manual || "conta_teste" }),
    });
    if (res.ok) {
      setManual("");
      setMsg("Conta de teste conectada.");
      load();
    } else {
      setMsg("Não foi possível conectar (manual disponível só em dev).");
    }
  }

  async function action(id: string, path: string, method = "POST") {
    await fetch(`/api/accounts/${id}${path}`, { method });
    load();
  }

  async function remove(id: string) {
    if (!confirm("Excluir esta conta? Os agendamentos ficam sem publicar.")) return;
    await fetch(`/api/accounts/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Contas do Instagram</h1>
        <a href="/dashboard" className="text-sm text-indigo-500">← Dashboard</a>
      </div>

      {msg && (
        <div className="mb-4 rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-sm dark:border-indigo-800 dark:bg-indigo-950">
          {msg}
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-3">
        <button onClick={connectOAuth} className="rounded-lg bg-indigo-600 px-4 py-2 text-white">
          + Conectar Instagram
        </button>
        <form onSubmit={connectManual} className="flex gap-2">
          <input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="conexão manual (dev): @usuario"
            className="rounded-lg border px-3 py-2 text-sm dark:bg-neutral-900"
          />
          <button className="rounded-lg border px-3 py-2 text-sm">Conectar (dev)</button>
        </form>
      </div>

      {loading ? (
        <p className="text-neutral-500">Carregando…</p>
      ) : accounts.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-neutral-500 dark:border-neutral-800">
          Nenhuma conta conectada ainda.
          <br />
          Conecte uma conta do Instagram para começar a agendar.
        </div>
      ) : (
        <ul className="space-y-3">
          {accounts.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between rounded-xl border p-4 dark:border-neutral-800"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-200 text-sm dark:bg-neutral-800">
                  {a.username.replace("@", "").slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="font-medium">{a.username}</div>
                  <div className="flex items-center gap-2 text-xs text-neutral-500">
                    <span className={`rounded px-1.5 py-0.5 ${STATUS_STYLE[a.status] ?? ""}`}>
                      {a.status}
                    </span>
                    {!a.postingEnabled && <span className="text-yellow-600">⏸ pausada</span>}
                    <span>{a.timezone}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 text-sm">
                {a.postingEnabled ? (
                  <button onClick={() => action(a.id, "/pause")} className="rounded border px-2 py-1">
                    Pausar
                  </button>
                ) : (
                  <button onClick={() => action(a.id, "/resume")} className="rounded border px-2 py-1">
                    Retomar
                  </button>
                )}
                <button onClick={() => remove(a.id)} className="rounded border border-red-300 px-2 py-1 text-red-600">
                  Excluir
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
