import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

// Dashboard (README 44). Métricas básicas do MVP.
export default async function Dashboard() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const [contas, agendados, publicados, erros] = await Promise.all([
    prisma.instagramAccount.count({ where: { userId, deletedAt: null, status: "CONNECTED" } }),
    prisma.post.count({ where: { userId, status: "SCHEDULED", deletedAt: null } }),
    prisma.post.count({ where: { userId, status: "PUBLISHED", deletedAt: null } }),
    prisma.post.count({ where: { userId, status: { in: ["FAILED", "FAILED_PERMANENTLY"] }, deletedAt: null } }),
  ]);

  const cards = [
    { label: "Contas", value: contas },
    { label: "Agendados", value: agendados },
    { label: "Publicados", value: publicados },
    { label: "Erros", value: erros },
  ];

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="mb-6 text-2xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border p-4 dark:border-neutral-800">
            <div className="text-3xl font-bold">{c.value}</div>
            <div className="text-sm text-neutral-500">{c.label}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
