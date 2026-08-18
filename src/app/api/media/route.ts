import { requireUser, errorResponse } from "@/lib/session";
import { listMedia } from "@/modules/media/service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    return Response.json(await listMedia(user.id));
  } catch (e) {
    return errorResponse(e);
  }
}
