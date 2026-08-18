"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";

// Configurações do usuário: exportar dados e excluir conta (LGPD — README 117, 118).
export default function SettingsPage() {
  const [busy, setBusy] = useState(false);

  async function exportData() {
    const res = await fetch("/api/account/export");
    if (!res.ok) return alert("Falha ao exportar.");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "meus-dados.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function deleteAccount() {
    if (!confirm("Excluir sua conta e TODOS os dados? Esta ação é irreversível.")) return;
    if (!confirm("Confirme novamente: isso remove contas, mídias e agendamentos.")) return;
    setBusy(true);
    const res = await fetch("/api/account", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ confirm: true }),
    });
    setBusy(false);
    if (res.ok) {
      await signOut({ redirectTo: "/" });
    } else {
      alert("Falha ao excluir conta.");
    }
  }

  return (
    <main className="mx-auto max-w-lg p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Configurações</h1>
        <a href="/dashboard" className="text-sm text-indigo-500">← Dashboard</a>
      </div>

      <section className="mb-6 rounded-xl border p-4 dark:border-neutral-800">
        <h2 className="mb-1 font-medium">Seus dados</h2>
        <p className="mb-3 text-sm text-neutral-500">Baixe uma cópia de tudo que guardamos sobre você (LGPD).</p>
        <button onClick={exportData} className="rounded-lg border px-4 py-2 text-sm">Exportar meus dados</button>
      </section>

      <section className="rounded-xl border border-red-200 p-4 dark:border-red-900">
        <h2 className="mb-1 font-medium text-red-600">Zona de perigo</h2>
        <p className="mb-3 text-sm text-neutral-500">Excluir sua conta remove permanentemente contas, mídias e agendamentos.</p>
        <button onClick={deleteAccount} disabled={busy} className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white disabled:opacity-50">
          {busy ? "Excluindo…" : "Excluir minha conta"}
        </button>
      </section>

      <p className="mt-6 text-xs text-neutral-400">
        Veja nossa <a href="/privacy" className="text-indigo-500">Política de Privacidade</a>.
      </p>
    </main>
  );
}
