"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { getCourseLearningLabels } from "@/lib/language-display";

type Lesson = {
  id: string;
  title: string;
  content: string;
  videoUrl: string | null;
};

type Module = {
  id: string;
  name: string;
  lessons: Lesson[];
};

type Props = {
  modules: Module[];
  completedIds: string[];
  courseId: string;
  language?: string | null;
};

const MIN_READING_SECONDS = 3 * 60;

function applySubtitleMode(video: HTMLVideoElement) {
  const tracks = video.textTracks;
  for (let i = 0; i < tracks.length; i += 1) {
    tracks[i].mode = "showing";
  }
}

export default function LearningContent({ modules, completedIds, courseId, language }: Props) {
  const labels = getCourseLearningLabels(language);
  const lessons = useMemo(() => modules.flatMap((module) => module.lessons), [modules]);
  const firstLesson = lessons[0] ?? null;

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

  const selectedLesson = lessons.find((item) => item.id === selectedLessonId) ?? firstLesson;

  const progress = useMemo(() => {
    if (!lessons.length) return 0;
    const done = lessons.filter((lesson) => completed[lesson.id]).length;
    return Math.round((done / lessons.length) * 100);
  }, [completed, lessons]);

  const allDone = progress === 100;
  const testHref = `/student/tests?courseId=${courseId}`;

  const startReading = useCallback(async (lessonId: string) => {
    setErrors((prev) => ({ ...prev, [lessonId]: "" }));

    const response = await fetch(`/api/learning/lessons/${lessonId}/start`, { method: "POST" });
    const data = await response.json();

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

      const data = await response.json();
      if (!response.ok) {
        setErrors((prev) => ({ ...prev, [lesson.id]: data.error ?? "Không thể đánh dấu hoàn thành." }));
        return;
      }

      setCompleted((prev) => ({ ...prev, [lesson.id]: true }));
    } finally {
      setLoadingLesson("");
    }
  }, [completed, loadingLesson]);

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
      <aside className="lg:col-span-3 flex h-full min-h-0 flex-col rounded-xl border border-slate-200 bg-white text-slate-900">
        <div className="border-b border-slate-200 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">{labels.tableOfContents}</p>
          <p className="mt-1 text-sm text-slate-600">{labels.progress(progress)}</p>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
          {modules.map((module, moduleIndex) => (
            <div key={module.id} className="rounded-lg border border-slate-200 bg-slate-50">
              <p className="px-3 py-2 text-sm font-semibold text-slate-950">{labels.module(moduleIndex + 1)}: {module.name}</p>
              <div className="space-y-1 px-2 pb-2">
                {module.lessons.map((lesson, lessonIndex) => {
                  const active = lesson.id === selectedLesson.id;
                  const done = completed[lesson.id] === true;

                  return (
                    <button
                      key={lesson.id}
                      type="button"
                      onClick={() => setSelectedLessonId(lesson.id)}
                      className={`w-full rounded-md px-3 py-2 text-left text-sm transition ${
                        active
                          ? "bg-blue-600 text-white"
                          : "bg-white text-slate-700 hover:bg-blue-50"
                      }`}
                    >
                      <div>
                        <span className="line-clamp-1">{moduleIndex + 1}.{lessonIndex + 1} {lesson.title}</span>
                        <p className={`mt-1 text-xs ${active ? "text-blue-100" : done ? "text-emerald-600" : "text-slate-500"}`}>
                          {done ? labels.completed : labels.notCompleted}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </aside>

      <section className="lg:col-span-7 flex h-full min-h-0 flex-col rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-lg font-semibold text-slate-900">{selectedLesson.title}</h3>
          {completed[selectedLesson.id] ? (
            <p className="text-sm font-medium text-emerald-600">{labels.completedLesson}</p>
          ) : (
            <p className="text-sm font-medium text-slate-500">
              {loadingLesson === selectedLesson.id ? labels.saving : labels.notCompleted}
            </p>
          )}
        </div>

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
          {selectedLesson.videoUrl ? (
          <div>
            <video
              key={selectedLesson.id}
              controls
              preload="metadata"
              className="aspect-video w-full rounded-lg border border-slate-200 bg-black"
              onLoadedMetadata={(e) => {
                applySubtitleMode(e.currentTarget);
                void startVideo(selectedLesson.id);
              }}
              onPlay={() => void startVideo(selectedLesson.id)}
              onTimeUpdate={(e) =>
                onVideoTimeUpdate(
                  selectedLesson.id,
                  e.currentTarget.currentTime,
                  e.currentTarget.duration,
                )
              }
              onSeeking={(e) =>
                preventSeek(selectedLesson.id, e.currentTarget.currentTime, (value) => {
                  e.currentTarget.currentTime = value;
                })
              }
              onSeeked={(e) =>
                preventSeek(selectedLesson.id, e.currentTarget.currentTime, (value) => {
                  e.currentTarget.currentTime = value;
                })
              }
              onEnded={async (e) => {
                await sendVideoHeartbeat(
                  selectedLesson.id,
                  e.currentTarget.duration,
                  e.currentTarget.duration,
                  true,
                );
                await markDone(selectedLesson);
              }}
            >
              <source key={selectedLesson.videoUrl} src={selectedLesson.videoUrl} />
            </video>
            <p className="mt-2 text-xs text-slate-600">{labels.videoRequirement}</p>
          </div>
        ) : (
          !completed[selectedLesson.id] ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm text-amber-900">{labels.readingRequirement}</p>
              {!readingStarts[selectedLesson.id] ? (
                <p className="mt-2 text-sm font-medium text-amber-800">{labels.startingTimer}</p>
              ) : (
                <p className="mt-2 text-sm font-medium text-amber-800">
                  {labels.remaining(`${Math.floor(readingRemain / 60)}:${String(readingRemain % 60).padStart(2, "0")}`)}
                </p>
              )}
            </div>
          ) : null
          )}

          <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-700">{selectedLesson.content}</p>
          {errors[selectedLesson.id] ? <p className="mt-2 text-sm text-red-600">{errors[selectedLesson.id]}</p> : null}

        </div>

        {allDone ? (
          <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-blue-700">{labels.allDone}</p>
            <Link
              href={testHref}
              className="inline-flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 sm:w-auto"
            >
              {labels.takeTest}
            </Link>
          </div>
        ) : null}
      </section>
    </div>
  );
}
