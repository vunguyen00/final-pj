import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserBalance } from "@/lib/wallet";
import { getAiPointsSummary } from "@/lib/ai-points";

export default async function ProfilePage() {
  const user = await requireRole("STUDENT");

  const [enrollments, feedbacks, balance, aiPoints] = await Promise.all([
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
    getUserBalance(user.id),
    getAiPointsSummary(user.id),
  ]);

  const progressMap = new Map<string, Set<string>>();
  for (const item of feedbacks) {
    if (!progressMap.has(item.courseId)) {
      progressMap.set(item.courseId, new Set<string>());
    }
    progressMap.get(item.courseId)?.add(item.content.replace("PROGRESS:", ""));
  }

  const completedCourses = enrollments.filter((enrollment) => {
    const lessonsCount = enrollment.course.modules.flatMap((module) => module.lessons).length;
    const completed = progressMap.get(enrollment.course.id)?.size ?? 0;
    return lessonsCount > 0 && completed >= lessonsCount;
  });

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h1 className="text-3xl font-bold text-slate-900">H? so c?a tôi</h1>
          <p className="mt-2 text-slate-700">Thông tin cá nhân</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-sm text-slate-500">Tên ngu?i dùng</p>
              <p className="mt-1 font-semibold text-slate-900">{user.username}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-sm text-slate-500">Email</p>
              <p className="mt-1 font-semibold text-slate-900">{user.email}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-sm text-slate-500">S? du còn l?i</p>
              <p className="mt-1 font-semibold text-slate-900">{Math.round(balance).toLocaleString("vi-VN")}d</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-sm text-slate-500">Ði?m hi?n có</p>
              <p className="mt-1 font-semibold text-slate-900">{aiPoints.available.toLocaleString("vi-VN")}</p>
            </div>
          </div>
          <div className="mt-4">
            <Link href="/student/wallet" className="text-sm font-medium text-blue-600 hover:text-blue-700">N?p ti?n</Link>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-semibold text-slate-900">Khóa h?c dã hoàn thành</h2>
          {completedCourses.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">B?n chua hoàn thành khóa h?c nào.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {completedCourses.map((item) => (
                <article key={item.id} className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                  <h3 className="font-semibold text-emerald-900">{item.course.name}</h3>
                  <p className="mt-1 text-sm text-emerald-800">Ðã hoàn thành</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

