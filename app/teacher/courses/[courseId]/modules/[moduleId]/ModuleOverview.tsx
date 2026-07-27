import Link from "next/link";
import type { CourseManagementLabels } from "@/lib/language-display";

type Lesson = {
  id: string;
  title: string;
  content: string;
  videoUrl: string | null;
};

type Props = {
  courseId: string;
  courseName?: string;
  moduleName?: string;
  lessons?: Lesson[];
  labels: CourseManagementLabels["lessonsPage"];
  onCreateLesson: () => void;
  onEditLesson: (lesson: Lesson) => void;
  onDeleteLesson: (lesson: Lesson) => void;
};

export function ModuleOverview({
  courseId,
  courseName,
  moduleName,
  lessons,
  labels,
  onCreateLesson,
  onEditLesson,
  onDeleteLesson,
}: Props) {
  return (
    <div className="mx-auto max-w-7xl px-4">
      <div className="mb-4 flex items-center justify-between">
        <Link
          href={`/teacher/courses/${courseId}`}
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          {labels.backToCourse}
        </Link>
      </div>

      <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{moduleName}</h1>
            <p className="mt-1 text-sm text-slate-600">{labels.course}: {courseName}</p>
          </div>
          <button
            type="button"
            onClick={onCreateLesson}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <line x1="12" x2="12" y1="5" y2="19" />
              <line x1="5" x2="19" y1="12" y2="12" />
            </svg>
            {labels.addLesson}
          </button>
        </div>
      </div>

      {lessons?.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <p className="text-slate-600">{labels.empty}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {lessons?.map((lesson, index) => (
            <div key={lesson.id} className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-sm font-medium text-slate-700">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{lesson.title}</h3>
                    <p className="mt-2 line-clamp-2 text-sm text-slate-600">{lesson.content}</p>
                    {lesson.videoUrl ? (
                      <div className="mt-2 flex items-center gap-2 text-sm text-blue-600">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                          <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                        <span>{labels.hasVideo}</span>
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onEditLesson(lesson)}
                    className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
                    aria-label={labels.editLesson}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteLesson(lesson)}
                    className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                    aria-label={labels.deleteLesson}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
