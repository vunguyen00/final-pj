import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { recordTeacherAntiCheatEvent } from "@/lib/teacher-anti-cheat";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ applicationId: string }> },
) {
  try {
    const user = await requireUser();
    const { applicationId } = await params;
    const body = await request.json();
    const eventType = typeof body.eventType === "string" ? body.eventType.trim() : "";
    const detail = typeof body.detail === "string" ? body.detail.trim().slice(0, 500) : null;
    const rawDuration = Number(body.durationSeconds ?? 0);
    const durationSeconds = Number.isFinite(rawDuration)
      ? Math.min(3600, Math.max(0, Math.trunc(rawDuration)))
      : 0;
    const rawConfidence = Number(body.confidence);
    const confidence = Number.isFinite(rawConfidence)
      ? Math.min(1, Math.max(0, rawConfidence))
      : null;
    const clientTimestamp =
      typeof body.clientTimestamp === "string" && !Number.isNaN(Date.parse(body.clientTimestamp))
        ? new Date(body.clientTimestamp)
        : null;
    const incidentId =
      typeof body.metadata?.incidentId === "string" &&
      /^[a-zA-Z0-9-]{16,100}$/.test(body.metadata.incidentId)
        ? body.metadata.incidentId
        : null;

    if (!eventType) {
      return NextResponse.json({ error: "Thiếu loại sự kiện." }, { status: 400 });
    }

    const result = await recordTeacherAntiCheatEvent(applicationId, user.id, {
      eventType,
      detail,
      durationSeconds,
      confidence,
      clientTimestamp,
      metadata:
        body.metadata && typeof body.metadata === "object" ? body.metadata : undefined,
      incidentId,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (message === "INVALID_ANTI_CHEAT_EVENT") {
      return NextResponse.json({ error: "Sự kiện không hợp lệ." }, { status: 400 });
    }
    console.error("Unable to record teacher anti-cheat event", { error });
    return NextResponse.json({ error: "Lỗi hệ thống." }, { status: 500 });
  }
}
