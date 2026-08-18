import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";

export const dynamic = "force-dynamic";

// Health check (README 84).
export async function GET() {
  const checks: Record<string, boolean> = {};
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch {
    checks.database = false;
  }
  try {
    await redis.ping();
    checks.redis = true;
  } catch {
    checks.redis = false;
  }
  const ok = Object.values(checks).every(Boolean);
  return Response.json({ ok, checks }, { status: ok ? 200 : 503 });
}
