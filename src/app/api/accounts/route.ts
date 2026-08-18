import { requireUser, errorResponse } from "@/lib/session";
import { listAccounts } from "@/modules/accounts/service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    return Response.json(await listAccounts(user.id));
  } catch (e) {
    return errorResponse(e);
  }
}
