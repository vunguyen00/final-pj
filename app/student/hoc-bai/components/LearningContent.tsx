"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

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
};

const MIN_READING_SECONDS = 10 * 60;

export default function LearningContent({ modules, completedIds, courseId }: Props) {
  const lessons = useMemo(() => modules.flatMap((module) => module.lessons), [modules]);
  const firstLesson = lessons[0] ?? null;

  const [selectedLessonId, setSelectedLessonId] = useState<string>(firstLesson?.id ?? "");
  const [completed, setCompleted] = useState<Record<string, boolean>>(
    () => Object.fromEntries(completedIds.map((id) => [id, true])),
  );
  const [loadingLesson, setLoadingLesson] = useState<string>("");
  const [readingStarts, setReadingStarts] = useState<Record<string, number>>({});
  const [readingNow, setReadingNow] = useState<Record<string, number>>({});
  const [videoFull, setVideoFull] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const maxPlayedRef = useRef<Record<string, number>>({});
  const startedReadingRef = useRef<Record<string, boolean>>({});

  const selectedLesson = lessons.find((item) => item.id === selectedLessonId) ?? firstLesson;

  const progress = useMemo(() => {
    if (!lessons.length) return 0;
    const done = lessons.filter((lesson) => completed[lesson.id]).length;
    return Math.round((done / lessons.length) * 100);
  }, [completed, lessons]);

  const allDone = progress === 100;

  async function startReading(lessonId: string) {
    setErrors((prev) => ({ ...prev, [lessonId]: "" }));

    const response = await fetch(`/api/learning/lessons/${lessonId}/start`, { method: "POST" });
    const data = await response.json();

    if (!response.ok) {
      setErrors((prev) => ({ ...prev, [lessonId]: data.error ?? "Khong the bat dau hoc." }));
      return;
    }

    const startedAt = new Date(data.startedAt).getTime();
    setReadingStarts((prev) => ({ ...prev, [lessonId]: startedAt }));
    setReadingNow((prev) => ({ ...prev, [lessonId]: Date.now() }));

    const interval = window.setInterval(() => {
      setReadingNow((prev) => ({ ...prev, [lessonId]: Date.now() }));
    }, 1000);

    window.setTimeout(() => window.clearInterval(interval), MIN_READING_SECONDS * 1000 + 5000);
  }

  async function markDone(lesson: Lesson, options?: { watchedFull?: boolean }) {
    if (completed[lesson.id] || loadingLesson === lesson.id) return;

    setLoadingLesson(lesson.id);
    setErrors((prev) => ({ ...prev, [lesson.id]: "" }));

    try {
      const payload = lesson.videoUrl
        ? {
            watchedFull: options?.watchedFull ?? videoFull[lesson.id] === true,
            noSeek: true,
          }
        : {};

      const response = await fetch(`/api/learning/lessons/${lesson.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        setErrors((prev) => ({ ...prev, [lesson.id]: data.error ?? "Khong the danh dau hoan thanh." }));
        return;
      }

      setCompleted((prev) => ({ ...prev, [lesson.id]: true }));
    } finally {
      setLoadingLesson("");
    }
  }

  function remainingReadingSeconds(lessonId: string) {
    const startedAt = readingStarts[lessonId];
    if (!startedAt) return MIN_READING_SECONDS;

    const now = readingNow[lessonId] ?? Date.now();
    const elapsed = Math.floor((now - startedAt) / 1000);
    return Math.max(0, MIN_READING_SECONDS - elapsed);
  }

  function onVideoTimeUpdate(lessonId: string, currentTime: number) {
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

  function applySubtitleMode(lessonId: string, video: HTMLVideoElement) {
    const tracks = video.textTracks;
    for (let i = 0; i < tracks.length; i += 1) {
      tracks[i].mode = "showing";
    }
  }

  if (!selectedLesson) {
    return <p className="text-slate-600">Khoa hoc chua co bai hoc.</p>;
  }

  const readingRemain = remainingReadingSeconds(selectedLesson.id);
  const canCompleteReading = readingRemain === 0;

  useEffect(() => {
    if (!selectedLesson || selectedLesson.videoUrl) return;
    if (completed[selectedLesson.id]) return;
    if (readingStarts[selectedLesson.id]) return;
    if (startedReadingRef.current[selectedLesson.id]) return;

    startedReadingRef.current[selectedLesson.id] = true;
    void startReading(selectedLesson.id);
  }, [completed, readingStarts, selectedLesson]);

  useEffect(() => {
    if (!selectedLesson || selectedLesson.videoUrl) return;
    if (completed[selectedLesson.id]) return;
    if (!canCompleteReading) return;
    if (loadingLesson === selectedLesson.id) return;

    void markDone(selectedLesson);
  }, [canCompleteReading, completed, loadingLesson, selectedLesson]);

  return (
    <div className="grid h-full min-h-0 gap-4 lg:grid-cols-10">
      <aside className="lg:col-span-3 flex h-full min-h-0 flex-col rounded-xl border border-slate-200 bg-slate-900 text-slate-100">
        <div className="border-b border-slate-700 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-slate-300">Muc luc bai hoc</p>
          <p className="mt-1 text-sm text-slate-200">Tien do: {progress}%</p>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
          {modules.map((module, moduleIndex) => (
            <div key={module.id} className="rounded-lg border border-slate-700 bg-slate-800/60">
              <p className="px-3 py-2 text-sm font-semibold text-white">Module {moduleIndex + 1}: {module.name}</p>
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
                          : "bg-slate-700/60 text-slate-100 hover:bg-slate-700"
                      }`}
                    >
                      <div>
                        <span className="line-clamp-1">{moduleIndex + 1}.{lessonIndex + 1} {lesson.title}</span>
                        <p className={`mt-1 text-xs ${done ? "text-emerald-300" : "text-slate-300"}`}>
                          {done ? "Da hoan thanh" : "Chua hoan thanh"}
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
            <p className="text-sm font-medium text-emerald-600">Da hoan thanh bai hoc nay</p>
          ) : (
            <p className="text-sm font-medium text-slate-500">
              {loadingLesson === selectedLesson.id ? "Dang luu..." : "Chua hoan thanh"}
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
              onLoadedMetadata={(e) => applySubtitleMode(selectedLesson.id, e.currentTarget)}
              onTimeUpdate={(e) => onVideoTimeUpdate(selectedLesson.id, e.currentTarget.currentTime)}
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
              onEnded={() => {
                setVideoFull((prev) => ({ ...prev, [selectedLesson.id]: true }));
                void markDone(selectedLesson, { watchedFull: true });
              }}
            >
              <source key={selectedLesson.videoUrl} src={selectedLesson.videoUrl} />
            </video>
            <p className="mt-2 text-xs text-slate-600">Yeu cau: xem het video. Thanh tua se bi khoa trong qua trinh hoc.</p>
          </div>
        ) : (
          !completed[selectedLesson.id] ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm text-amber-900">Bai khong co video: can hoc toi thieu 10 phut.</p>
              {!readingStarts[selectedLesson.id] ? (
                <p className="mt-2 text-sm font-medium text-amber-800">Dang bat dau tinh gio...</p>
              ) : (
                <p className="mt-2 text-sm font-medium text-amber-800">
                  Con lai: {Math.floor(readingRemain / 60)}:{String(readingRemain % 60).padStart(2, "0")}
                </p>
              )}
            </div>
          ) : null
          )}

          <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-700">{selectedLesson.content}</p>
          {errors[selectedLesson.id] ? <p className="mt-2 text-sm text-red-600">{errors[selectedLesson.id]}</p> : null}

          {allDone ? (
            <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-3">
              <p className="text-sm font-medium text-blue-800">Ban da hoan thanh 100% noi dung. Tiep theo: lam bai test.</p>
              <Link
                href={`/student/tests?courseId=${courseId}`}
                className="mt-2 inline-block rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white"
              >
                Chuyen sang bai test
              </Link>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
