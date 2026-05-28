import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ applicationId: string }> },
) {
  try {
    const user = await requireUser();
    const { applicationId } = await params;
    const body = await request.json();
    const eventType = typeof body.eventType === "string" ? body.eventType.trim() : "";
    const detail = typeof body.detail === "string" ? body.detail.trim() : null;
    const durationSeconds = Number(body.durationSeconds ?? 0);
    const severity = Number.isInteger(body.severity) ? Number(body.severity) : 1;
    const clientTimestamp =
      typeof body.clientTimestamp === "string" && !Number.isNaN(Date.parse(body.clientTimestamp))
        ? new Date(body.clientTimestamp)
        : null;

    if (!eventType) {
      return NextResponse.json({ error: "Missing eventType." }, { status: 400 });
    }

    const application = await prisma.teacherApplication.findUnique({
      where: { id: applicationId },
      select: { userId: true, status: true },
    });

    if (!application || application.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (application.status !== "DRAFT" && application.status !== "SUBMITTED") {
      return NextResponse.json({ ok: true, ignored: true });
    }

    await prisma.$transaction([
      prisma.antiCheatLog.create({
        data: {
          applicationId,
          eventType,
          detail,
          severity,
          clientTimestamp,
          metadata: body.metadata ?? undefined,
        } as never,
      }),
      prisma.suspiciousEvent.upsert({
        where: { applicationId_eventType: { applicationId, eventType } },
        update: {
          count: { increment: 1 },
          totalDurationSeconds: { increment: Number.isFinite(durationSeconds) ? Math.max(0, Math.trunc(durationSeconds)) : 0 },
          severity: Math.max(1, severity),
        },
        create: {
          applicationId,
          eventType,
          count: 1,
          totalDurationSeconds: Number.isFinite(durationSeconds) ? Math.max(0, Math.trunc(durationSeconds)) : 0,
          severity: Math.max(1, severity),
        },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Loi he thong." }, { status: 500 });
  }
}
