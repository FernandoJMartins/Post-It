"use client";

import { useEffect, useState } from "react";

type Log = {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  ip: string | null;
  createdAt: string;
};

export default function AuditPage() {
  const [logs, setLogs] = useState<Log[]>([]);

  useEffect(() => {
    fetch("/api/audit").then((r) => r.json()).then(setLogs);
  }, []);

  return (
    <main className="mx-auto max-w-2xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Auditoria</h1>
        <a href="/dashboard" className="text-sm text-indigo-500">← Dashboard</a>
      </div>
      {logs.length === 0 ? (
        <p className="text-sm text-neutral-500">Sem registros ainda.</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {logs.map((l) => (
            <li key={l.id} className="flex items-center justify-between rounded border p-2 dark:border-neutral-800">
              <span className="font-mono">{l.action}</span>
              <span className="text-neutral-500">{l.resourceType}{l.resourceId ? `:${l.resourceId.slice(0, 6)}` : ""}</span>
              <span className="text-xs text-neutral-400">{new Date(l.createdAt).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
