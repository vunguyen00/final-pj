"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import TeacherAntiCheatOverlays from "./components/TeacherAntiCheatOverlays";
import TeacherRegistrationPageState from "./components/TeacherRegistrationPageState";
import {
  SpeakingAnswerInput,
  type SpeakingActivity,
} from "@/app/components/SpeakingAnswerInput";
import { FormattedHint } from "@/app/components/FormattedHint";
import { getLearningUiLabels } from "@/lib/test-language-labels";
import { getSpeechRecognitionLocale } from "@/lib/test-rules";
import { getTeacherEntranceSecurityLabels } from "@/lib/teacher-entrance-labels";

type Language = { id: string; name: string; code: string };
type Question = {
  id: string;
  type: string;
  content: string;
  audioUrl: string | null;
  hint: string | null;
  score: number;
  preparationTimeSeconds: number | null;
  answerTimeSeconds: number | null;
  answers: { id: string; content: string; order: number }[] | null;
};
type EntranceTest = {
  id: string;
  name: string;
  description: string | null;
  assessmentMode: "STANDARD" | "WRITING" | "SPEAKING";
  timeLimit: number | null;
  shuffleQuestions: boolean;
  questions: Question[];
};
type Application = {
  id: string;
  status: string;
  attemptNo: number;
  language: Language;
  entranceTest: EntranceTest | null;
  answerState?: Record<string, string> | null;
  startedAt: string | null;
  createdAt: string;
  submittedAt: string | null;
  violationCount?: number;
  failureReason?: string | null;
  questionRevealState?: Record<string, string> | null;
};
export type AntiCheatSeverity = "INFO" | "WARNING" | "VIOLATION";
export type TeacherCameraStatus = "idle" | "requesting" | "active" | "unavailable";
type AntiCheatResponse = {
  eventType: string;
  severity: AntiCheatSeverity;
  counted: boolean;
  violationCount: number;
  failed: boolean;
  attemptId: string | null;
  message: string;
  maxViolations: number;
};
type ProctorHeartbeatResponse = {
  ok?: boolean;
  violation?: AntiCheatResponse | null;
};
type DetectedFace = { boundingBox: { x: number; y: number; width: number; height: number } };
type FaceDetectorInstance = { detect: (source: HTMLVideoElement) => Promise<DetectedFace[]> };
type FaceDetectorConstructor = new (options?: { maxDetectedFaces?: number; fastMode?: boolean }) => FaceDetectorInstance;
type ExtendedScreen = Screen & { isExtended?: boolean };
type ExamKeyboard = { lock: (keyCodes?: string[]) => Promise<void>; unlock: () => void };
type ExamNavigator = Navigator & { keyboard?: ExamKeyboard };
type ExamFullscreenOptions = FullscreenOptions & { keyboardLock?: "none" | "browser" };
type QuestionRevealInfo = {
  revealedAt: string;
  preparationTimeSeconds: number;
  answerTimeSeconds: number;
};
type SubmittedAiEvaluation = {
  language: string;
  overallScore: number;
  taskRelevance?: number;
  onTopic?: boolean;
  offTopicReason?: string;
  detailedComment?: string;
  sampleAnswer?: string;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
};
type SubmittedQuestionResult = {
  questionId: string;
  questionType: string;
  content: string;
  studentAnswer: string;
  earnedScore: number;
  score: number;
  aiEvaluation?: SubmittedAiEvaluation;
};

const applicationStatusLabels: Record<string, string> = {
  DRAFT: "Đang hoàn thiện",
  SUBMITTED: "Đã nộp",
  UNDER_REVIEW: "Đang được xét duyệt",
  APPROVED: "Đã được duyệt",
  REJECTED: "Bị từ chối",
  EXPIRED: "Đã hết hạn",
  FAILED_CHEATING: "Trượt do vi phạm quy định",
};

type TeacherRegistrationData = {
  generatedAt: string;
  setting: { enabled: boolean };
  languages: Language[];
  applications: Application[];
};

function autosaveAnswers(
  applicationId: string,
  answers: Record<string, string>,
) {
  const request = new XMLHttpRequest();
  request.open(
    "PATCH",
    `/api/teacher-applications/${applicationId}/autosave`,
  );
  request.setRequestHeader("Content-Type", "application/json");
  request.addEventListener("load", () => {
    if (request.status >= 400) {
      console.error("Teacher application autosave failed:", request.status);
    }
  });
  request.addEventListener("error", () => {
    console.error("Teacher application autosave failed: network error");
  });
  request.send(JSON.stringify({ answers }));
  return request;
}

async function logAntiCheatEvent(
  applicationId: string,
  eventType: string,
  detail?: string,
  durationSeconds?: number,
  confidence?: number,
  metadata?: Record<string, string | number | boolean>,
) {
  const response = await fetch(
    `/api/teacher-applications/${applicationId}/anti-cheat`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        eventType,
        detail,
        durationSeconds,
        confidence,
        metadata,
        clientTimestamp: new Date().toISOString(),
      }),
    },
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || "Không thể ghi nhận sự kiện chống gian lận.");
  }
  return data as AntiCheatResponse;
}

function formatCountdown(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

function stableQuestionRank(applicationId: string, questionId: string) {
  let hash = 2166136261;
  for (const character of `${applicationId}:${questionId}`) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function getEntranceTestDisplayName(
  test: EntranceTest,
  ui: ReturnType<typeof getLearningUiLabels>,
) {
  if (/^Teacher Entrance (Writing|Speaking)/i.test(test.name)) {
    return `${ui.testKind.TEACHER_ENTRANCE} - ${ui.assessment[test.assessmentMode]}`;
  }

  return test.name;
}

function hasDetectedExtendedDisplay() {
  return (window.screen as ExtendedScreen).isExtended === true;
}

async function lockExamKeyboard() {
  await (navigator as ExamNavigator).keyboard?.lock().catch(() => undefined);
}

function unlockExamKeyboard() {
  try {
    (navigator as ExamNavigator).keyboard?.unlock();
  } catch {
    // Fullscreen cleanup must continue even if this experimental API fails.
  }
}

function initialQuestionRevealInfo(application: Application | null) {
  const rawState = application?.questionRevealState;
  const state = rawState && typeof rawState === "object" && !Array.isArray(rawState) ? rawState : {};
  return Object.fromEntries(
    (application?.entranceTest?.questions ?? []).flatMap((question) => {
      const revealedAt = state[question.id];
      if (!revealedAt || (question.type !== "ESSAY" && question.type !== "SPEAKING")) return [];
      return [[question.id, {
        revealedAt,
        preparationTimeSeconds: question.preparationTimeSeconds ?? (question.type === "SPEAKING" ? 60 : 0),
        answerTimeSeconds: question.answerTimeSeconds ?? (question.type === "SPEAKING" ? 120 : 3600),
      }]];
    }),
  ) as Record<string, QuestionRevealInfo>;
}

function questionTimer(info: QuestionRevealInfo | undefined, now: number) {
  if (!info) return { preparationRemaining: 0, answerRemaining: 0, expired: false };
  const revealedAt = new Date(info.revealedAt).getTime();
  const preparationEndsAt = revealedAt + info.preparationTimeSeconds * 1000;
  const answerEndsAt = preparationEndsAt + info.answerTimeSeconds * 1000;
  return {
    preparationRemaining: Math.max(0, Math.ceil((preparationEndsAt - now) / 1000)),
    answerRemaining: Math.max(0, Math.ceil((answerEndsAt - Math.max(now, preparationEndsAt)) / 1000)),
    expired: now >= answerEndsAt,
  };
}

function useTeacherRegistrationPage(initialData: TeacherRegistrationData) {
  const initialApplication = initialData.applications.find(
    (item) => item.status === "DRAFT" && item.entranceTest,
  ) ?? null;
  const initialNow = new Date(initialData.generatedAt);
  const initialTimeLeft = initialApplication?.entranceTest?.timeLimit
    ? Math.max(
        0,
        initialApplication.entranceTest.timeLimit * 60 -
          (initialApplication.startedAt
            ? Math.floor(
                (initialNow.getTime() -
                  new Date(initialApplication.startedAt).getTime()) /
                  1000,
              )
            : 0),
      )
    : null;
  const initialMinimumExpiryDate = new Date(initialNow);
  initialMinimumExpiryDate.setDate(initialMinimumExpiryDate.getDate() + 1);

  const [loadingData, setLoadingData] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [minimumExpiryDate, setMinimumExpiryDate] = useState(
    () => initialMinimumExpiryDate.toISOString().slice(0, 10),
  );
  const [enabled, setEnabled] = useState(initialData.setting.enabled);
  const [languages, setLanguages] = useState<Language[]>(initialData.languages);
  const [applications, setApplications] = useState<Application[]>(
    initialData.applications,
  );
  const [languageId, setLanguageId] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [expiryDates, setExpiryDates] = useState<string[]>([]);
  const [activeApplication, setActiveApplication] =
    useState<Application | null>(initialApplication);
  const [answers, setAnswers] = useState<Record<string, string>>(
    (initialApplication?.answerState as Record<string, string>) || {},
  );
  const [timeLeft, setTimeLeft] = useState<number | null>(initialTimeLeft);
  const [message, setMessage] = useState("");
  const [submittedQuestionResults, setSubmittedQuestionResults] = useState<SubmittedQuestionResult[]>([]);
  const [submittedLanguageCode, setSubmittedLanguageCode] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [speakingActivityByQuestion, setSpeakingActivityByQuestion] = useState<
    Record<string, SpeakingActivity>
  >({});
  const [antiCheatAccepted, setAntiCheatAccepted] = useState(false);
  const [antiCheatConfirmed, setAntiCheatConfirmed] = useState(false);
  const [antiCheatNotice, setAntiCheatNotice] = useState<{
    severity: AntiCheatSeverity;
    message: string;
  } | null>(null);
  const [violationCount, setViolationCount] = useState(
    initialApplication?.violationCount ?? 0,
  );
  const [antiCheatFailed, setAntiCheatFailed] = useState(false);
  const [cameraStatus, setCameraStatus] = useState<TeacherCameraStatus>("idle");
  const [fullscreenActive, setFullscreenActive] = useState(false);
  const [antiCheatSetupError, setAntiCheatSetupError] = useState("");
  const [questionRevealInfo, setQuestionRevealInfo] = useState<Record<string, QuestionRevealInfo>>(
    () => initialQuestionRevealInfo(initialApplication),
  );
  const [questionRevealNoticeId, setQuestionRevealNoticeId] = useState<string | null>(null);
  const [revealingQuestionId, setRevealingQuestionId] = useState<string | null>(null);
  const [questionClock, setQuestionClock] = useState(() => initialNow.getTime());
  const securityLanguageCode =
    activeApplication?.language.code ||
    submittedLanguageCode ||
    languages.find((language) => language.id === languageId)?.code ||
    null;
  const securityLabels = getTeacherEntranceSecurityLabels(securityLanguageCode);
  const awaySinceRef = useRef<number | null>(null);
  const awayWasHiddenRef = useRef(false);
  const awayReportedRef = useRef(false);
  const awayIncidentIdRef = useRef("");
  const fullscreenRequiredRef = useRef(false);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const monitorTimerRef = useRef<number | null>(null);
  const antiCheatFailedRef = useRef(false);
  const proctoringActiveRef = useRef(false);
  const proctorSessionIdRef = useRef("");
  const proctorHeartbeatSequenceRef = useRef(0);
  const proctorHeartbeatInFlightRef = useRef(false);
  const answersRef = useRef(answers);
  const autosaveTimerRef = useRef<number | null>(null);
  const autosaveRequestRef = useRef<XMLHttpRequest | null>(null);
  const speakingActivityRef = useRef<Record<string, SpeakingActivity>>({});
  const submitTestRef = useRef<() => Promise<void>>(async () => {});
  const hasSpeakingBusy = useMemo(
    () => Object.values(speakingActivityByQuestion).some((activity) => activity !== "idle"),
    [speakingActivityByQuestion],
  );

  useEffect(() => {
    if (Object.keys(questionRevealInfo).length === 0) return;
    const timer = window.setInterval(() => setQuestionClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [questionRevealInfo]);

  useEffect(() => {
    if (timeLeft === null || !activeApplication || !antiCheatAccepted) return;
    if (timeLeft <= 0) {
      if (!hasSpeakingBusy) {
        void submitTestRef.current();
      }
      return;
    }
    const timer = window.setTimeout(() => setTimeLeft((value) => (value === null ? null : value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [timeLeft, activeApplication, hasSpeakingBusy, antiCheatAccepted]);

  useEffect(
    () => () => {
      if (autosaveTimerRef.current !== null) {
        window.clearTimeout(autosaveTimerRef.current);
      }
      autosaveRequestRef.current?.abort();
      if (monitorTimerRef.current !== null) {
        window.clearInterval(monitorTimerRef.current);
      }
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
      proctoringActiveRef.current = false;
      unlockExamKeyboard();
    },
    [],
  );

  const applyAntiCheatResult = useCallback((result: AntiCheatResponse) => {
    setViolationCount(result.violationCount);
    if (result.severity === "WARNING" || result.severity === "VIOLATION") {
      const prefix = result.counted
        ? securityLabels.violationPrefix(result.violationCount, result.maxViolations)
        : securityLabels.warningPrefix;
      const localizedMessage = securityLabels.eventMessages[result.eventType] ?? securityLabels.eventFallback;
      setAntiCheatNotice({ severity: result.severity, message: `${prefix}: ${localizedMessage}` });
    }
    if (result.failed) {
      antiCheatFailedRef.current = true;
      proctoringActiveRef.current = false;
      fullscreenRequiredRef.current = false;
      setAntiCheatFailed(true);
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
      unlockExamKeyboard();
      setAntiCheatNotice({ severity: "VIOLATION", message: securityLabels.failedNotice });
      if (result.attemptId) {
        window.setTimeout(() => window.location.assign(`/student/results/${result.attemptId}`), 1800);
      }
    }
  }, [securityLabels]);

  const recordAntiCheat = useCallback(async (
    eventType: string,
    detail?: string,
    durationSeconds = 0,
    confidence?: number,
    metadata?: Record<string, string | number | boolean>,
  ) => {
    if (!activeApplication || !proctoringActiveRef.current || antiCheatFailedRef.current) return;
    try {
      autosaveAnswers(activeApplication.id, answersRef.current);
      const result = await logAntiCheatEvent(activeApplication.id, eventType, detail, durationSeconds, confidence, metadata);
      applyAntiCheatResult(result);
    } catch (error) {
      console.error("Unable to record anti-cheat event", { eventType, error });
    }
  }, [activeApplication, applyAntiCheatResult]);

  const sendProctorHeartbeat = useCallback(async () => {
    if (
      !activeApplication ||
      !antiCheatAccepted ||
      !proctoringActiveRef.current ||
      antiCheatFailedRef.current ||
      !proctorSessionIdRef.current ||
      proctorHeartbeatInFlightRef.current
    ) return;

    proctorHeartbeatInFlightRef.current = true;
    proctorHeartbeatSequenceRef.current += 1;
    try {
      const response = await fetch(
        `/api/teacher-applications/${activeApplication.id}/heartbeat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          keepalive: true,
          body: JSON.stringify({
            sessionId: proctorSessionIdRef.current,
            sequence: proctorHeartbeatSequenceRef.current,
            visible: document.visibilityState === "visible",
            focused: document.hasFocus(),
            fullscreen: Boolean(document.fullscreenElement),
            cameraActive: Boolean(cameraStreamRef.current?.active),
            extendedDisplay: hasDetectedExtendedDisplay(),
            incidentId: awayIncidentIdRef.current || undefined,
            clientTimestamp: new Date().toISOString(),
          }),
        },
      );
      const data = (await response.json().catch(() => ({}))) as ProctorHeartbeatResponse;
      if (response.ok && data.violation) applyAntiCheatResult(data.violation);
    } catch {
      // The next successful heartbeat lets the server measure and classify the gap.
    } finally {
      proctorHeartbeatInFlightRef.current = false;
    }
  }, [activeApplication, antiCheatAccepted, applyAntiCheatResult]);

  useEffect(() => {
    if (!activeApplication || activeApplication.status !== "DRAFT" || !antiCheatAccepted) return;
    const record = recordAntiCheat;
    void sendProctorHeartbeat();
    const heartbeatTimer = window.setInterval(() => {
      void sendProctorHeartbeat();
    }, 3000);

    if (cameraStreamRef.current && videoRef.current) {
      videoRef.current.srcObject = cameraStreamRef.current;
      void videoRef.current.play().catch(() => undefined);
    }

    if (cameraStatus === "active" && videoRef.current) {
      const FaceDetectorApi = (window as typeof window & { FaceDetector?: FaceDetectorConstructor }).FaceDetector;
      if (FaceDetectorApi) {
        const detector = new FaceDetectorApi({ maxDetectedFaces: 3, fastMode: true });
        let noFaceSince: number | null = null;
        let multipleSince: number | null = null;
        let lookingAwaySince: number | null = null;
        let centeredSince: number | null = null;
        let noFaceReported = false;
        let multipleReported = false;
        let lookingAwayReported = false;
        let detecting = false;

        monitorTimerRef.current = window.setInterval(async () => {
          const video = videoRef.current;
          if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || detecting) return;
          detecting = true;
          try {
            const faces = await detector.detect(video);
            const now = Date.now();
            if (faces.length === 0) {
              noFaceSince ??= now;
              if (!noFaceReported && now - noFaceSince >= 10_000) {
                noFaceReported = true;
                void record("NO_FACE", "Không phát hiện khuôn mặt liên tục", Math.floor((now - noFaceSince) / 1000), 0.9);
              }
            } else {
              noFaceSince = null;
              noFaceReported = false;
            }

            if (faces.length > 1) {
              multipleSince ??= now;
              if (!multipleReported && now - multipleSince >= 5_000) {
                multipleReported = true;
                void record("MULTIPLE_FACES", "Phát hiện nhiều khuôn mặt liên tục", Math.floor((now - multipleSince) / 1000), 0.9);
              }
            } else {
              multipleSince = null;
              multipleReported = false;
            }

            const primary = faces[0];
            if (primary) {
              const centerX = primary.boundingBox.x + primary.boundingBox.width / 2;
              const centerY = primary.boundingBox.y + primary.boundingBox.height / 2;
              const outsideFocusArea =
                centerX < video.videoWidth * 0.22 ||
                centerX > video.videoWidth * 0.78 ||
                centerY < video.videoHeight * 0.15 ||
                centerY > video.videoHeight * 0.85;
              if (outsideFocusArea) {
                centeredSince = null;
                lookingAwaySince ??= now;
                if (!lookingAwayReported && now - lookingAwaySince >= 10_000) {
                  lookingAwayReported = true;
                  void record("LOOKING_AWAY", "Khuôn mặt lệch khỏi vùng màn hình hơn 10 giây", Math.floor((now - lookingAwaySince) / 1000), 0.7);
                }
              } else {
                centeredSince ??= now;
                if (now - centeredSince >= 3_000) {
                  lookingAwaySince = null;
                  lookingAwayReported = false;
                }
              }
            }
          } catch {
            // FaceDetector may be unavailable for an individual frame; do not fail the test.
          } finally {
            detecting = false;
          }
        }, 1000);
      }
    }

    const markAway = (hidden: boolean) => {
      if (!proctoringActiveRef.current) return;
      if (awaySinceRef.current === null) awaySinceRef.current = Date.now();
      awayWasHiddenRef.current ||= hidden;
      awayIncidentIdRef.current ||= crypto.randomUUID();
      if (!awayReportedRef.current) {
        awayReportedRef.current = true;
        void record(
          hidden ? "TAB_HIDDEN" : "WINDOW_BLUR",
          hidden ? "Tab bài kiểm tra bị ẩn" : "Cửa sổ bài kiểm tra mất focus",
          0,
          undefined,
          { incidentId: awayIncidentIdRef.current },
        );
      }
    };
    const markReturned = () => {
      if (!proctoringActiveRef.current) return;
      window.setTimeout(() => {
        if (!proctoringActiveRef.current) return;
        if (awaySinceRef.current === null || document.hidden || !document.hasFocus()) return;
        if (document.fullscreenElement) {
          awaySinceRef.current = null;
          awayWasHiddenRef.current = false;
          awayReportedRef.current = false;
          awayIncidentIdRef.current = "";
        }
        void sendProctorHeartbeat();
      }, 100);
    };
    const onVisibility = () => (document.hidden ? markAway(true) : markReturned());
    const onBlur = () => markAway(document.hidden);
    const onFocus = () => markReturned();
    const onFullscreen = () => {
      const isFullscreen = Boolean(document.fullscreenElement);
      setFullscreenActive(isFullscreen);
      if (fullscreenRequiredRef.current && !isFullscreen) {
        fullscreenRequiredRef.current = false;
        awayIncidentIdRef.current ||= crypto.randomUUID();
        unlockExamKeyboard();
        void record("FULLSCREEN_EXIT", "Thoát chế độ toàn màn hình", 0, undefined, {
          incidentId: awayIncidentIdRef.current,
        });
      }
    };
    const onCopy = (event: ClipboardEvent) => {
      if (!proctoringActiveRef.current) return;
      event.preventDefault();
      void record("COPY_ATTEMPT", "Sao chép nội dung bài kiểm tra");
    };
    const onCut = (event: ClipboardEvent) => {
      if (!proctoringActiveRef.current) return;
      event.preventDefault();
      void record("COPY_ATTEMPT", "Cắt nội dung trong bài kiểm tra");
    };
    const onPaste = (event: ClipboardEvent) => {
      if (!proctoringActiveRef.current) return;
      const length = event.clipboardData?.getData("text").length ?? 0;
      event.preventDefault();
      void record("PASTE_ATTEMPT", `Dán nội dung dài ${length} ký tự`);
    };
    const onContextMenu = (event: MouseEvent) => {
      if (!proctoringActiveRef.current) return;
      event.preventDefault();
      void record("CONTEXT_MENU", "Mở menu chuột phải");
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (!proctoringActiveRef.current) return;
      const key = event.key.toLowerCase();
      const devtools =
        event.key === "F12" ||
        ((event.ctrlKey || event.metaKey) && event.shiftKey && ["i", "j", "c"].includes(key)) ||
        ((event.ctrlKey || event.metaKey) && key === "u");
      const blockedNavigationShortcut =
        (event.ctrlKey || event.metaKey) && ["l", "n", "o", "p", "r", "s", "t", "w"].includes(key);
      const blockedExamShortcut =
        event.key === "Escape" ||
        event.key === "Tab" ||
        event.key === "Alt" ||
        event.altKey ||
        devtools ||
        blockedNavigationShortcut;

      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        awayIncidentIdRef.current = crypto.randomUUID();
        awayReportedRef.current = true;
        void record("FULLSCREEN_EXIT", "Nhấn phím Escape trong phiên thi", 0, undefined, {
          incidentId: awayIncidentIdRef.current,
        });
        return;
      }
      if (!blockedExamShortcut || !document.fullscreenElement) return;
      event.preventDefault();
      event.stopPropagation();
      if (devtools) void record("DEVTOOLS_SHORTCUT", "Tổ hợp phím công cụ phát triển");
    };
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!proctoringActiveRef.current) return;
      void record("PAGE_RELOAD_OR_CLOSE", "Tải lại hoặc đóng trang");
      event.preventDefault();
    };

    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("fullscreenchange", onFullscreen);
    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCut);
    document.addEventListener("paste", onPaste);
    document.addEventListener("contextmenu", onContextMenu);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    document.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("fullscreenchange", onFullscreen);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCut);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("contextmenu", onContextMenu);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("beforeunload", onBeforeUnload);
      if (monitorTimerRef.current !== null) {
        window.clearInterval(monitorTimerRef.current);
        monitorTimerRef.current = null;
      }
      window.clearInterval(heartbeatTimer);
    };
  }, [activeApplication, antiCheatAccepted, cameraStatus, recordAntiCheat, sendProctorHeartbeat]);

  const questions = useMemo(() => {
    const list = activeApplication?.entranceTest?.questions ?? [];
    if (!activeApplication?.entranceTest?.shuffleQuestions) return list;
    return [...list].sort(
      (left, right) =>
        stableQuestionRank(activeApplication.id, left.id) -
        stableQuestionRank(activeApplication.id, right.id),
    );
  }, [activeApplication]);

  const latestApplications = applications.slice(0, 5);
  const selectedLanguageCode =
    activeApplication?.language.code ||
    submittedLanguageCode ||
    languages.find((language) => language.id === languageId)?.code ||
    null;
  const ui = getLearningUiLabels(selectedLanguageCode);
  const speechLocale = getSpeechRecognitionLocale(activeApplication?.language.code);
  const testLocked = submitting || timeLeft === 0 || !antiCheatAccepted || !fullscreenActive || cameraStatus !== "active" || antiCheatFailed;
  const submittedAiQuestionResults = useMemo(
    () => submittedQuestionResults.filter((item) => item.aiEvaluation),
    [submittedQuestionResults],
  );

  function setAnswer(questionId: string, value: string) {
    const nextAnswers = { ...answersRef.current, [questionId]: value };
    answersRef.current = nextAnswers;
    setAnswers(nextAnswers);

    if (!activeApplication || activeApplication.status !== "DRAFT") return;
    if (autosaveTimerRef.current !== null) {
      window.clearTimeout(autosaveTimerRef.current);
    }
    autosaveRequestRef.current?.abort();
    autosaveTimerRef.current = window.setTimeout(() => {
      autosaveRequestRef.current = autosaveAnswers(
        activeApplication.id,
        nextAnswers,
      );
      autosaveTimerRef.current = null;
    }, 800);
  }

  async function revealQuestion(question: Question) {
    if (!activeApplication || testLocked || revealingQuestionId) return;
    setRevealingQuestionId(question.id);
    setMessage("");
    try {
      const response = await fetch(
        `/api/teacher-applications/${activeApplication.id}/questions/${question.id}/reveal`,
        { method: "POST", cache: "no-store" },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(securityLabels.revealFailed);
      setQuestionRevealInfo((current) => ({
        ...current,
        [question.id]: {
          revealedAt: data.revealedAt,
          preparationTimeSeconds: data.preparationTimeSeconds,
          answerTimeSeconds: data.answerTimeSeconds,
        },
      }));
      setQuestionClock(Date.now());
      setQuestionRevealNoticeId(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : securityLabels.revealFailed);
    } finally {
      setRevealingQuestionId(null);
    }
  }

  async function loadData() {
    setLoadError("");
    try {
      const response = await fetch("/api/teacher-applications", { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Không thể tải thông tin đăng ký giảng viên.");
      }

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setMinimumExpiryDate(tomorrow.toISOString().slice(0, 10));

      setEnabled(Boolean(data.setting?.enabled));
      setLanguages(data.languages || []);
      setApplications(data.applications || []);
      const draft = (data.applications || []).find((item: Application) => item.status === "DRAFT" && item.entranceTest);
      if (draft) {
        setActiveApplication(draft);
        setQuestionRevealInfo(initialQuestionRevealInfo(draft));
        const draftAnswers = (draft.answerState as Record<string, string>) || {};
        answersRef.current = draftAnswers;
        setAnswers(draftAnswers);
        if (draft.entranceTest?.timeLimit) {
          const elapsedSeconds = draft.startedAt
            ? Math.floor(
                (Date.now() - new Date(draft.startedAt).getTime()) / 1000,
              )
            : 0;
          setTimeLeft(
            Math.max(0, draft.entranceTest.timeLimit * 60 - elapsedSeconds),
          );
        } else {
          setTimeLeft(null);
        }
      } else {
        setActiveApplication(null);
        setQuestionRevealInfo({});
        setTimeLeft(null);
      }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Không thể tải thông tin đăng ký giảng viên.");
    } finally {
      setLoadingData(false);
    }
  }

  function onFilesSelected(fileList: FileList | null) {
    const nextFiles = Array.from(fileList || []).slice(0, 3);
    setFiles(nextFiles);
    setExpiryDates(nextFiles.map((_, index) => expiryDates[index] || ""));
  }

  async function requestCameraAccess() {
    if (!activeApplication || !antiCheatConfirmed) return;
    setAntiCheatNotice(null);
    setAntiCheatSetupError("");
    setViolationCount(activeApplication.violationCount ?? 0);
    setCameraStatus("requesting");

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("CAMERA_NOT_SUPPORTED");
      }
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 360 },
          frameRate: { ideal: 10, max: 15 },
        },
        audio: false,
      });
      cameraStreamRef.current = stream;
      stream.getVideoTracks().forEach((track) => {
        track.addEventListener("ended", () => {
          setCameraStatus("unavailable");
          if (fullscreenRequiredRef.current) {
            void recordAntiCheat("CAMERA_DISABLED", "Camera bị tắt trong bài kiểm tra");
          }
        }, { once: true });
      });
      setCameraStatus("active");
    } catch {
      setCameraStatus("unavailable");
      setAntiCheatSetupError(
        securityLabels.cameraPermissionError,
      );
    }
  }

  async function enterFullscreenAndStart() {
    if (!activeApplication || cameraStatus !== "active" || !cameraStreamRef.current?.active) return;
    setAntiCheatSetupError("");

    if (hasDetectedExtendedDisplay()) {
      setAntiCheatSetupError(
        securityLabels.multipleDisplaysError,
      );
      return;
    }

    try {
      await document.documentElement.requestFullscreen({
        navigationUI: "hide",
        keyboardLock: "browser",
      } as ExamFullscreenOptions);
      await lockExamKeyboard();
      fullscreenRequiredRef.current = true;
      setFullscreenActive(true);
      awayIncidentIdRef.current = "";
      awayReportedRef.current = false;
      proctorSessionIdRef.current = crypto.randomUUID();
      proctorHeartbeatSequenceRef.current = 0;
      await logAntiCheatEvent(
        activeApplication.id,
        "CONSENT_ACCEPTED",
        "Người dùng đã cấp camera, vào toàn màn hình và xác nhận quy định chống gian lận",
      );
      proctoringActiveRef.current = true;
      setAntiCheatAccepted(true);
    } catch {
      fullscreenRequiredRef.current = false;
      setFullscreenActive(false);
      if (document.fullscreenElement) {
        await document.exitFullscreen().catch(() => undefined);
      }
      setAntiCheatSetupError(
        securityLabels.startError,
      );
    }
  }

  async function reenterFullscreen() {
    setAntiCheatSetupError("");
    try {
      await document.documentElement.requestFullscreen({
        navigationUI: "hide",
        keyboardLock: "browser",
      } as ExamFullscreenOptions);
      await lockExamKeyboard();
      fullscreenRequiredRef.current = true;
      setFullscreenActive(true);
      awayIncidentIdRef.current = "";
      awayReportedRef.current = false;
      awaySinceRef.current = null;
    } catch {
      setAntiCheatSetupError(
        securityLabels.reenterError,
      );
    }
  }

  async function submitCertificates(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    setSubmitting(true);
    setSubmittedQuestionResults([]);
    const formData = new FormData();
    formData.set("languageId", languageId);
    formData.set("expiryDates", JSON.stringify(expiryDates));
    files.forEach((file) => formData.append("certificates", file));

    const response = await fetch("/api/teacher-applications", {
      method: "POST",
      body: formData,
    });
    const data = await response.json().catch(() => ({}));
    setSubmitting(false);

    if (!response.ok) {
      setMessage(data?.error || "Không thể nộp hồ sơ.");
      return;
    }

    setActiveApplication(data.application);
    setQuestionRevealInfo(initialQuestionRevealInfo(data.application));
    setAntiCheatAccepted(false);
    setAntiCheatConfirmed(false);
    setViolationCount(data.application.violationCount ?? 0);
    setTimeLeft(
      data.application.entranceTest?.timeLimit
        ? data.application.entranceTest.timeLimit * 60
        : null,
    );
    answersRef.current = {};
    setAnswers({});
    setFiles([]);
    setExpiryDates([]);
    setMessage(data.application.entranceTest ? "Đã lưu chứng chỉ. Bắt đầu bài test." : "Đã nộp hồ sơ, chờ admin review.");
    await loadData();
  }

  async function submitTest() {
    if (!activeApplication || submitting) return;
    if (Object.values(speakingActivityRef.current).some((activity) => activity !== "idle")) {
      setMessage(
        ui.teacherEntrance.stopRecordingMessage,
      );
      return;
    }
    setSubmitting(true);
    const response = await fetch(`/api/teacher-applications/${activeApplication.id}/submit-test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers }),
    });
    const data = await response.json().catch(() => ({}));
    setSubmitting(false);
    if (!response.ok) {
      setMessage(data?.error || ui.teacherEntrance.submitFailed);
      return;
    }
    setSubmittedLanguageCode(activeApplication.language.code);
    setMessage(ui.teacherEntrance.submitSuccess);
    setSubmittedQuestionResults(data.questionResults || []);
    proctoringActiveRef.current = false;
    fullscreenRequiredRef.current = false;
    setAntiCheatAccepted(false);
    setAntiCheatConfirmed(false);
    setFullscreenActive(false);
    unlockExamKeyboard();
    const exitFullscreenPromise = document.fullscreenElement
      ? document.exitFullscreen().catch(() => undefined)
      : Promise.resolve();
    if (autosaveTimerRef.current !== null) {
      window.clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    autosaveRequestRef.current?.abort();
    autosaveRequestRef.current = null;
    if (monitorTimerRef.current !== null) {
      window.clearInterval(monitorTimerRef.current);
      monitorTimerRef.current = null;
    }
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    proctorSessionIdRef.current = "";
    proctorHeartbeatSequenceRef.current = 0;
    awaySinceRef.current = null;
    awayWasHiddenRef.current = false;
    awayReportedRef.current = false;
    awayIncidentIdRef.current = "";
    setCameraStatus("idle");
    setActiveApplication(null);
    setQuestionRevealInfo({});
    setTimeLeft(null);
    await exitFullscreenPromise;
    await loadData();
  }

  useEffect(() => {
    submitTestRef.current = submitTest;
  });

  function setSpeakingActivity(questionId: string, activity: SpeakingActivity) {
    if (speakingActivityRef.current[questionId] === activity) return;

    speakingActivityRef.current = {
      ...speakingActivityRef.current,
      [questionId]: activity,
    };
    setSpeakingActivityByQuestion(speakingActivityRef.current);
  }

  return {
    loadingData,
    loadError,
    minimumExpiryDate,
    enabled,
    languages,
    languageId,
    files,
    expiryDates,
    activeApplication,
    answers,
    timeLeft,
    message,
    submitting,
    speakingActivityByQuestion,
    questions,
    latestApplications,
    ui,
    securityLabels,
    speechLocale,
    testLocked,
    questionRevealInfo,
    questionRevealNoticeId,
    revealingQuestionId,
    questionClock,
    submittedAiQuestionResults,
    setLanguageId,
    setExpiryDates,
    setAnswer,
    revealQuestion,
    setQuestionRevealNoticeId,
    onFilesSelected,
    submitCertificates,
    submitTest,
    requestCameraAccess,
    enterFullscreenAndStart,
    reenterFullscreen,
    setSpeakingActivity,
    setLoadingData,
    setAntiCheatConfirmed,
    loadData,
    antiCheatAccepted,
    antiCheatConfirmed,
    antiCheatNotice,
    violationCount,
    antiCheatFailed,
    cameraStatus,
    fullscreenActive,
    antiCheatSetupError,
    videoRef,
  };
}

function SubmittedAiFeedback({
  results,
  ui,
}: {
  results: SubmittedQuestionResult[];
  ui: ReturnType<typeof getLearningUiLabels>;
}) {
  if (results.length === 0) return null;
  return (
    <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="text-xl font-bold text-slate-950">{ui.teacherEntrance.aiFeedbackAfterScore}</h2>
      <div className="mt-4 space-y-4">
        {results.map((item) => {
          const evaluation = item.aiEvaluation!;
          return (
            <article key={item.questionId} className="rounded-lg border border-slate-200 p-4">
              <p className="font-semibold text-slate-900">{item.content}</p>
              <p className="mt-2 text-sm font-semibold text-blue-700">
                {item.earnedScore}/{item.score} {ui.test.points} - AI {evaluation.overallScore}/10 - {ui.teacherEntrance.relevance} {Math.round(evaluation.taskRelevance ?? 0)}/100
              </p>
              {evaluation.onTopic === false ? (
                <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">
                  {ui.teacherEntrance.offTopic}: {evaluation.offTopicReason || ui.teacherEntrance.offTopicFallback}
                </p>
              ) : null}
              <p className="mt-3 text-sm leading-6 text-slate-700">{evaluation.detailedComment || evaluation.summary}</p>
              {evaluation.weaknesses.length ? <p className="mt-2 text-sm text-slate-700">{ui.teacherEntrance.needsImprovement}: {evaluation.weaknesses.join("; ")}</p> : null}
              {evaluation.suggestions.length ? <p className="mt-2 text-sm text-slate-700">{ui.teacherEntrance.suggestions}: {evaluation.suggestions.join("; ")}</p> : null}
              {evaluation.sampleAnswer ? (
                <div className="mt-4 rounded-lg bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">{ui.teacherEntrance.sampleAnswer}</p>
                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">{evaluation.sampleAnswer}</p>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ApplicationHistory({
  applications,
  ui,
}: {
  applications: Application[];
  ui: ReturnType<typeof getLearningUiLabels>;
}) {
  return (
    <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="text-xl font-bold text-slate-950">{ui.teacherEntrance.history}</h2>
      <div className="mt-4 space-y-3">
        {applications.length === 0 ? <p className="text-sm text-slate-500">{ui.teacherEntrance.noApplications}</p> : null}
        {applications.map((application) => (
          <div key={application.id} className="rounded-lg border border-slate-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-slate-900">{ui.teacherEntrance.applicationAttempt(application.attemptNo)} - {application.language.name}</p>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{applicationStatusLabels[application.status] || application.status}</span>
            </div>
            <p className="mt-1 text-sm text-slate-500">{new Date(application.createdAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function TeacherRegistrationClient({
  initialData,
}: {
  initialData: TeacherRegistrationData;
}) {
  const {
    loadingData,
    loadError,
    minimumExpiryDate,
    enabled,
    languages,
    languageId,
    files,
    expiryDates,
    activeApplication,
    answers,
    timeLeft,
    message,
    submitting,
    speakingActivityByQuestion,
    questions,
    latestApplications,
    ui,
    securityLabels,
    speechLocale,
    testLocked,
    questionRevealInfo,
    questionRevealNoticeId,
    revealingQuestionId,
    questionClock,
    submittedAiQuestionResults,
    setLanguageId,
    setExpiryDates,
    setAnswer,
    revealQuestion,
    setQuestionRevealNoticeId,
    onFilesSelected,
    submitCertificates,
    submitTest,
    requestCameraAccess,
    enterFullscreenAndStart,
    reenterFullscreen,
    setSpeakingActivity,
    setLoadingData,
    setAntiCheatConfirmed,
    loadData,
    antiCheatAccepted,
    antiCheatConfirmed,
    antiCheatNotice,
    violationCount,
    antiCheatFailed,
    cameraStatus,
    fullscreenActive,
    antiCheatSetupError,
    videoRef,
  } = useTeacherRegistrationPage(initialData);

  if (loadingData) {
    return <TeacherRegistrationPageState type="loading" />;
  }

  if (loadError) {
    return (
      <TeacherRegistrationPageState
        type="error"
        loadError={loadError}
        onRetry={() => {
          setLoadingData(true);
          void loadData();
        }}
      />
    );
  }

  if (!enabled) {
    return <TeacherRegistrationPageState type="disabled" />;
  }
  return (
    <main className="min-h-screen bg-slate-50 py-8">
      <TeacherAntiCheatOverlays
        showRules={Boolean(activeApplication?.entranceTest && !antiCheatAccepted)}
        antiCheatConfirmed={antiCheatConfirmed}
        onConfirmedChange={setAntiCheatConfirmed}
        cameraStatus={cameraStatus}
        setupError={antiCheatSetupError}
        onRequestCamera={() => void requestCameraAccess()}
        onStartFullscreen={() => void enterFullscreenAndStart()}
        showFullscreenRecovery={antiCheatAccepted && !fullscreenActive && !antiCheatFailed}
        onReenterFullscreen={() => void reenterFullscreen()}
        antiCheatFailed={antiCheatFailed}
        antiCheatNotice={antiCheatNotice}
        labels={securityLabels}
      />
      <div className="mx-auto max-w-6xl px-4">
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-950">Đăng ký giảng viên</h1>
              <p className="mt-2 text-slate-600">Chọn ngôn ngữ, upload chứng chỉ và hoàn thành bài test đầu vào.</p>
            </div>
            {timeLeft !== null ? (
              <div className={`rounded-lg px-4 py-2 text-lg font-bold ${timeLeft < 300 ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
                {formatCountdown(timeLeft)}
              </div>
            ) : null}
          </div>
        </section>

        {message ? <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">{message}</div> : null}

        <SubmittedAiFeedback results={submittedAiQuestionResults} ui={ui} />

        {activeApplication?.entranceTest ? (
          <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-950">{getEntranceTestDisplayName(activeApplication.entranceTest, ui)}</h2>
                <p className="mt-2 text-sm font-semibold text-red-700">{securityLabels.violationCounter(violationCount, 3)}</p>
                <p className="mt-1 text-xs text-slate-500">Camera: {securityLabels.cameraState[cameraStatus]}</p>
              </div>
              {cameraStatus === "active" ? (
                <video ref={videoRef} muted playsInline aria-label="Hình ảnh camera giám sát cục bộ" className="aspect-video w-40 rounded-lg border border-slate-200 bg-slate-950 object-cover" />
              ) : null}
            </div>
            <div className="mt-5 space-y-5">
              {questions.map((question, index) => {
                const timedQuestion = question.type === "ESSAY" || question.type === "SPEAKING";
                const revealInfo = questionRevealInfo[question.id];
                const timer = questionTimer(revealInfo, questionClock);
                const questionLocked = testLocked || timer.preparationRemaining > 0 || timer.expired;
                const revealNotice = question.type === "SPEAKING"
                  ? securityLabels.speakingRevealNotice(
                      question.preparationTimeSeconds ?? 60,
                      question.answerTimeSeconds ?? 120,
                    )
                  : securityLabels.writingRevealNotice(question.answerTimeSeconds ?? 3600);
                return (
                <article key={question.id} className={`rounded-lg border border-slate-200 p-4 ${!fullscreenActive ? "select-none blur-xl" : ""}`}>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <span className="font-semibold text-slate-900">{ui.teacherEntrance.question(index + 1)}</span>
                    <span>{question.score} {ui.test.points}</span>
                  </div>
                  {timedQuestion && !revealInfo ? (
                    <div className="mt-4 rounded-xl border border-dashed border-blue-300 bg-blue-50 p-5 text-center">
                      {questionRevealNoticeId === question.id ? (
                        <>
                          <p className="text-sm font-semibold leading-6 text-blue-900">{revealNotice}</p>
                          <button type="button" disabled={testLocked || revealingQuestionId === question.id} onClick={() => void revealQuestion(question)} className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
                            {securityLabels.startQuestion}
                          </button>
                        </>
                      ) : (
                        <button type="button" disabled={testLocked} onClick={() => setQuestionRevealNoticeId(question.id)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
                          {securityLabels.getQuestion}
                        </button>
                      )}
                    </div>
                  ) : (
                  <>
                    {revealInfo ? (
                      <p className={`mt-3 rounded-lg px-3 py-2 text-sm font-bold ${timer.expired ? "bg-slate-100 text-slate-600" : timer.preparationRemaining > 0 ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"}`} role="timer">
                        {timer.expired
                          ? securityLabels.questionExpired
                          : timer.preparationRemaining > 0
                            ? securityLabels.preparationRemaining(timer.preparationRemaining)
                            : securityLabels.answerRemaining(timer.answerRemaining)}
                      </p>
                    ) : null}
                    {question.audioUrl ? <audio controls={!questionLocked} className="mt-3 w-full max-w-md" src={question.audioUrl} /> : null}
                    <p className="mt-3 font-medium text-slate-900">{question.content}</p>
                    <FormattedHint hint={question.hint} />
                    <div className="mt-3 space-y-2">
                    {(question.type === "MULTIPLE_CHOICE" || question.type === "TRUE_FALSE") && question.answers
                      ? question.answers.map((answer) => (
                          <label key={answer.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
                            <input
                              type="radio"
                              name={question.id}
                              checked={answers[question.id] === answer.id}
                              disabled={questionLocked}
                              onChange={() => setAnswer(question.id, answer.id)}
                            />
                            <span>{answer.content}</span>
                          </label>
                        ))
                      : null}
                    {question.type === "FILL_IN_BLANK" ? (
                      <input
                        aria-label={ui.test.fillPlaceholder}
                        value={answers[question.id] || ""}
                        disabled={questionLocked}
                        onChange={(event) => setAnswer(question.id, event.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2"
                      />
                    ) : null}
                    {question.type === "ESSAY" ? (
                      <textarea
                        aria-label={ui.test.essayPlaceholder}
                        rows={6}
                        value={answers[question.id] || ""}
                        disabled={questionLocked}
                        onChange={(event) => setAnswer(question.id, event.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2"
                      />
                    ) : null}
                    {question.type === "SPEAKING" ? (
                      <SpeakingAnswerInput
                        value={answers[question.id] || ""}
                        onChange={(value) => setAnswer(question.id, value)}
                        languageLocale={speechLocale}
                        languageCode={activeApplication.language.code}
                        disabled={questionLocked}
                        forceStop={timeLeft === 0 || timer.expired}
                        activity={speakingActivityByQuestion[question.id] ?? "idle"}
                        setActivity={(activity) =>
                          setSpeakingActivity(question.id, activity)
                        }
                      />
                    ) : null}
                    </div>
                  </>
                  )}
                </article>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => void submitTest()}
              disabled={testLocked}
              className="mt-6 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? ui.teacherEntrance.submitting : ui.teacherEntrance.submitTest}
            </button>
          </section>
        ) : (
          <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-bold text-slate-950">Hồ sơ mới</h2>
            <form onSubmit={submitCertificates} className="mt-5 grid gap-4">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Ngôn ngữ đăng ký giảng dạy</span>
                <select value={languageId} onChange={(event) => setLanguageId(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2">
                  <option value="">Chọn ngôn ngữ</option>
                  {languages.map((language) => (
                    <option key={language.id} value={language.id}>
                      {language.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Tải lên chứng chỉ JPG, PNG hoặc PDF</span>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  multiple
                  onChange={(event) => onFilesSelected(event.target.files)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
              {files.map((file, index) => (
                <div key={`${file.name}-${file.lastModified}-${file.size}`} className="grid gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-[1fr_180px]">
                  <div>
                    <p className="font-medium text-slate-900">{file.name}</p>
                    <p className="text-sm text-slate-500">{Math.round(file.size / 1024)} KB</p>
                  </div>
                  <label className="text-sm font-medium text-slate-700">
                    Ngày hết hạn
                    <input
                      aria-label={`Ngày hết hạn của ${file.name}`}
                      type="date"
                      min={minimumExpiryDate || undefined}
                      value={expiryDates[index] || ""}
                      onChange={(event) => setExpiryDates((prev) => prev.map((value, itemIndex) => (itemIndex === index ? event.target.value : value)))}
                      className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </label>
                </div>
              ))}
              <button type="submit" disabled={submitting} className="w-fit rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                {submitting ? ui.result.saving : ui.submit}
              </button>
            </form>
          </section>
        )}

        <ApplicationHistory applications={latestApplications} ui={ui} />
      </div>
    </main>
  );
}
