"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getCourseLearningLabels, type CourseLearningLabels } from "@/lib/language-display";
import { readJsonResponse } from "@/lib/http-response";
import {
  calculateCourseLearningGateState,
  getNextCourseLearningAction,
  type CourseLearningAction,
  type ModuleGateState,
} from "@/lib/course-learning-gate-rules";

type Lesson = {
  id: string;
  title: string;
  content: string;
  videoUrl: string | null;
};

type Module = {
  id: string;
  name: string;
  order: number;
  isUnlocked: boolean;
  lessons: Lesson[];
  tests: Array<{ id: string; name: string }>;
};

type Props = {
  modules: Module[];
  courseTests: Array<{ id: string; name: string }>;
  completedIds: string[];
  passedTestIds: string[];
  courseId: string;
  language?: string | null;
  initialLessonId?: string | null;
  bypassGates?: boolean;
};

const MIN_READING_SECONDS = 3 * 60;

function applySubtitleMode(video: HTMLVideoElement) {
  const tracks = video.textTracks;
  for (let i = 0; i < tracks.length; i += 1) {
    tracks[i].mode = "showing";
  }
}

function CourseModuleSidebar({
  modules,
  moduleStateById,
  bypassGates,
  selectedLessonId,
  completed,
  passedTestIds,
  labels,
  progress,
  onSelectLesson,
}: {
  modules: Module[];
  moduleStateById: ReadonlyMap<string, ModuleGateState>;
  bypassGates: boolean;
  selectedLessonId: string;
  completed: Record<string, boolean>;
  passedTestIds: ReadonlySet<string>;
  labels: CourseLearningLabels;
  progress: number;
  onSelectLesson: (lessonId: string) => void;
}) {
  return (
    <aside className="lg:col-span-3 flex h-full min-h-0 flex-col rounded-xl border border-slate-200 bg-white text-slate-900">
      <div className="border-b border-slate-200 px-4 py-3">
        <p className="text-xs uppercase tracking-wide text-slate-500">{labels.tableOfContents}</p>
        <p className="mt-1 text-sm text-slate-600">{labels.progress(progress)}</p>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {modules.map((courseModule, moduleIndex) => {
          const moduleState = moduleStateById.get(courseModule.id);
          const moduleUnlocked = bypassGates || Boolean(moduleState?.isUnlocked);
          const testsUnlocked = bypassGates || Boolean(moduleState?.isUnlocked && moduleState.lessonsComplete);

          return (
            <div key={courseModule.id} className={`rounded-lg border ${moduleUnlocked ? "border-slate-200 bg-slate-50" : "border-slate-200 bg-slate-100 opacity-75"}`}>
              <p className="flex items-center justify-between gap-2 px-3 py-2 text-sm font-semibold text-slate-950">
                <span>{labels.module(moduleIndex + 1)}: {courseModule.name}</span>
                {!moduleUnlocked ? <span className="text-xs text-slate-500">{labels.locked}</span> : null}
              </p>
              <div className="space-y-1 px-2 pb-2">
                {courseModule.lessons.map((lesson, lessonIndex) => {
                  const active = lesson.id === selectedLessonId;
                  const done = completed[lesson.id] === true;

                  return (
                    <button
                      key={lesson.id}
                      type="button"
                      disabled={!moduleUnlocked}
                      onClick={() => onSelectLesson(lesson.id)}
                      className={`w-full rounded-md px-3 py-2 text-left text-sm transition ${
                        active
                          ? "bg-blue-600 text-white"
                          : moduleUnlocked
                            ? "bg-white text-slate-700 hover:bg-blue-50"
                            : "cursor-not-allowed bg-slate-200 text-slate-500"
                      }`}
                    >
                      <span className="line-clamp-1">{moduleIndex + 1}.{lessonIndex + 1} {lesson.title}</span>
                      <span className={`mt-1 block text-xs ${active ? "text-blue-100" : done ? "text-emerald-600" : "text-slate-500"}`}>
                        {done ? labels.completed : labels.notCompleted}
                      </span>
                    </button>
                  );
                })}
                {courseModule.tests.map((test) => {
                  const passed = passedTestIds.has(test.id);
                  return testsUnlocked ? (
                    <Link
                      key={test.id}
                      href={`/student/tests/${test.id}`}
                      className="block rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                    >
                      {labels.takeTest}: {test.name}
                      <span className={`mt-1 block text-xs ${passed ? "text-emerald-600" : "text-blue-500"}`}>
                        {passed ? labels.completed : labels.notCompleted}
                      </span>
                    </Link>
                  ) : (
                    <div key={test.id} className="rounded-md bg-slate-200 px-3 py-2 text-sm text-slate-500">
                      {labels.locked}: {test.name}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

function LessonPlayer({
  lesson,
  completed,
  loading,
  readingStarted,
  readingRemain,
  error,
  nextAction,
  progress,
  labels,
  onStartVideo,
  onVideoTimeUpdate,
  onPreventSeek,
  onVideoHeartbeat,
  onMarkDone,
}: {
  lesson: Lesson;
  completed: boolean;
  loading: boolean;
  readingStarted: boolean;
  readingRemain: number;
  error: string;
  nextAction: CourseLearningAction;
  progress: number;
  labels: CourseLearningLabels;
  onStartVideo: (lessonId: string) => Promise<void>;
  onVideoTimeUpdate: (lessonId: string, currentTime: number, duration: number) => void;
  onPreventSeek: (lessonId: string, currentTime: number, seekTo: (value: number) => void) => void;
  onVideoHeartbeat: (lessonId: string, position: number, duration: number, force?: boolean) => Promise<void>;
  onMarkDone: (lesson: Lesson) => Promise<void>;
}) {
  return (
    <section className="lg:col-span-7 flex h-full min-h-0 flex-col rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-lg font-semibold text-slate-900">{lesson.title}</h3>
        <p className={`text-sm font-medium ${completed ? "text-emerald-600" : "text-slate-500"}`}>
          {completed ? labels.completedLesson : loading ? labels.saving : labels.notCompleted}
        </p>
      </div>

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
        {lesson.videoUrl ? (
          <div>
            <video
              key={lesson.id}
              controls
              preload="metadata"
              className="aspect-video w-full rounded-lg border border-slate-200 bg-black"
              onLoadedMetadata={(event) => {
                applySubtitleMode(event.currentTarget);
                void onStartVideo(lesson.id);
              }}
              onPlay={() => void onStartVideo(lesson.id)}
              onTimeUpdate={(event) =>
                onVideoTimeUpdate(
                  lesson.id,
                  event.currentTarget.currentTime,
                  event.currentTarget.duration,
                )
              }
              onSeeking={(event) =>
                onPreventSeek(lesson.id, event.currentTarget.currentTime, (value) => {
                  event.currentTarget.currentTime = value;
                })
              }
              onSeeked={(event) =>
                onPreventSeek(lesson.id, event.currentTarget.currentTime, (value) => {
                  event.currentTarget.currentTime = value;
                })
              }
              onEnded={async (event) => {
                await onVideoHeartbeat(
                  lesson.id,
                  event.currentTarget.duration,
                  event.currentTarget.duration,
                  true,
                );
                await onMarkDone(lesson);
              }}
            >
              <source key={lesson.videoUrl} src={lesson.videoUrl} />
            </video>
            <p className="mt-2 text-xs text-slate-600">{labels.videoRequirement}</p>
          </div>
        ) : !completed ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-sm text-amber-900">{labels.readingRequirement}</p>
            {!readingStarted ? (
              <p className="mt-2 text-sm font-medium text-amber-800">{labels.startingTimer}</p>
            ) : (
              <p className="mt-2 text-sm font-medium text-amber-800">
                {labels.remaining(`${Math.floor(readingRemain / 60)}:${String(readingRemain % 60).padStart(2, "0")}`)}
              </p>
            )}
          </div>
        ) : null}

        <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-700">{lesson.content}</p>
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      </div>

      {nextAction.type === "TEST" ? (
        <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-blue-700">{labels.moduleTestRequired}</p>
          <Link
            href={`/student/tests/${nextAction.testId}`}
            className="inline-flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 sm:w-auto"
          >
            {labels.takeTest}
          </Link>
        </div>
      ) : nextAction.type === "COMPLETE" && progress === 100 ? (
        <p className="mt-4 border-t border-slate-200 pt-4 text-sm font-medium text-emerald-700">
          {labels.courseComplete}
        </p>
      ) : null}
    </section>
  );
}

export default function LearningContent({
  modules,
  courseTests,
  completedIds,
  passedTestIds,
  courseId,
  language,
  initialLessonId,
  bypassGates = false,
}: Props) {
  const router = useRouter();
  const labels = getCourseLearningLabels(language);
  const lessons = useMemo(
    () => modules.flatMap((module) => module.lessons.map((lesson) => ({ ...lesson, moduleId: module.id }))),
    [modules],
  );
  const initialCompleted = useMemo(() => new Set(completedIds), [completedIds]);
  const firstLesson = useMemo(() => {
    const accessibleModules = modules.filter((module) => bypassGates || module.isUnlocked);
    const requestedLesson = accessibleModules
      .flatMap((module) => module.lessons)
      .find((lesson) => lesson.id === initialLessonId);
    if (requestedLesson) return requestedLesson;

    return accessibleModules
      .flatMap((module) => module.lessons)
      .find((lesson) => !initialCompleted.has(lesson.id))
      ?? accessibleModules[0]?.lessons[0]
      ?? null;
  }, [bypassGates, initialCompleted, initialLessonId, modules]);

  const [selectedLessonId, setSelectedLessonId] = useState<string>(firstLesson?.id ?? "");
  const [completed, setCompleted] = useState<Record<string, boolean>>(
    () => Object.fromEntries(completedIds.map((id) => [id, true])),
  );
  const [loadingLesson, setLoadingLesson] = useState<string>("");
  const [readingStarts, setReadingStarts] = useState<Record<string, number>>({});
  const [readingNow, setReadingNow] = useState<Record<string, number>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const maxPlayedRef = useRef<Record<string, number>>({});
  const startedReadingRef = useRef<Record<string, boolean>>({});
  const lastHeartbeatRef = useRef<Record<string, number>>({});
  const startedVideoRef = useRef<Record<string, boolean>>({});

  const gateState = useMemo(
    () => calculateCourseLearningGateState({
      modules: modules.map((module) => ({
        id: module.id,
        order: module.order,
        lessons: module.lessons.map((lesson) => ({ id: lesson.id })),
        tests: module.tests.map((test) => ({ id: test.id })),
      })),
      courseTestIds: courseTests.map((test) => test.id),
      completedLessonIds: Object.keys(completed).filter((lessonId) => completed[lessonId]),
      passedTestIds,
    }),
    [completed, courseTests, modules, passedTestIds],
  );
  const moduleStateById = useMemo(
    () => new Map(gateState.modules.map((module) => [module.id, module])),
    [gateState.modules],
  );
  const passedTestIdSet = useMemo(() => new Set(passedTestIds), [passedTestIds]);
  const unlockedModuleIds = useMemo(
    () => {
      const moduleIds = new Set<string>();
      for (const courseModule of modules) {
        if (bypassGates || moduleStateById.get(courseModule.id)?.isUnlocked) {
          moduleIds.add(courseModule.id);
        }
      }
      return moduleIds;
    },
    [bypassGates, moduleStateById, modules],
  );

  const selectedLesson = lessons.find(
    (item) => item.id === selectedLessonId && unlockedModuleIds.has(item.moduleId),
  ) ?? firstLesson;

  const progress = useMemo(() => {
    if (!lessons.length) return 0;
    const done = lessons.filter((lesson) => completed[lesson.id]).length;
    return Math.round((done / lessons.length) * 100);
  }, [completed, lessons]);

  const nextAction = getNextCourseLearningAction(gateState);

  const startReading = useCallback(async (lessonId: string) => {
    setErrors((prev) => ({ ...prev, [lessonId]: "" }));

    const response = await fetch(`/api/learning/lessons/${lessonId}/start`, { method: "POST" });
    const data = await readJsonResponse(response);

    if (!response.ok) {
      setErrors((prev) => ({ ...prev, [lessonId]: data.error ?? "Không thể bắt đầu học." }));
      return;
    }

    const startedAt = new Date(data.startedAt).getTime();
    setReadingStarts((prev) => ({ ...prev, [lessonId]: startedAt }));
    setReadingNow((prev) => ({ ...prev, [lessonId]: Date.now() }));

    const interval = window.setInterval(() => {
      setReadingNow((prev) => ({ ...prev, [lessonId]: Date.now() }));
    }, 1000);

    window.setTimeout(() => window.clearInterval(interval), MIN_READING_SECONDS * 1000 + 5000);
  }, []);

  const startVideo = useCallback(async (lessonId: string) => {
    if (startedVideoRef.current[lessonId]) return;
    startedVideoRef.current[lessonId] = true;
    const response = await fetch(`/api/learning/lessons/${lessonId}/start`, { method: "POST" });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      startedVideoRef.current[lessonId] = false;
      setErrors((prev) => ({ ...prev, [lessonId]: data.error ?? "Không thể bắt đầu video." }));
    }
  }, []);

  const sendVideoHeartbeat = useCallback(async (
    lessonId: string,
    positionSeconds: number,
    durationSeconds: number,
    force = false,
  ) => {
    const now = Date.now();
    if (!force && now - (lastHeartbeatRef.current[lessonId] ?? 0) < 4_000) return;
    lastHeartbeatRef.current[lessonId] = now;
    await fetch(`/api/learning/lessons/${lessonId}/heartbeat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ positionSeconds, durationSeconds }),
    });
  }, []);

  const markDone = useCallback(async (lesson: Lesson) => {
    if (completed[lesson.id] || loadingLesson === lesson.id) return;

    setLoadingLesson(lesson.id);
    setErrors((prev) => ({ ...prev, [lesson.id]: "" }));

    try {
      const response = await fetch(`/api/learning/lessons/${lesson.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = await readJsonResponse(response);
      if (!response.ok) {
        setErrors((prev) => ({ ...prev, [lesson.id]: data.error ?? "Không thể đánh dấu hoàn thành." }));
        return;
      }

      setCompleted((prev) => ({ ...prev, [lesson.id]: true }));
      if (data.nextAction?.type === "TEST" && data.nextAction.testId) {
        router.push(`/student/tests/${data.nextAction.testId}`);
      } else if (data.nextAction?.type === "LESSON" && data.nextAction.lessonId) {
        router.push(`/student/hoc-bai?courseId=${courseId}&lessonId=${data.nextAction.lessonId}`);
      }
    } finally {
      setLoadingLesson("");
    }
  }, [completed, courseId, loadingLesson, router]);

  function remainingReadingSeconds(lessonId: string) {
    const startedAt = readingStarts[lessonId];
    if (!startedAt) return MIN_READING_SECONDS;

    const now = readingNow[lessonId];
    if (!now) return MIN_READING_SECONDS;

    const elapsed = Math.floor((now - startedAt) / 1000);
    return Math.max(0, MIN_READING_SECONDS - elapsed);
  }

  function onVideoTimeUpdate(lessonId: string, currentTime: number, duration: number) {
    void sendVideoHeartbeat(lessonId, currentTime, duration);
    if (completed[lessonId]) {
      maxPlayedRef.current[lessonId] = Math.max(maxPlayedRef.current[lessonId] ?? 0, currentTime);
      return;
    }

    const maxPlayed = maxPlayedRef.current[lessonId] ?? 0;
    if (currentTime > maxPlayed + 1) {
      return;
    }
    maxPlayedRef.current[lessonId] = Math.max(maxPlayed, currentTime);
  }

  function preventSeek(lessonId: string, currentTime: number, seekTo: (value: number) => void) {
    if (completed[lessonId]) return;

    const maxPlayed = maxPlayedRef.current[lessonId] ?? 0;
    if (currentTime > maxPlayed + 0.5) {
      seekTo(maxPlayed);
    }
  }

  const readingRemain = selectedLesson ? remainingReadingSeconds(selectedLesson.id) : MIN_READING_SECONDS;
  const canCompleteReading = selectedLesson ? readingRemain === 0 : false;

  useEffect(() => {
    if (!selectedLesson || selectedLesson.videoUrl) return;
    if (completed[selectedLesson.id]) return;
    if (readingStarts[selectedLesson.id]) return;
    if (startedReadingRef.current[selectedLesson.id]) return;

    startedReadingRef.current[selectedLesson.id] = true;
    void startReading(selectedLesson.id);
  }, [completed, readingStarts, selectedLesson, startReading]);

  useEffect(() => {
    if (!selectedLesson || selectedLesson.videoUrl) return;
    if (completed[selectedLesson.id]) return;
    if (!canCompleteReading) return;
    if (loadingLesson === selectedLesson.id) return;

    const timeout = window.setTimeout(() => {
      void markDone(selectedLesson);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [canCompleteReading, completed, loadingLesson, markDone, selectedLesson]);

  if (!selectedLesson) {
    return <p className="text-slate-600">{labels.noLessons}</p>;
  }

  return (
    <div className="grid h-full min-h-0 gap-4 lg:grid-cols-10">
      <CourseModuleSidebar
        modules={modules}
        moduleStateById={moduleStateById}
        bypassGates={bypassGates}
        selectedLessonId={selectedLesson.id}
        completed={completed}
        passedTestIds={passedTestIdSet}
        labels={labels}
        progress={progress}
        onSelectLesson={setSelectedLessonId}
      />

      <LessonPlayer
        lesson={selectedLesson}
        completed={Boolean(completed[selectedLesson.id])}
        loading={loadingLesson === selectedLesson.id}
        readingStarted={Boolean(readingStarts[selectedLesson.id])}
        readingRemain={readingRemain}
        error={errors[selectedLesson.id] ?? ""}
        nextAction={nextAction}
        progress={progress}
        labels={labels}
        onStartVideo={startVideo}
        onVideoTimeUpdate={onVideoTimeUpdate}
        onPreventSeek={preventSeek}
        onVideoHeartbeat={sendVideoHeartbeat}
        onMarkDone={markDone}
      />
    </div>
  );
}
