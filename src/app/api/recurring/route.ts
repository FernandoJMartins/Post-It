import { z } from "zod";
import { requireUser, errorResponse } from "@/lib/session";
import { createRecurring, listRecurring } from "@/modules/recurring/service";

export const dynamic = "force-dynamic";

const schema = z.object({
  accountId: z.string(),
  name: z.string().min(1).max(80),
  rule: z.enum(["DAILY", "WEEKDAYS", "WEEKLY"]),
  weekday: z.number().int().min(0).max(6).optional(),
  timeOfDay: z.string().regex(/^\d{2}:\d{2}$/),
  timezone: z.string().default("America/Fortaleza"),
  mediaIds: z.array(z.string()).min(1).max(50),
});

export async function GET() {
  try {
    const user = await requireUser();
    return Response.json(await listRecurring(user.id));
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = schema.parse(await req.json());
    return Response.json(await createRecurring({ userId: user.id, ...body }), { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return Response.json({ error: "validation_error", issues: e.issues }, { status: 400 });
    }
    return errorResponse(e);
  }
}
