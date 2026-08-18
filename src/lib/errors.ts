// Erros HTTP desacoplados de auth/Next, para poderem ser testados isoladamente.
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
