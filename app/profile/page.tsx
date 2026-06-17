import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserBalance } from "@/lib/wallet";
import { getAiPointsSummary } from "@/lib/ai-points";
import { getActiveLanguages } from "@/lib/teacher-onboarding";
import ProfileSettings from "./ProfileSettings";

export default async function ProfilePage() {
  const user = await requireUser();
  const isAdmin = user.role === "ADMIN";

  const [enrollments, feedbacks, balance, aiPoints, languages] = await Promise.all([
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
    getActiveLanguages(),
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
          <h1 className="text-3xl font-bold text-slate-900">Ho so cua toi</h1>
          <p className="mt-2 text-slate-700">Quan ly thong tin ca nhan va tai khoan.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-sm text-slate-500">Email</p>
              <p className="mt-1 font-semibold text-slate-900">{user.email}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-sm text-slate-500">Vai tro</p>
              <p className="mt-1 font-semibold text-slate-900">{user.role}</p>
            </div>
            {!isAdmin && (
              <>
                <div className="rounded-lg border border-slate-200 p-4">
                  <p className="text-sm text-slate-500">So du con lai</p>
                  <p className="mt-1 font-semibold text-slate-900">{Math.round(balance).toLocaleString("vi-VN")}đ</p>
                </div>
                <div className="rounded-lg border border-slate-200 p-4">
                  <p className="text-sm text-slate-500">Diem hien co</p>
                  <p className="mt-1 font-semibold text-slate-900">{aiPoints.available.toLocaleString("vi-VN")}</p>
                </div>
              </>
            )}
          </div>
          <div className="mt-4">
            {!isAdmin && (
              <Link href="/student/wallet" className="text-sm font-medium text-blue-600 hover:text-blue-700">Nạp tiền</Link>
            )}
          </div>
        </section>

        <ProfileSettings
          user={{
            username: user.username,
            email: user.email,
            phoneNumber: user.phoneNumber ?? null,
            learningLanguageId: user.learningLanguageId ?? null,
          }}
          languages={languages}
        />

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

