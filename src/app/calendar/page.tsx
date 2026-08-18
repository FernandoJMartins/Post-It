"use client";

import { useEffect, useState, useCallback } from "react";

type Post = {
  id: string;
  caption: string | null;
  scheduledAt: string;
  status: string;
  account: { username: string };
  media: { filename: string };
};

const STATUS_DOT: Record<string, string> = {
  SCHEDULED: "bg-blue-500",
  QUEUED: "bg-blue-500",
  PROCESSING: "bg-yellow-500",
  PUBLISHING: "bg-yellow-500",
  PUBLISHED: "bg-green-500",
  FAILED: "bg-red-500",
  FAILED_PERMANENTLY: "bg-red-500",
  CANCELLED: "bg-neutral-400",
};

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export default function CalendarPage() {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [posts, setPosts] = useState<Post[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  const [drag, setDrag] = useState<Post | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const from = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const to = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59);
    const res = await fetch(`/api/calendar?from=${from.toISOString()}&to=${to.toISOString()}`);
    if (res.ok) setPosts(await res.json());
  }, [cursor]);

  // Drag & drop: solta o post em outro dia, mantendo a hora original (README 39).
  async function dropOn(day: number) {
    if (!drag) return;
    const orig = new Date(drag.scheduledAt);
    const target = new Date(cursor.getFullYear(), cursor.getMonth(), day, orig.getHours(), orig.getMinutes());
    setDrag(null);
    setMsg(null);
    const res = await fetch(`/api/posts/${drag.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scheduledAt: target.toISOString() }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setMsg(d.error === "time_conflict" ? "Conflito de horário nesse dia." : d.error === "scheduled_in_past" ? "Não dá pra remarcar no passado." : d.error === "post_nao_editavel" ? "Post não pode mais ser editado." : `Falha: ${d.error ?? res.status}`);
    }
    load();
  }

  useEffect(() => {
    load();
  }, [load]);

  // Agrupa posts por dia (chave YYYY-MM-DD no horário local).
  const byDay = new Map<string, Post[]>();
  for (const p of posts) {
    const d = new Date(p.scheduledAt);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(p);
  }

  const firstWeekday = new Date(cursor.getFullYear(), cursor.getMonth(), 1).getDay();
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const today = new Date();
  const isToday = (day: number) =>
    today.getFullYear() === cursor.getFullYear() &&
    today.getMonth() === cursor.getMonth() &&
    today.getDate() === day;

  const move = (delta: number) =>
    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1));

  const selectedPosts = selected ? byDay.get(selected) ?? [] : [];

  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Calendário</h1>
        <div className="flex gap-3 text-sm">
          <a href="/schedule" className="rounded-lg bg-indigo-600 px-3 py-1.5 text-white">+ Agendar</a>
          <a href="/dashboard" className="text-indigo-500">← Dashboard</a>
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <button onClick={() => move(-1)} className="rounded border px-3 py-1">←</button>
        <div className="font-medium">{MONTHS[cursor.getMonth()]} {cursor.getFullYear()}</div>
        <button onClick={() => move(1)} className="rounded border px-3 py-1">→</button>
      </div>

      {msg && <p className="mb-2 text-sm text-red-500">{msg}</p>}
      {drag && <p className="mb-2 text-xs text-indigo-500">Arraste para um dia para remarcar “{drag.media.filename}”.</p>}

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-neutral-500">
        {WEEKDAYS.map((w) => <div key={w} className="py-1">{w}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} />;
          const key = `${cursor.getFullYear()}-${cursor.getMonth()}-${day}`;
          const dayPosts = byDay.get(key) ?? [];
          return (
            <button
              key={i}
              onClick={() => setSelected(key)}
              onDragOver={(e) => drag && e.preventDefault()}
              onDrop={() => dropOn(day)}
              className={`min-h-16 rounded border p-1 text-left align-top text-xs dark:border-neutral-800 ${
                isToday(day) ? "border-indigo-500" : ""
              } ${selected === key ? "ring-2 ring-indigo-500" : ""} ${drag ? "hover:bg-indigo-50 dark:hover:bg-indigo-950" : ""}`}
            >
              <div className={isToday(day) ? "font-bold text-indigo-500" : ""}>{day}</div>
              <div className="mt-1 flex flex-wrap gap-0.5">
                {dayPosts.slice(0, 4).map((p) => (
                  <span key={p.id} className={`h-2 w-2 rounded-full ${STATUS_DOT[p.status] ?? "bg-neutral-400"}`} />
                ))}
                {dayPosts.length > 4 && <span className="text-[10px]">+{dayPosts.length - 4}</span>}
              </div>
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-medium">Publicações do dia</h2>
          {selectedPosts.length === 0 ? (
            <p className="text-sm text-neutral-500">Nada agendado. <a href="/schedule" className="text-indigo-500">Agendar</a></p>
          ) : (
            <ul className="space-y-2">
              {selectedPosts.map((p) => (
                <li
                  key={p.id}
                  draggable={["SCHEDULED", "DRAFT", "FAILED", "CANCELLED"].includes(p.status)}
                  onDragStart={() => setDrag(p)}
                  onDragEnd={() => setDrag(null)}
                  className="flex cursor-grab items-center gap-2 rounded-lg border p-2 text-sm active:cursor-grabbing dark:border-neutral-800"
                >
                  <span className={`h-2 w-2 rounded-full ${STATUS_DOT[p.status] ?? "bg-neutral-400"}`} />
                  <span className="font-medium">{new Date(p.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  <span className="text-neutral-500">{p.account.username} · {p.media.filename}</span>
                  <span className="ml-auto text-xs text-neutral-400">{p.status}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </main>
  );
}
