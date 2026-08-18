"use client";

import { useEffect, useState, useCallback, useRef } from "react";

type Media = {
  id: string;
  filename: string;
  status: string;
  sizeBytes: number | null;
  durationSeconds: number | null;
  previewUrl: string | null;
};

const STATUS_STYLE: Record<string, string> = {
  READY: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  PROCESSING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  UPLOADING: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  FAILED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export default function MediaPage() {
  const [items, setItems] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/media");
    if (res.ok) setItems(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 4000); // atualiza status de processamento
    return () => clearInterval(t);
  }, [load]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setStatus(`Enviando ${file.name}…`);
      const r1 = await fetch("/api/media/upload-url", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ filename: file.name, mimeType: file.type || "video/mp4", sizeBytes: file.size }),
      });
      if (!r1.ok) {
        const d = await r1.json().catch(() => ({}));
        setStatus(`Falha: ${d.error ?? r1.status}`);
        return;
      }
      const { mediaId, uploadUrl } = await r1.json();

      const put = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "content-type": file.type || "video/mp4" },
      });
      if (!put.ok) {
        setStatus(`Upload ao storage falhou (${put.status}). Verifique CORS do MinIO.`);
        return;
      }

      await fetch(`/api/media/${mediaId}/complete`, { method: "POST" });
      setStatus("Enviado. Processando…");
      if (inputRef.current) inputRef.current.value = "";
      load();
    } catch (err) {
      setStatus(`Erro: ${(err as Error).message}`);
    }
  }

  async function remove(id: string) {
    if (!confirm("Excluir este vídeo?")) return;
    const res = await fetch(`/api/media/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setStatus(d.error === "media_em_uso" ? "Vídeo tem agendamento pendente." : "Falha ao excluir.");
    }
    load();
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Biblioteca de mídia</h1>
        <a href="/dashboard" className="text-sm text-indigo-500">← Dashboard</a>
      </div>

      <div className="mb-4">
        <label className="inline-block cursor-pointer rounded-lg bg-indigo-600 px-4 py-2 text-white">
          + Enviar vídeo
          <input ref={inputRef} type="file" accept="video/mp4,video/quicktime" onChange={onFile} className="hidden" />
        </label>
        {status && <span className="ml-3 text-sm text-neutral-500">{status}</span>}
      </div>

      {loading ? (
        <p className="text-neutral-500">Carregando…</p>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-neutral-500 dark:border-neutral-800">
          Você ainda não possui vídeos. Envie o primeiro.
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((m) => (
            <li key={m.id} className="rounded-xl border p-3 dark:border-neutral-800">
              {m.previewUrl ? (
                <video src={m.previewUrl} className="mb-2 aspect-[9/16] w-full rounded object-cover" muted />
              ) : (
                <div className="mb-2 flex aspect-[9/16] w-full items-center justify-center rounded bg-neutral-100 text-3xl dark:bg-neutral-800">
                  🎬
                </div>
              )}
              <div className="truncate text-sm font-medium">{m.filename}</div>
              <div className="mt-1 flex items-center justify-between">
                <span className={`rounded px-1.5 py-0.5 text-xs ${STATUS_STYLE[m.status] ?? ""}`}>{m.status}</span>
                <button onClick={() => remove(m.id)} className="text-xs text-red-600">Excluir</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
