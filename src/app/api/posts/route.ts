import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, errorResponse, HttpError } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { createScheduledPost } from "@/modules/posts/service";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  instagramAccountId: z.string(),
  mediaId: z.string(),
  caption: z.string().max(2200).optional(),
  scheduledAt: z.string().datetime(), // ISO UTC
  timezone: z.string().default("America/Fortaleza"),
});

export async function GET() {
  try {
    const user = await requireUser();
    const posts = await prisma.post.findMany({
      where: { userId: user.id, deletedAt: null },
      orderBy: { scheduledAt: "desc" },
      take: 100,
      include: { account: { select: { username: true } }, media: { select: { filename: true, thumbnailUrl: true } } },
    });
    return Response.json(posts);
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const rl = await rateLimit(`posts:${user.id}`, 10);
    if (!rl.ok) throw new HttpError(429, "rate_limited");

    const body = createSchema.parse(await req.json());
    const post = await createScheduledPost({
      userId: user.id,
      instagramAccountId: body.instagramAccountId,
      mediaId: body.mediaId,
      caption: body.caption,
      scheduledAtUtc: new Date(body.scheduledAt),
      timezone: body.timezone,
    });
    return Response.json(post, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return Response.json({ error: "validation_error", issues: e.issues }, { status: 400 });
    }
    return errorResponse(e);
  }
}
