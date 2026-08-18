import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, errorResponse } from "@/lib/session";

export const dynamic = "force-dynamic";

const schema = z.object({ name: z.string().min(1).max(60) });

// Grupos de contas (README 103).
export async function GET() {
  try {
    const user = await requireUser();
    return Response.json(
      await prisma.accountGroup.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { accounts: true } } },
      }),
    );
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const { name } = schema.parse(await req.json());
    return Response.json(await prisma.accountGroup.create({ data: { userId: user.id, name } }), { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return Response.json({ error: "validation_error", issues: e.issues }, { status: 400 });
    }
    return errorResponse(e);
  }
}
