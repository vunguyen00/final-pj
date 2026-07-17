import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      ok: true,
      status: "healthy",
      database: { ok: true, latencyMs: Date.now() - startedAt },
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        status: "unavailable",
        database: { ok: false, latencyMs: Date.now() - startedAt },
      },
      { status: 503 },
    );
  }
}
