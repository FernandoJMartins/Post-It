import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import LogoutButton from "@/components/LogoutButton";

// Dashboard (README 44). Métricas básicas do MVP.
export default async function Dashboard() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const [contas, agendados, publicados, erros, midiaPronta] = await Promise.all([
    prisma.instagramAccount.count({ where: { userId, deletedAt: null, status: "CONNECTED" } }),
    prisma.post.count({ where: { userId, status: "SCHEDULED", deletedAt: null } }),
    prisma.post.count({ where: { userId, status: "PUBLISHED", deletedAt: null } }),
    prisma.post.count({ where: { userId, status: { in: ["FAILED", "FAILED_PERMANENTLY"] }, deletedAt: null } }),
    prisma.media.count({ where: { userId, status: "READY", deletedAt: null } }),
  ]);

  const passo1 = contas > 0;
  const passo2 = midiaPronta > 0;
  const prontoParaAgendar = passo1 && passo2;

  const cards = [
    { label: "Contas", value: contas },
    { label: "Agendados", value: agendados },
    { label: "Publicados", value: publicados },
    { label: "Erros", value: erros },
  ];

  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-neutral-500 sm:inline">{session.user.email}</span>
          <LogoutButton />
        </div>
      </div>

      <nav className="mb-6 flex flex-wrap gap-2 text-sm">
        <a href="/accounts" className="rounded-lg border px-3 py-1.5">Contas</a>
        <a href="/media" className="rounded-lg border px-3 py-1.5">Mídia</a>
        <a href="/calendar" className="rounded-lg border px-3 py-1.5">Calendário</a>
        <a href="/posts" className="rounded-lg border px-3 py-1.5">Publicações</a>
        <a href="/notifications" className="rounded-lg border px-3 py-1.5">🔔 Notificações</a>
        <a href="/errors" className="rounded-lg border px-3 py-1.5">Erros</a>
        <a href="/schedule" className="rounded-lg bg-indigo-600 px-3 py-1.5 text-white">+ Agendar</a>
        <a href="/bulk" className="rounded-lg border px-3 py-1.5">Em massa</a>
        <a href="/recurring" className="rounded-lg border px-3 py-1.5">Recorrência</a>
        <a href="/templates" className="rounded-lg border px-3 py-1.5">Templates</a>
        <a href="/audit" className="rounded-lg border px-3 py-1.5">Auditoria</a>
        <a href="/settings" className="rounded-lg border px-3 py-1.5">⚙️ Config</a>
      </nav>

      {!prontoParaAgendar && (
        <div className="mb-6 rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm dark:border-indigo-800 dark:bg-indigo-950">
          <div className="mb-2 font-medium">Comece em 3 passos</div>
          <ol className="space-y-1">
            <li>{passo1 ? "✅" : "1️⃣"} <a href="/accounts" className="text-indigo-600 dark:text-indigo-300 underline">Conectar uma conta do Instagram</a></li>
            <li>{passo2 ? "✅" : "2️⃣"} <a href="/media" className="text-indigo-600 dark:text-indigo-300 underline">Enviar um vídeo</a></li>
            <li>{prontoParaAgendar ? "✅" : "3️⃣"} <a href="/schedule" className="text-indigo-600 dark:text-indigo-300 underline">Agendar a publicação</a></li>
          </ol>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {cards.map((c) => (
          <a
            key={c.label}
            href={c.label === "Contas" ? "/accounts" : "#"}
            className="rounded-xl border p-4 dark:border-neutral-800"
          >
            <div className="text-3xl font-bold">{c.value}</div>
            <div className="text-sm text-neutral-500">{c.label}</div>
          </a>
        ))}
      </div>
    </main>
  );
}
