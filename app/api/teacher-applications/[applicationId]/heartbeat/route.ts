import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  ANTI_CHEAT_CONFIG,
  recordTeacherAntiCheatEvent,
} from "@/lib/teacher-anti-cheat";

type HeartbeatBody = {
  sessionId?: unknown;
  sequence?: unknown;
  visible?: unknown;
  focused?: unknown;
  fullscreen?: unknown;
  cameraActive?: unknown;
  extendedDisplay?: unknown;
  clientTimestamp?: unknown;
  incidentId?: unknown;
};

function booleanValue(value: unknown) {
  return value === true;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ applicationId: string }> },
) {
  try {
    const user = await requireUser();
    const { applicationId } = await params;
    const body = (await request.json().catch(() => ({}))) as HeartbeatBody;
    const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : "";
    const sequence = Number(body.sequence);
    const incidentId =
      typeof body.incidentId === "string" && /^[a-zA-Z0-9-]{16,100}$/.test(body.incidentId)
        ? body.incidentId
        : null;

    if (!/^[a-zA-Z0-9-]{16,100}$/.test(sessionId) || !Number.isSafeInteger(sequence) || sequence < 1) {
      return NextResponse.json({ error: "Heartbeat không hợp lệ." }, { status: 400 });
    }

    const application = await prisma.teacherApplication.findUnique({
      where: { id: applicationId },
      select: {
        userId: true,
        status: true,
        startedAt: true,
        proctorSessionId: true,
        proctorHeartbeatAt: true,
        proctorHeartbeatSequence: true,
      },
    });

    if (!application || application.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (application.status !== "DRAFT" || !application.startedAt) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const now = new Date();
    const gapSeconds = application.proctorHeartbeatAt
      ? Math.floor((now.getTime() - application.proctorHeartbeatAt.getTime()) / 1000)
      : 0;
    const differentLiveSession = Boolean(
      application.proctorSessionId &&
      application.proctorSessionId !== sessionId &&
      application.proctorHeartbeatAt &&
      gapSeconds < ANTI_CHEAT_CONFIG.heartbeatGapSeconds,
    );

    let eventType = "";
    let detail = "";
    let durationSeconds = 0;

    if (differentLiveSession) {
      eventType = "MULTIPLE_EXAM_SESSIONS";
      detail = "Phát hiện heartbeat từ một phiên trình duyệt khác";
    } else if (
      application.proctorHeartbeatAt &&
      application.proctorHeartbeatSequence > 0 &&
      gapSeconds >= ANTI_CHEAT_CONFIG.heartbeatGapSeconds
    ) {
      eventType = "PROCTOR_HEARTBEAT_GAP";
      detail = `Mất heartbeat giám sát ${gapSeconds} giây`;
      durationSeconds = gapSeconds;
    } else if (!booleanValue(body.cameraActive)) {
      eventType = "CAMERA_DISABLED";
      detail = "Heartbeat báo camera không hoạt động";
    } else if (booleanValue(body.extendedDisplay)) {
      eventType = "MULTIPLE_DISPLAYS";
      detail = "Screen API báo thiết bị đang dùng nhiều màn hình";
    } else if (!booleanValue(body.fullscreen)) {
      eventType = "FULLSCREEN_EXIT";
      detail = "Heartbeat báo đã rời chế độ toàn màn hình";
    } else if (!booleanValue(body.visible)) {
      eventType = "TAB_HIDDEN";
      detail = "Heartbeat báo tab bài thi đang bị ẩn";
    } else if (!booleanValue(body.focused)) {
      eventType = "WINDOW_BLUR";
      detail = "Heartbeat báo cửa sổ bài thi mất focus";
    }

    const violation = eventType
      ? await recordTeacherAntiCheatEvent(applicationId, user.id, {
          eventType,
          detail,
          durationSeconds,
          confidence: 1,
          clientTimestamp:
            typeof body.clientTimestamp === "string" && !Number.isNaN(Date.parse(body.clientTimestamp))
              ? new Date(body.clientTimestamp)
              : null,
          metadata: { sessionId, sequence, source: "proctor-heartbeat" },
          incidentId,
        })
      : null;

    if (!violation?.failed) {
      await prisma.teacherApplication.updateMany({
        where: { id: applicationId, status: "DRAFT" },
        data: {
          proctorSessionId: sessionId,
          proctorHeartbeatAt: now,
          proctorHeartbeatSequence: Math.max(sequence, application.proctorHeartbeatSequence),
        },
      });
    }

    return NextResponse.json({
      ok: true,
      violation,
      serverTimestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("Unable to process proctor heartbeat", { error });
    return NextResponse.json({ error: "Không thể ghi nhận heartbeat giám sát." }, { status: 500 });
  }
}
