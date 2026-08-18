"use client";

import { useEffect, useState, useCallback } from "react";

type Account = { id: string; username: string; status: string; postingEnabled: boolean };
type Media = { id: string; filename: string; status: string };
type Rec = {
  id: string;
  name: string;
  rule: string;
  weekday: number | null;
  timeOfDay: string;
  mediaIds: string[];
  active: boolean;
  account: { username: string };
};

const RULE_LABEL: Record<string, string> = { DAILY: "Todo dia", WEEKDAYS: "Seg–Sex", WEEKLY: "Semanal" };
const WD = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function RecurringPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [media, setMedia] = useState<Media[]>([]);
  const [list, setList] = useState<Rec[]>([]);
  const [sel, setSel] = useState<string[]>([]);
  const [rule, setRule] = useState("DAILY");
  const [msg, setMsg] = useState<string | null>(null);
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const load = useCallback(async () => {
    const r = await fetch("/api/recurring");
    if (r.ok) setList(await r.json());
  }, []);

  useEffect(() => {
    fetch("/api/accounts").then((r) => r.json()).then((a: Account[]) => setAccounts(a.filter((x) => x.status === "CONNECTED")));
    fetch("/api/media").then((r) => r.json()).then((m: Media[]) => setMedia(m.filter((x) => x.status === "READY")));
    load();
  }, [load]);

  function toggleMedia(id: string) {
    setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    const f = new FormData(e.currentTarget);
    const res = await fetch("/api/recurring", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        accountId: f.get("accountId"),
        name: f.get("name"),
        rule,
        weekday: rule === "WEEKLY" ? Number(f.get("weekday")) : undefined,
        timeOfDay: f.get("timeOfDay"),
        timezone: tz,
        mediaIds: sel,
      }),
    });
    if (res.ok) {
      setSel([]);
      (e.target as HTMLFormElement).reset();
      load();
    } else {
      const d = await res.json().catch(() => ({}));
      setMsg(d.error === "fila_vazia" ? "Selecione ao menos um vídeo." : `Erro: ${d.error ?? res.status}`);
    }
  }

  async function toggle(r: Rec) {
    await fetch(`/api/recurring/${r.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ active: !r.active }),
    });
    load();
  }

  async function remove(id: string) {
    if (!confirm("Excluir esta recorrência?")) return;
    await fetch(`/api/recurring/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Recorrência / Fila de conteúdo</h1>
        <a href="/dashboard" className="text-sm text-indigo-500">← Dashboard</a>
      </div>

      {accounts.length === 0 || media.length === 0 ? (
        <div className="mb-6 rounded-xl border border-dashed p-6 text-center text-sm text-neutral-500 dark:border-neutral-800">
          Precisa de conta conectada e vídeos prontos. <a href="/accounts" className="text-indigo-500">Contas</a> · <a href="/media" className="text-indigo-500">Mídia</a>
        </div>
      ) : (
        <form onSubmit={create} className="mb-8 flex flex-col gap-3 rounded-xl border p-4 dark:border-neutral-800">
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm">Nome
              <input name="name" required placeholder="Post diário" className="rounded border p-2 dark:bg-neutral-900" />
            </label>
            <label className="flex flex-col gap-1 text-sm">Conta
              <select name="accountId" className="rounded border p-2 dark:bg-neutral-900">
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.username}</option>)}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <label className="flex flex-col gap-1 text-sm">Regra
              <select value={rule} onChange={(e) => setRule(e.target.value)} className="rounded border p-2 dark:bg-neutral-900">
                <option value="DAILY">Todo dia</option>
                <option value="WEEKDAYS">Seg–Sex</option>
                <option value="WEEKLY">Semanal</option>
              </select>
            </label>
            {rule === "WEEKLY" && (
              <label className="flex flex-col gap-1 text-sm">Dia
                <select name="weekday" className="rounded border p-2 dark:bg-neutral-900">
                  {WD.map((w, i) => <option key={i} value={i}>{w}</option>)}
                </select>
              </label>
            )}
            <label className="flex flex-col gap-1 text-sm">Horário
              <input name="timeOfDay" type="time" required defaultValue="18:30" className="rounded border p-2 dark:bg-neutral-900" />
            </label>
          </div>
          <div className="text-sm">
            <div className="mb-1">Fila de vídeos ({sel.length}) — publicados em rotação</div>
            <ul className="max-h-40 space-y-1 overflow-y-auto rounded border p-2 dark:border-neutral-800">
              {media.map((m) => (
                <li key={m.id}>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={sel.includes(m.id)} onChange={() => toggleMedia(m.id)} />
                    {m.filename}
                  </label>
                </li>
              ))}
            </ul>
          </div>
          {msg && <p className="text-sm text-red-500">{msg}</p>}
          <button className="rounded-lg bg-indigo-600 p-2 text-white">Criar recorrência</button>
        </form>
      )}

      <h2 className="mb-2 text-sm font-medium">Recorrências ativas</h2>
      {list.length === 0 ? (
        <p className="text-sm text-neutral-500">Nenhuma recorrência ainda.</p>
      ) : (
        <ul className="space-y-2">
          {list.map((r) => (
            <li key={r.id} className="flex items-center justify-between rounded-xl border p-3 text-sm dark:border-neutral-800">
              <div>
                <div className="font-medium">{r.name} <span className="text-neutral-400">· {r.account.username}</span></div>
                <div className="text-neutral-500">
                  {RULE_LABEL[r.rule]}{r.rule === "WEEKLY" && r.weekday != null ? ` (${WD[r.weekday]})` : ""} às {r.timeOfDay} · {r.mediaIds.length} vídeos
                  {!r.active && <span className="text-yellow-600"> · pausada</span>}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => toggle(r)} className="rounded border px-2 py-1 text-xs">{r.active ? "Pausar" : "Ativar"}</button>
                <button onClick={() => remove(r.id)} className="rounded border border-red-300 px-2 py-1 text-xs text-red-600">Excluir</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
