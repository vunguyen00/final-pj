import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function MyLearningPage() {
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

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-bold text-slate-900">Khoa hoc cua toi</h1>
        <p className="mt-2 text-slate-600">Danh sach khoa hoc da dang ky va tien do hoc tap.</p>

        {enrollments.length === 0 ? (
          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 text-slate-700">
            Ban chua dang ky khoa hoc nao.
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {enrollments.map((enrollment) => {
              const course = enrollment.course;
              const lessons = course.modules.flatMap((module) => module.lessons);
              const completed = progressMap.get(course.id)?.size ?? 0;
              const progress = lessons.length ? Math.round((completed / lessons.length) * 100) : 0;

              return (
                <article key={enrollment.id} className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-xl font-semibold text-slate-900">{course.name}</h2>
                    <Link
                      href={`/student/hoc-bai?courseId=${course.id}`}
                      className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700"
                    >
                      Vao hoc
                    </Link>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{course.description}</p>
                  <p className="mt-3 text-sm text-slate-700">Tien do: {completed}/{lessons.length} bai ({progress}%)</p>
                  <div className="mt-2 h-2 rounded-full bg-slate-200">
                    <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${progress}%` }} />
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
