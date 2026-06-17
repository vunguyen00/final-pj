import { NextResponse } from "next/server";
import { getDatabaseUrlTarget } from "@/lib/database-url";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown database error.";
}

async function getDatabaseStatus() {
  const startedAt = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1`;

    return {
      ok: true,
      status: "connected",
      target: getDatabaseUrlTarget(),
      latencyMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      ok: false,
      status: "error",
      target: getDatabaseUrlTarget(),
      latencyMs: Date.now() - startedAt,
      error: getErrorMessage(error),
    };
  }
}

export async function GET(request: Request) {
  const database = await getDatabaseStatus();

  return NextResponse.json(
    {
      ok: database.ok,
      "request.url": request.url,
      host: request.headers.get("host"),
      "x-forwarded-host": request.headers.get("x-forwarded-host"),
      "x-forwarded-proto": request.headers.get("x-forwarded-proto"),
      database,
    },
    { status: database.ok ? 200 : 503 },
  );
}
