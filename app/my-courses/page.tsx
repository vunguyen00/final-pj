import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import RefundRequestButton, { type RefundableCourse } from "./RefundRequestButton";

const REFUND_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_REFUND_PROGRESS = 50;

function getRefundCutoffDate() {
  return new Date(Date.now() - REFUND_WINDOW_MS);
}

type CourseStat = {
  enrollment: {
    id: string;
    createdAt: Date;
    course: {
      id: string;
      name: string;
      modules: { lessons: { id: string }[] }[];
    };
  };
  lessonsCount: number;
  completed: number;
  progress: number;
};

export default async function MyCoursesPage() {
  const user = await requireRole("STUDENT", "TEACHER");

  const [enrollments, feedbacks, refundRequests, orderItems] = await Promise.all([
    prisma.enrollment.findMany({
      where: { userId: user.id },
      include: {
        course: {
          include: {
            modules: {
              include: {
                lessons: { select: { id: true } },
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
    prisma.courseRefundRequest.findMany({
      where: { studentId: user.id },
      select: { courseId: true, status: true },
    }),
    prisma.orderItem.findMany({
      where: { order: { userId: user.id } },
      select: {
        courseId: true,
        price: true,
        order: { select: { createdAt: true } },
      },
      orderBy: { order: { createdAt: "desc" } },
    }),
  ]);

  const progressMap = new Map<string, Set<string>>();
  const refundStatusMap = new Map(refundRequests.map((item) => [item.courseId, item.status]));
  const purchaseMap = new Map<string, { price: number; createdAt: Date }>();

  for (const item of orderItems) {
    if (!purchaseMap.has(item.courseId)) {
      purchaseMap.set(item.courseId, { price: item.price, createdAt: item.order.createdAt });
    }
  }

  for (const item of feedbacks) {
    if (!progressMap.has(item.courseId)) {
      progressMap.set(item.courseId, new Set<string>());
    }
    progressMap.get(item.courseId)?.add(item.content.replace("PROGRESS:", ""));
  }

  const stats: CourseStat[] = enrollments.map((enrollment) => {
    const lessons = enrollment.course.modules.flatMap((module) => module.lessons);
    const completed = progressMap.get(enrollment.course.id)?.size ?? 0;
    const progress = lessons.length ? Math.round((completed / lessons.length) * 100) : 0;

    return {
      enrollment,
      lessonsCount: lessons.length,
      completed,
      progress,
    };
  });

  const refundCutoffDate = getRefundCutoffDate();
  const completedCourses = stats.filter((item) => item.lessonsCount > 0 && item.completed >= item.lessonsCount);
  const learningCourses = stats.filter((item) => item.lessonsCount === 0 || item.completed < item.lessonsCount);
  const refundableCourses: RefundableCourse[] = [];
  for (const item of stats) {
    const courseId = item.enrollment.course.id;
    const purchase = purchaseMap.get(courseId);
    if (!purchase || Math.round(purchase.price) <= 0 || item.enrollment.createdAt < refundCutoffDate || item.progress > MAX_REFUND_PROGRESS) {
      continue;
    }

    refundableCourses.push({
      courseId,
      courseName: item.enrollment.course.name,
      enrolledAt: item.enrollment.createdAt.toISOString(),
      refundAmount: Math.round(purchase.price),
      progress: item.progress,
      completed: item.completed,
      lessonsCount: item.lessonsCount,
      initialStatus: refundStatusMap.get(courseId) ?? null,
    });
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="border-b border-slate-200 pb-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Học tập</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Khóa học của tôi</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Theo dõi các khóa học đã đăng ký, tiếp tục bài học còn dang dở và quản lý yêu cầu hoàn tiền khi đăng ký nhầm.
          </p>

          <div className="mt-5 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="grid grid-cols-2 gap-2 sm:w-auto">
              <SummaryTile label="Đang học" value={learningCourses.length} />
              <SummaryTile label="Hoàn thành" value={completedCourses.length} />
            </div>
            <div className="flex flex-col gap-1 sm:items-end">
              <RefundRequestButton courses={refundableCourses} />
              <p className="text-xs text-slate-500">Chỉ áp dụng trong 7 ngày và khi tiến độ chưa vượt 50%.</p>
            </div>
          </div>
        </header>

        <section className="mt-7">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-950">Đang học và đã đăng ký</h2>
              <p className="mt-1 text-sm text-slate-500">Thời gian đăng ký được hiển thị trong từng khóa học.</p>
            </div>
            <span className="w-fit rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{learningCourses.length} khóa học</span>
          </div>

          {learningCourses.length === 0 ? (
            <EmptyState message="Bạn chưa có khóa học nào đang học." />
          ) : (
            <div className="mt-4 space-y-3">
              {learningCourses.map((item) => (
                <CourseRow key={item.enrollment.id} item={item} />
              ))}
            </div>
          )}
        </section>

        <section className="mt-8">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-slate-950">Đã hoàn thành</h2>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">{completedCourses.length} khóa học</span>
          </div>

          {completedCourses.length === 0 ? (
            <EmptyState message="Bạn chưa hoàn thành khóa học nào." />
          ) : (
            <div className="mt-4 space-y-3">
              {completedCourses.map((item) => (
                <CourseRow key={item.enrollment.id} item={item} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function SummaryTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-28 rounded-md bg-slate-50 px-4 py-3 text-right">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-white px-5 py-8 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}

function CourseRow({ item }: { item: CourseStat }) {
  const course = item.enrollment.course;

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-bold text-slate-950">{course.name}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
            <span>Đăng ký: {item.enrollment.createdAt.toLocaleString("vi-VN")}</span>
            <span className="h-1 w-1 rounded-full bg-slate-300" />
            <span>{item.completed}/{item.lessonsCount} bài học</span>
            <span className="h-1 w-1 rounded-full bg-slate-300" />
            <span>{item.progress}% hoàn thành</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-blue-600" style={{ width: `${item.progress}%` }} />
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 md:justify-end">
          <Link
            href={`/student/hoc-bai?courseId=${course.id}`}
            className="inline-flex h-9 items-center justify-center rounded-md bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700"
          >
            Vào học
          </Link>
        </div>
      </div>
    </article>
  );
}
