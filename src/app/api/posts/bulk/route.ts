import { z } from "zod";
import { requireUser, errorResponse, HttpError } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { planBulk, commitBulk } from "@/modules/posts/bulk";

export const dynamic = "force-dynamic";

const schema = z.object({
  accountId: z.string(),
  mediaIds: z.array(z.string()).min(1).max(50),
  firstAt: z.string().datetime(),
  intervalMinutes: z.number().int().positive().max(60 * 24),
  timezone: z.string().default("America/Fortaleza"),
  commit: z.boolean().default(false), // false = preview, true = cria (README 60)
});

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const rl = await rateLimit(`bulk:${user.id}`, 20);
    if (!rl.ok) throw new HttpError(429, "rate_limited");

    const body = schema.parse(await req.json());
    const args = {
      userId: user.id,
      accountId: body.accountId,
      mediaIds: body.mediaIds,
      firstAtUtc: new Date(body.firstAt),
      intervalMinutes: body.intervalMinutes,
      timezone: body.timezone,
    };

    if (!body.commit) {
      return Response.json({ preview: await planBulk(args) });
    }
    return Response.json(await commitBulk(args), { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return Response.json({ error: "validation_error", issues: e.issues }, { status: 400 });
    }
    return errorResponse(e);
  }
}
