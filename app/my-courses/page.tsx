import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function MyCoursesPage() {
  const user = await requireRole("STUDENT");

  const [enrollments, feedbacks] = await Promise.all([
    prisma.enrollment.findMany({
      where: { userId: user.id },
      include: {
        course: {
          include: {
            modules: {
              include: {
                lessons: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.feedback.findMany({
      where: {
        userId: user.id,
        content: { startsWith: "PROGRESS:" },
      },
      select: { courseId: true, content: true },
    }),
  ]);

  const progressMap = new Map<string, Set<string>>();
  for (const item of feedbacks) {
    if (!progressMap.has(item.courseId)) {
      progressMap.set(item.courseId, new Set<string>());
    }
    progressMap.get(item.courseId)?.add(item.content.replace("PROGRESS:", ""));
  }

  const stats = enrollments.map((enrollment) => {
    const course = enrollment.course;
    const lessons = course.modules.flatMap((module) => module.lessons);
    const completed = progressMap.get(course.id)?.size ?? 0;
    const progress = lessons.length ? Math.round((completed / lessons.length) * 100) : 0;
    return { enrollment, lessonsCount: lessons.length, completed, progress };
  });

  const completedCourses = stats.filter((item) => item.lessonsCount > 0 && item.completed >= item.lessonsCount);
  const learningCourses = stats.filter((item) => item.lessonsCount === 0 || item.completed < item.lessonsCount);

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Khóa h?c c?a tôi</h1>
          <p className="mt-2 text-slate-600">Hi?n th? c? khóa h?c dã dang ký và dã hoàn thành.</p>
        </div>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-semibold text-slate-900">Ðang h?c / Ðã dang ký</h2>
          {learningCourses.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">Không còn khóa h?c nào dang h?c.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {learningCourses.map((item) => (
                <article key={item.enrollment.id} className="rounded-lg border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold text-slate-900">{item.enrollment.course.name}</h3>
                    <Link href={`/student/hoc-bai?courseId=${item.enrollment.course.id}`} className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700">
                      Vào h?c
                    </Link>
                  </div>
                  <p className="mt-2 text-sm text-slate-700">Ti?n d?: {item.completed}/{item.lessonsCount} bài ({item.progress}%)</p>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-semibold text-slate-900">Ðã hoàn thành</h2>
          {completedCourses.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">B?n chua hoàn thành khóa h?c nào.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {completedCourses.map((item) => (
                <article key={item.enrollment.id} className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                  <h3 className="font-semibold text-emerald-900">{item.enrollment.course.name}</h3>
                  <p className="mt-2 text-sm text-emerald-800">Ðã hoàn thành {item.lessonsCount}/{item.lessonsCount} bài (100%).</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

