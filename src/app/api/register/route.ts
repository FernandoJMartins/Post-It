import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { rateLimit } from "@/lib/rate-limit";
import { errorResponse, HttpError } from "@/lib/session";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(200),
  consent: z.literal(true), // consentimento LGPD obrigatório (README 117)
});

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? "local";
    const rl = await rateLimit(`register:${ip}`, 10);
    if (!rl.ok) throw new HttpError(429, "rate_limited");

    const body = schema.parse(await req.json());

    const exists = await prisma.user.findUnique({ where: { email: body.email } });
    if (exists) throw new HttpError(409, "email_in_use");

    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        passwordHash: await hashPassword(body.password),
      },
      select: { id: true, name: true, email: true },
    });

    await prisma.auditLog.create({
      data: { userId: user.id, action: "USER_REGISTERED", resourceType: "user", resourceId: user.id, ip },
    });

    return Response.json(user, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return Response.json({ error: "validation_error", issues: e.issues }, { status: 400 });
    }
    return errorResponse(e);
  }
}
