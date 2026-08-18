"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const res = await signIn("credentials", {
      email: String(form.get("email")),
      password: String(form.get("password")),
      redirect: false,
    });
    setLoading(false);
    if (res?.error) setError("Credenciais inválidas.");
    else router.push("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-bold">Entrar</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <input name="email" type="email" required placeholder="email" className="rounded border p-2 dark:bg-neutral-900" />
        <input name="password" type="password" required placeholder="senha" className="rounded border p-2 dark:bg-neutral-900" />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button disabled={loading} className="rounded bg-indigo-600 p-2 text-white disabled:opacity-50">
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
      <p className="text-sm text-neutral-500">
        Sem conta? <Link href="/register" className="text-indigo-500">Criar</Link>
      </p>
    </main>
  );
}
