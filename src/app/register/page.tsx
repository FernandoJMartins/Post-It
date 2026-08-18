"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        password: form.get("password"),
        consent: form.get("consent") === "on",
      }),
    });
    setLoading(false);
    if (res.ok) router.push("/login");
    else {
      const data = await res.json().catch(() => ({}));
      setError(data.error === "email_in_use" ? "E-mail já cadastrado." : "Erro ao registrar.");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-bold">Criar conta</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <input name="name" required placeholder="nome" className="rounded border p-2 dark:bg-neutral-900" />
        <input name="email" type="email" required placeholder="email" className="rounded border p-2 dark:bg-neutral-900" />
        <input name="password" type="password" required minLength={8} placeholder="senha (mín. 8)" className="rounded border p-2 dark:bg-neutral-900" />
        <label className="flex items-start gap-2 text-xs text-neutral-500">
          <input name="consent" type="checkbox" required className="mt-0.5" />
          <span>Li e aceito a <a href="/privacy" className="text-indigo-500">Política de Privacidade</a> e o tratamento dos meus dados (LGPD).</span>
        </label>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button disabled={loading} className="rounded bg-indigo-600 p-2 text-white disabled:opacity-50">
          {loading ? "Criando..." : "Criar conta"}
        </button>
      </form>
      <p className="text-sm text-neutral-500">
        Já tem conta? <Link href="/login" className="text-indigo-500">Entrar</Link>
      </p>
    </main>
  );
}
