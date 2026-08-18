import { z } from "zod";
import { requireUser, errorResponse, HttpError } from "@/lib/session";
import { upsertConnectedAccount } from "@/modules/accounts/service";

export const dynamic = "force-dynamic";

const schema = z.object({
  username: z.string().min(1).max(60),
  externalAccountId: z.string().min(1).default("dev-manual"),
});

// Conexão manual apenas para desenvolvimento (sem app Meta configurado).
// Cria conta CONNECTED com token de teste para exercitar UI e pipeline.
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    if (process.env.NODE_ENV === "production") {
      throw new HttpError(403, "manual_connect_disabled");
    }
    const body = schema.parse(await req.json());
    const uname = body.username.startsWith("@") ? body.username : `@${body.username}`;

    const account = await upsertConnectedAccount({
      userId: user.id,
      externalAccountId: body.externalAccountId,
      username: uname,
      displayName: "Conta de teste (dev)",
      accessToken: `dev_token_${crypto.randomUUID()}`,
      expiresInSec: 60 * 24 * 3600,
    });
    return Response.json({ id: account.id, username: account.username }, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return Response.json({ error: "validation_error", issues: e.issues }, { status: 400 });
    }
    return errorResponse(e);
  }
}
