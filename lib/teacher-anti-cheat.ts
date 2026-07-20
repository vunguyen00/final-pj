import { Prisma } from "@/.generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getTeacherEntranceSecurityLabels } from "@/lib/teacher-entrance-labels";

export const ANTI_CHEAT_CONFIG = {
  tabHiddenThresholdSeconds: 0,
  lookingAwayThresholdSeconds: 10,
  heartbeatIntervalMilliseconds: 3000,
  heartbeatGapSeconds: 10,
  maxViolations: 3,
} as const;

type Severity = "INFO" | "WARNING" | "VIOLATION";

type AntiCheatInput = {
  eventType: string;
  detail: string | null;
  durationSeconds: number;
  confidence: number | null;
  clientTimestamp: Date | null;
  metadata?: Prisma.InputJsonValue;
  incidentId?: string | null;
};

const KNOWN_EVENTS = new Set([
  "CONSENT_ACCEPTED",
  "TAB_HIDDEN",
  "WINDOW_BLUR",
  "FULLSCREEN_EXIT",
  "COPY_ATTEMPT",
  "PASTE_ATTEMPT",
  "CONTEXT_MENU",
  "DEVTOOLS_SHORTCUT",
  "NO_FACE",
  "MULTIPLE_FACES",
  "FACE_MISMATCH",
  "LOOKING_AWAY",
  "PHONE_DETECTED",
  "CAMERA_DISABLED",
  "PAGE_RELOAD_OR_CLOSE",
  "PROCTOR_HEARTBEAT_GAP",
  "MULTIPLE_DISPLAYS",
  "MULTIPLE_EXAM_SESSIONS",
]);

function classifyEvent(input: AntiCheatInput): Severity {
  switch (input.eventType) {
    case "CONSENT_ACCEPTED":
      return "INFO";
    case "TAB_HIDDEN":
    case "WINDOW_BLUR":
    case "FULLSCREEN_EXIT":
      return "VIOLATION";
    case "CAMERA_DISABLED":
    case "MULTIPLE_DISPLAYS":
    case "MULTIPLE_EXAM_SESSIONS":
    case "PROCTOR_HEARTBEAT_GAP":
      return "WARNING";
    case "MULTIPLE_FACES":
      return "WARNING";
    case "NO_FACE":
      return "WARNING";
    case "FACE_MISMATCH":
      return "WARNING";
    case "LOOKING_AWAY":
    case "PHONE_DETECTED":
    case "COPY_ATTEMPT":
    case "PASTE_ATTEMPT":
    case "CONTEXT_MENU":
    case "DEVTOOLS_SHORTCUT":
    case "PAGE_RELOAD_OR_CLOSE":
      return "WARNING";
    default:
      return "INFO";
  }
}

function severityNumber(severity: Severity) {
  if (severity === "VIOLATION") return 3;
  if (severity === "WARNING") return 2;
  return 1;
}

function eventMessage(eventType: string, languageCode?: string | null) {
  const localized = getTeacherEntranceSecurityLabels(languageCode).eventMessages[eventType];
  if (localized) return localized;
  const messages: Record<string, string> = {
    TAB_HIDDEN: "Bạn đã rời khỏi trang bài kiểm tra quá thời gian cho phép.",
    WINDOW_BLUR: "Cửa sổ bài kiểm tra đã mất trạng thái hoạt động.",
    FULLSCREEN_EXIT: "Bạn đã thoát chế độ toàn màn hình.",
    COPY_ATTEMPT: "Hệ thống ghi nhận thao tác sao chép trong bài kiểm tra.",
    PASTE_ATTEMPT: "Hệ thống ghi nhận nội dung dài được dán vào bài làm.",
    CONTEXT_MENU: "Hệ thống ghi nhận thao tác mở menu chuột phải.",
    DEVTOOLS_SHORTCUT: "Hệ thống ghi nhận tổ hợp phím dành cho công cụ phát triển.",
    NO_FACE: "Không phát hiện khuôn mặt trong khung hình đủ lâu.",
    MULTIPLE_FACES: "Phát hiện nhiều hơn một khuôn mặt trong khung hình.",
    FACE_MISMATCH: "Khuôn mặt hiện tại khác đáng kể so với lúc bắt đầu.",
    LOOKING_AWAY: "Bạn đã nhìn ra khỏi vùng màn hình hơn 10 giây.",
    PHONE_DETECTED: "Phát hiện vật thể có khả năng là điện thoại trong khung hình.",
    CAMERA_DISABLED: "Camera đã bị tắt hoặc mất quyền truy cập trong lúc làm bài.",
    PAGE_RELOAD_OR_CLOSE: "Hệ thống ghi nhận thao tác tải lại hoặc đóng trang.",
    PROCTOR_HEARTBEAT_GAP: "Kết nối giám sát bị gián đoạn quá thời gian cho phép.",
    MULTIPLE_DISPLAYS: "Hệ thống phát hiện thiết bị đang sử dụng nhiều màn hình.",
    MULTIPLE_EXAM_SESSIONS: "Hệ thống phát hiện nhiều phiên làm bài đồng thời.",
  };
  return messages[eventType] ?? "Hệ thống ghi nhận một hành vi đáng ngờ.";
}

export async function recordTeacherAntiCheatEvent(
  applicationId: string,
  userId: string,
  input: AntiCheatInput,
) {
  if (!KNOWN_EVENTS.has(input.eventType)) {
    throw new Error("INVALID_ANTI_CHEAT_EVENT");
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "TeacherApplication" WHERE "id" = ${applicationId} FOR UPDATE`;
    const application = await tx.teacherApplication.findUnique({
      where: { id: applicationId },
      select: {
        id: true,
        userId: true,
        status: true,
        violationCount: true,
        entranceAttemptId: true,
        entranceTestId: true,
        answerState: true,
        startedAt: true,
        language: { select: { code: true } },
        entranceTest: { select: { id: true, maxScore: true } },
      },
    });

    if (!application || application.userId !== userId) {
      throw new Error("FORBIDDEN");
    }
    if (application.status !== "DRAFT") {
      return {
        ignored: true,
        severity: "INFO" as Severity,
        counted: false,
        violationCount: application.violationCount,
        failed: application.status === "FAILED_CHEATING",
        attemptId: application.entranceAttemptId,
        languageCode: application.language.code,
      };
    }

    const severity = classifyEvent(input);
    const duplicate =
      severity === "VIOLATION" && input.incidentId
        ? await tx.antiCheatLog.findFirst({
            where: {
              applicationId,
              incidentId: input.incidentId,
              counted: true,
            },
            select: { id: true },
          })
        : null;
    const counted = severity === "VIOLATION" && !duplicate;

    await tx.antiCheatLog.create({
      data: {
        applicationId,
        testAttemptId: application.entranceAttemptId,
        eventType: input.eventType,
        detail: input.detail,
        severity: severityNumber(severity),
        durationSeconds: input.durationSeconds,
        confidence: input.confidence,
        counted,
        clientTimestamp: input.clientTimestamp,
        metadata: input.metadata,
        incidentId: counted ? input.incidentId : null,
      },
    });

    await tx.suspiciousEvent.upsert({
      where: { applicationId_eventType: { applicationId, eventType: input.eventType } },
      update: {
        count: { increment: 1 },
        totalDurationSeconds: { increment: input.durationSeconds },
        severity: severityNumber(severity),
      },
      create: {
        applicationId,
        eventType: input.eventType,
        count: 1,
        totalDurationSeconds: input.durationSeconds,
        severity: severityNumber(severity),
      },
    });

    if (input.eventType === "CONSENT_ACCEPTED") {
      await tx.teacherApplication.update({
        where: { id: applicationId },
        data: {
          antiCheatAcknowledgedAt: new Date(),
          startedAt: application.startedAt ?? new Date(),
        },
      });
    }

    const violationCount = application.violationCount + (counted ? 1 : 0);
    let attemptId = application.entranceAttemptId;
    const failed = counted && violationCount >= ANTI_CHEAT_CONFIG.maxViolations;

    if (failed) {
      if (!attemptId && application.entranceTest) {
        const attemptNo =
          (await tx.testAttempt.count({
            where: { testId: application.entranceTest.id, userId },
          })) + 1;
        const attempt = await tx.testAttempt.create({
          data: {
            testId: application.entranceTest.id,
            userId,
            attemptNo,
            score: 0,
            maxScore: application.entranceTest.maxScore,
            answers: application.answerState ?? undefined,
            results: {
              teacherApplicationId: applicationId,
              failedCheating: true,
              failureReason: "FAILED_CHEATING",
              violationCount,
            },
            startedAt: application.startedAt ?? new Date(),
            submittedAt: new Date(),
            isPassed: false,
          },
        });
        attemptId = attempt.id;
      }

      await tx.teacherApplication.update({
        where: { id: applicationId },
        data: {
          violationCount,
          failureReason: "FAILED_CHEATING",
          status: "FAILED_CHEATING",
          entranceAttemptId: attemptId,
          submittedAt: new Date(),
        },
      });
    } else if (counted) {
      await tx.teacherApplication.update({
        where: { id: applicationId },
        data: { violationCount },
      });
    }

    return {
      ignored: false,
      severity,
      counted,
      violationCount,
      failed,
      attemptId,
      languageCode: application.language.code,
    };
  });

  return {
    ...result,
    eventType: input.eventType,
    message: result.ignored ? "Sự kiện đã được bỏ qua." : eventMessage(input.eventType, result.languageCode),
    maxViolations: ANTI_CHEAT_CONFIG.maxViolations,
  };
}
