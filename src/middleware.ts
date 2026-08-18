import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Middleware usa apenas a config leve (edge-safe), sem argon2/Prisma.
const { auth } = NextAuth(authConfig);

const MUTATING = ["POST", "PUT", "PATCH", "DELETE"];

export default auth((req) => {
  const { nextUrl } = req;
  const isAuth = !!req.auth;
  const path = nextUrl.pathname;

  // CSRF (README 51): mutações em APIs próprias exigem Origin do mesmo host.
  // /api/auth é tratado pelo próprio Auth.js.
  if (path.startsWith("/api") && !path.startsWith("/api/auth") && MUTATING.includes(req.method)) {
    const origin = req.headers.get("origin");
    if (origin) {
      try {
        if (new URL(origin).host !== nextUrl.host) {
          return Response.json({ error: "csrf_origin_mismatch" }, { status: 403 });
        }
      } catch {
        return Response.json({ error: "csrf_bad_origin" }, { status: 403 });
      }
    }
  }

  const isPublic =
    path.startsWith("/login") ||
    path.startsWith("/register") ||
    path.startsWith("/api/auth") ||
    path.startsWith("/api/register") ||
    path.startsWith("/api/health") ||
    path === "/";

  if (!isAuth && !isPublic) {
    if (path.startsWith("/api")) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
    return Response.redirect(new URL("/login", nextUrl));
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
