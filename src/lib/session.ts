import { auth } from "@/auth";

// Obtém o usuário autenticado ou lança 401 (uso em route handlers).
export async function requireUser(): Promise<{ id: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new HttpError(401, "unauthorized");
  }
  return { id: session.user.id };
}

export class HttpError extends Error {
  constructor(public status: number, public code: string, message?: string) {
    super(message ?? code);
  }
}

export function errorResponse(e: unknown): Response {
  if (e instanceof HttpError) {
    return Response.json({ error: e.code, message: e.message }, { status: e.status });
  }
  console.error(e);
  return Response.json({ error: "internal_error" }, { status: 500 });
}
