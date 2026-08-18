import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, errorResponse } from "@/lib/session";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().min(1).max(80),
  timeOfDay: z.string().regex(/^\d{2}:\d{2}$/),
  caption: z.string().max(2200).optional(),
  hashtags: z.string().max(500).optional(),
});

// Templates de agendamento (README 105).
export async function GET() {
  try {
    const user = await requireUser();
    return Response.json(
      await prisma.scheduleTemplate.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
    );
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = schema.parse(await req.json());
    return Response.json(
      await prisma.scheduleTemplate.create({ data: { userId: user.id, ...body } }),
      { status: 201 },
    );
  } catch (e) {
    if (e instanceof z.ZodError) {
      return Response.json({ error: "validation_error", issues: e.issues }, { status: 400 });
    }
    return errorResponse(e);
  }
}
