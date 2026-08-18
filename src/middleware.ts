import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Middleware usa apenas a config leve (edge-safe), sem argon2/Prisma.
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const isAuth = !!req.auth;
  const path = nextUrl.pathname;

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
