"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Account = { id: string; username: string; status: string; postingEnabled: boolean };
type Media = { id: string; filename: string; status: string };
type Slot = { mediaId: string; filename: string; scheduledAt: string; conflict: boolean };

export default function BulkPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [media, setMedia] = useState<Media[]>([]);
  const [accountId, setAccountId] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [firstAt, setFirstAt] = useState("");
  const [interval, setIntervalMin] = useState(120);
  const [preview, setPreview] = useState<Slot[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  useEffect(() => {
    fetch("/api/accounts").then((r) => r.json()).then((a: Account[]) => {
      const ok = a.filter((x) => x.status === "CONNECTED" && x.postingEnabled);
      setAccounts(ok);
      if (ok[0]) setAccountId(ok[0].id);
    });
    fetch("/api/media").then((r) => r.json()).then((m: Media[]) =>
      setMedia(m.filter((x) => x.status === "READY")),
    );
  }, []);

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
    setPreview(null);
  }

  async function call(commit: boolean) {
    setMsg(null);
    const res = await fetch("/api/posts/bulk", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        accountId,
        mediaIds: selected,
        firstAt: new Date(firstAt).toISOString(),
        intervalMinutes: interval,
        timezone: tz,
        commit,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg(data.error === "scheduled_in_past" ? "O primeiro horário precisa ser no futuro." : `Erro: ${data.error ?? res.status}`);
      return;
    }
    if (commit) {
      router.push("/calendar");
    } else {
      setPreview(data.preview);
    }
  }

  const canPreview = accountId && selected.length > 0 && firstAt;
  const conflicts = preview?.filter((s) => s.conflict).length ?? 0;

  return (
    <main className="mx-auto max-w-2xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Agendamento em massa</h1>
        <a href="/dashboard" className="text-sm text-indigo-500">← Dashboard</a>
      </div>

      {accounts.length === 0 || media.length === 0 ? (
        <div className="rounded-xl border border-dashed p-6 text-center text-sm text-neutral-500 dark:border-neutral-800">
          {accounts.length === 0 && <p>Nenhuma conta conectada. <a href="/accounts" className="text-indigo-500">Conectar</a></p>}
          {media.length === 0 && <p>Nenhum vídeo pronto. <a href="/media" className="text-indigo-500">Enviar</a></p>}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            Conta
            <select value={accountId} onChange={(e) => { setAccountId(e.target.value); setPreview(null); }} className="rounded border p-2 dark:bg-neutral-900">
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.username}</option>)}
            </select>
          </label>

          <div className="text-sm">
            <div className="mb-1">Vídeos ({selected.length} selecionados)</div>
            <ul className="max-h-48 space-y-1 overflow-y-auto rounded border p-2 dark:border-neutral-800">
              {media.map((m) => (
                <li key={m.id}>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={selected.includes(m.id)} onChange={() => toggle(m.id)} />
                    {m.filename}
                  </label>
                </li>
              ))}
            </ul>
            <p className="mt-1 text-xs text-neutral-500">A ordem de agendamento segue a ordem de seleção.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm">
              Primeiro horário ({tz})
              <input type="datetime-local" value={firstAt} onChange={(e) => { setFirstAt(e.target.value); setPreview(null); }} className="rounded border p-2 dark:bg-neutral-900" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Intervalo (minutos)
              <input type="number" min={1} value={interval} onChange={(e) => { setIntervalMin(Number(e.target.value)); setPreview(null); }} className="rounded border p-2 dark:bg-neutral-900" />
            </label>
          </div>

          {msg && <p className="text-sm text-red-500">{msg}</p>}

          <button disabled={!canPreview} onClick={() => call(false)} className="rounded-lg border p-2 text-sm disabled:opacity-50">
            Pré-visualizar
          </button>

          {preview && (
            <div className="rounded-xl border p-3 dark:border-neutral-800">
              <div className="mb-2 text-sm font-medium">
                Preview ({preview.length} posts{conflicts > 0 && `, ${conflicts} em conflito serão pulados`})
              </div>
              <ul className="space-y-1 text-sm">
                {preview.map((s, i) => (
                  <li key={i} className="flex items-center justify-between">
                    <span>{new Date(s.scheduledAt).toLocaleString()} · {s.filename}</span>
                    {s.conflict && <span className="text-xs text-red-500">conflito</span>}
                  </li>
                ))}
              </ul>
              <button onClick={() => call(true)} className="mt-3 w-full rounded-lg bg-indigo-600 p-2 text-white">
                Confirmar agendamento
              </button>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
