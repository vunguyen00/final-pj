import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { getCourseDuration, getCourseLanguage, getCourseLevel, priceLabel } from "@/app/components/learningMarketplace";
import { getAiPointsSummary } from "@/lib/ai-points";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatShortDate(date: Date) {
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

function formatScore(score: number, maxScore: number) {
  if (!maxScore) return "0%";
  return `${Math.round((score / maxScore) * 100)}%`;
}

function getActivitySeries(activities: Array<{ activityDate: Date }>) {
  const today = startOfDay(new Date());
  const counts = new Map<string, number>();
  for (const activity of activities) {
    const key = formatDateKey(startOfDay(activity.activityDate));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today.getTime() - DAY_MS * (6 - index));
    const key = formatDateKey(date);
    return {
      label: formatShortDate(date),
      value: counts.get(key) ?? 0,
    };
  });
}

export default async function StudentPage() {
  const user = await requireRole("STUDENT", "TEACHER");
  const today = startOfDay(new Date());
  const since = new Date(today);
  since.setDate(today.getDate() - 6);

  const [enrollments, recommended, feedbacks, tests, activities, aiSummary] = await Promise.all([
    prisma.enrollment.findMany({
      where: { userId: user.id },
      include: {
        course: {
          include: {
            language: { select: { name: true, code: true } },
            modules: { include: { lessons: { select: { id: true } } }, orderBy: { order: "asc" } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.course.findMany({
      where: { status: "ACTIVE" },
      include: {
        instructor: { select: { username: true } },
        language: { select: { name: true, code: true } },
        _count: { select: { enrollments: true } },
      },
      orderBy: [{ enrollments: { _count: "desc" } }, { createdAt: "desc" }],
      take: 8,
    }),
    prisma.feedback.findMany({
      where: { userId: user.id, content: { startsWith: "PROGRESS:" } },
      select: { courseId: true, content: true },
    }),
    prisma.testAttempt.findMany({
      where: { userId: user.id, test: { kind: { not: "TEACHER_ENTRANCE" } } },
      include: { test: { select: { name: true, courseId: true } } },
      orderBy: { submittedAt: "desc" },
      take: 5,
    }),
    prisma.learningActivity.findMany({
      where: { userId: user.id, activityDate: { gte: since } },
      select: { activityDate: true },
    }),
    getAiPointsSummary(user.id).catch(() => ({ earned: 0, spent: 0, available: 0, pointPriceVnd: 1000, history: [] })),
  ]);

  const completedByCourse = new Map<string, Set<string>>();
  for (const item of feedbacks) {
    const lessonId = item.content.replace("PROGRESS:", "");
    const set = completedByCourse.get(item.courseId) ?? new Set<string>();
    set.add(lessonId);
    completedByCourse.set(item.courseId, set);
  }

  const enrolledCourseIds = new Set(enrollments.map((item) => item.courseId));
  const courseStats = [];
  for (const { course, createdAt, accessStatus } of enrollments) {
    if (accessStatus !== "ACTIVE") continue;
    const totalLessons = course.modules.reduce((sum, module) => sum + module.lessons.length, 0);
    const completed = completedByCourse.get(course.id)?.size ?? 0;
    const progress = totalLessons > 0 ? Math.min(100, Math.round((completed / totalLessons) * 100)) : 0;
    courseStats.push({ course, enrolledAt: createdAt, totalLessons, completed, progress });
  }
  const activeCourses = courseStats.filter((item) => item.progress < 100);
  const completedCourses = courseStats.filter((item) => item.progress === 100);
  const recommendedCourses = recommended.filter((course) => !enrolledCourseIds.has(course.id)).slice(0, 4);
  const averageProgress = courseStats.length
    ? Math.round(courseStats.reduce((sum, item) => sum + item.progress, 0) / courseStats.length)
    : 0;
  const activitySeries = getActivitySeries(activities);
  const maxActivity = Math.max(1, ...activitySeries.map((item) => item.value));

  return (
    <main className="min-h-dvh bg-slate-50 py-8">
      <div className="mx-auto max-w-7xl space-y-6 px-4">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-blue-700">{user.role === "TEACHER" ? "Chế độ học thử" : "Bảng học sinh"}</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Xin chào, {user.username}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Theo dõi khóa học đã đăng ký, tiến độ bài học, điểm đậu và kết quả kiểm tra gần nhất của bạn.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/my-courses" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">
                Khóa học của tôi
              </Link>
              <Link href="/student/tests" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
                Làm bài test
              </Link>
              <Link href="/student/wallet" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
                Điểm đậu
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Metric label="Tiến độ trung bình" value={`${averageProgress}%`} detail={`${courseStats.length} khóa đã đăng ký`} />
          <Metric label="Đang học" value={activeCourses.length.toLocaleString("vi-VN")} detail="Khóa chưa hoàn thành" />
          <Metric label="Hoàn thành" value={completedCourses.length.toLocaleString("vi-VN")} detail="Khóa đã đạt 100%" />
          <Metric label="Bài test gần đây" value={tests.length.toLocaleString("vi-VN")} detail="Lần làm mới nhất" />
          <Metric label="Điểm đậu hiện có" value={aiSummary.available.toLocaleString("vi-VN")} detail={`Đã dùng ${aiSummary.spent.toLocaleString("vi-VN")}`} />
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.4fr_0.9fr]">
          <Panel title="Tiếp tục học" action={<Link href="/my-courses" className="text-sm font-bold text-blue-700">Xem tất cả</Link>}>
            <div className="space-y-3">
              {activeCourses.slice(0, 4).map(({ course, progress, completed, totalLessons, enrolledAt }) => (
                <Link key={course.id} href={`/student/hoc-bai?courseId=${course.id}`} className="block rounded-lg border border-slate-200 p-4 transition hover:border-blue-300 hover:bg-blue-50/60">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">{getCourseLanguage(course)}</span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{getCourseLevel(course)}</span>
                      </div>
                      <h3 className="mt-2 truncate font-bold text-slate-950">{course.name}</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {completed}/{totalLessons} bài học · Đăng ký {enrolledAt.toLocaleDateString("vi-VN")}
                      </p>
                    </div>
                    <span className="text-2xl font-black text-slate-950">{progress}%</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-blue-600" style={{ width: `${progress}%` }} />
                  </div>
                </Link>
              ))}
              {activeCourses.length === 0 ? <EmptyState message="Bạn chưa có khóa học đang học. Hãy đăng ký khóa học để bắt đầu." /> : null}
            </div>
          </Panel>

          <Panel title="Bài test gần đây" action={<Link href="/student/results" className="text-sm font-bold text-blue-700">Xem kết quả</Link>}>
            <div className="space-y-3">
              {tests.map((attempt) => (
                <Link key={attempt.id} href={`/student/tests/${attempt.testId}/result/${attempt.id}`} className="block rounded-lg border border-slate-200 p-3 hover:border-blue-300">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-bold text-slate-950">{attempt.test.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{attempt.submittedAt.toLocaleString("vi-VN")}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${attempt.isPassed ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                      {attempt.isPassed ? "Đạt" : "Cần ôn"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-700">Điểm: {formatScore(attempt.score, attempt.maxScore)}</p>
                </Link>
              ))}
              {tests.length === 0 ? <EmptyState message="Chưa có lượt làm bài test nào." /> : null}
            </div>
          </Panel>
        </section>

        <Panel title="Hoạt động học 7 ngày">
          <div className="grid grid-cols-7 gap-2">
            {activitySeries.map((item) => (
              <div key={item.label} className="rounded-lg bg-slate-100 p-2">
                <div className="flex h-28 items-end">
                  <div className="w-full rounded bg-blue-600" style={{ height: `${Math.max(6, (item.value / maxActivity) * 100)}%` }} />
                </div>
                <p className="mt-2 text-center text-xs font-semibold text-slate-500">{item.label}</p>
                <p className="text-center text-xs font-bold text-slate-900">{item.value}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Gợi ý khóa học mới" action={<Link href="/courses" className="text-sm font-bold text-blue-700">Tìm khóa học</Link>}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {recommendedCourses.map((course) => (
              <Link key={course.id} href={`/courses/${course.id}`} className="overflow-hidden rounded-lg border border-slate-200 bg-white hover:border-blue-300">
                <div className="relative flex aspect-[16/9] items-center justify-center bg-slate-900 text-lg font-black text-white">
                  {course.thumbnail ? (
                    <Image src={course.thumbnail} alt="" fill sizes="(min-width: 1280px) 25vw, (min-width: 768px) 50vw, 100vw" className="object-cover" unoptimized />
                  ) : (
                    getCourseLanguage(course).slice(0, 2).toUpperCase()
                  )}
                </div>
                <div className="p-4">
                  <p className="text-xs font-bold uppercase text-blue-700">{getCourseLanguage(course)} · {getCourseDuration(course)}</p>
                  <h3 className="mt-2 line-clamp-2 min-h-12 font-bold text-slate-950">{course.name}</h3>
                  <p className="mt-1 text-sm text-slate-500">{course._count.enrollments} học viên</p>
                  <p className="mt-3 font-black text-slate-950">{priceLabel(course.price)}</p>
                </div>
              </Link>
            ))}
            {recommendedCourses.length === 0 ? <EmptyState message="Hiện chưa có khóa học mới phù hợp để gợi ý." /> : null}
          </div>
        </Panel>
      </div>
    </main>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </article>
  );
}

function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-950">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}
