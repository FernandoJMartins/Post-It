import Link from "next/link";
import { auth } from "@/auth";

export default async function Home() {
  const session = await auth();
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-4xl font-bold">📱 Postador Insta</h1>
      <p className="text-neutral-500">
        Agende publicações em múltiplas contas. Fila persistente, à prova de restart.
      </p>
      <div className="flex gap-3">
        {session?.user ? (
          <Link href="/dashboard" className="rounded-lg bg-indigo-600 px-5 py-2 text-white">
            Ir ao dashboard
          </Link>
        ) : (
          <>
            <Link href="/login" className="rounded-lg bg-indigo-600 px-5 py-2 text-white">
              Entrar
            </Link>
            <Link href="/register" className="rounded-lg border px-5 py-2">
              Criar conta
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
