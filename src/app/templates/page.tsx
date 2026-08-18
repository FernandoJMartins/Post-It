"use client";

import { useEffect, useState, useCallback } from "react";

type Template = {
  id: string;
  name: string;
  timeOfDay: string;
  caption: string | null;
  hashtags: string | null;
};

export default function TemplatesPage() {
  const [items, setItems] = useState<Template[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/templates");
    if (r.ok) setItems(await r.json());
  }, []);

  useEffect(() => { load(); }, [load]);

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    const f = new FormData(e.currentTarget);
    const res = await fetch("/api/templates", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: f.get("name"),
        timeOfDay: f.get("timeOfDay"),
        caption: f.get("caption") || undefined,
        hashtags: f.get("hashtags") || undefined,
      }),
    });
    if (res.ok) { (e.target as HTMLFormElement).reset(); load(); }
    else setMsg("Falha ao criar template.");
  }

  async function remove(id: string) {
    await fetch(`/api/templates/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Templates de agendamento</h1>
        <a href="/dashboard" className="text-sm text-indigo-500">← Dashboard</a>
      </div>

      <form onSubmit={create} className="mb-8 flex flex-col gap-3 rounded-xl border p-4 dark:border-neutral-800">
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">Nome
            <input name="name" required placeholder="Post diário" className="rounded border p-2 dark:bg-neutral-900" />
          </label>
          <label className="flex flex-col gap-1 text-sm">Horário
            <input name="timeOfDay" type="time" required defaultValue="18:30" className="rounded border p-2 dark:bg-neutral-900" />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm">Legenda padrão
          <textarea name="caption" rows={2} className="rounded border p-2 dark:bg-neutral-900" />
        </label>
        <label className="flex flex-col gap-1 text-sm">Hashtags padrão
          <input name="hashtags" placeholder="#marketing #negocios" className="rounded border p-2 dark:bg-neutral-900" />
        </label>
        {msg && <p className="text-sm text-red-500">{msg}</p>}
        <button className="rounded-lg bg-indigo-600 p-2 text-white">Criar template</button>
      </form>

      {items.length === 0 ? (
        <p className="text-sm text-neutral-500">Nenhum template ainda.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((t) => (
            <li key={t.id} className="flex items-center justify-between rounded-xl border p-3 text-sm dark:border-neutral-800">
              <div>
                <div className="font-medium">{t.name} <span className="text-neutral-400">· {t.timeOfDay}</span></div>
                {(t.caption || t.hashtags) && (
                  <div className="text-neutral-500">{[t.caption, t.hashtags].filter(Boolean).join(" ")}</div>
                )}
              </div>
              <button onClick={() => remove(t.id)} className="rounded border border-red-300 px-2 py-1 text-xs text-red-600">Excluir</button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
