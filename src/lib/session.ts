import { auth } from "@/auth";
import { HttpError } from "@/lib/errors";

// Reexporta para compatibilidade com route handlers existentes.
export { HttpError, errorResponse } from "@/lib/errors";

// Obtém o usuário autenticado ou lança 401 (uso em route handlers).
export async function requireUser(): Promise<{ id: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new HttpError(401, "unauthorized");
  }
  return { id: session.user.id };
}
