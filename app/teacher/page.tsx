import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  calculateAvailableTeacherRevenue,
  REVENUE_ELIGIBLE_ORDER_ITEM_WHERE,
  RESERVED_WITHDRAWAL_STATUSES,
} from "@/lib/teacher-revenue";

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

function formatCurrency(value: number) {
  return currencyFormatter.format(Math.round(value));
}

function getMonthStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export default async function TeacherPage() {
  const user = await requireRole("TEACHER");

  const [courses, orderItems, reservedWithdrawals] = await Promise.all([
    prisma.course.findMany({
      where: { instructorId: user.id },
      select: {
        id: true,
        name: true,
        status: true,
        _count: { select: { enrollments: true, tests: true, modules: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.orderItem.findMany({
      where: {
        course: { instructorId: user.id },
        ...REVENUE_ELIGIBLE_ORDER_ITEM_WHERE,
      },
      select: {
        price: true,
        teacherRevenue: true,
        order: { select: { createdAt: true } },
      },
    }),
    prisma.teacherRevenueWithdrawal.aggregate({
      where: {
        teacherId: user.id,
        status: { in: [...RESERVED_WITHDRAWAL_STATUSES] },
      },
      _sum: { amount: true },
    }),
  ]);

  const monthStart = getMonthStart();
  const totalRevenue = orderItems.reduce((sum, item) => sum + item.teacherRevenue, 0);
  const monthRevenue = orderItems
    .filter((item) => item.order.createdAt >= monthStart)
    .reduce((sum, item) => sum + item.teacherRevenue, 0);
  const totalSales = orderItems.reduce((sum, item) => sum + item.price, 0);
  const reservedRevenue = reservedWithdrawals._sum.amount ?? 0;
  const availableRevenue = calculateAvailableTeacherRevenue(totalRevenue, reservedRevenue);
  const totalEnrollments = courses.reduce((sum, course) => sum + course._count.enrollments, 0);

  return (
    <main className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase text-blue-600">Tổng quan giảng viên</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-950">Xin chào, {user.username}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Theo dõi doanh thu, khóa học, học viên và bài test trong cùng một nơi.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/teacher/courses" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                Quản lý khóa học
              </Link>
              <Link href="/teacher/revenue" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Chi tiết doanh thu
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Số dư khả dụng" value={formatCurrency(availableRevenue)} detail={`${formatCurrency(reservedRevenue)} đang xử lý`} tone="emerald" />
          <Metric label="Doanh thu tháng này" value={formatCurrency(monthRevenue)} detail="Từ đầu tháng hiện tại" tone="blue" />
          <Metric label="Tổng doanh số" value={formatCurrency(totalSales)} detail={`Doanh thu được nhận ${formatCurrency(totalRevenue)}`} tone="slate" />
          <Metric label="Khóa học / học viên" value={`${courses.length} / ${totalEnrollments}`} detail={`${orderItems.length} lượt mua hợp lệ`} tone="amber" />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-950">Khóa học gần đây</h2>
              <p className="text-sm text-slate-500">Trạng thái quản lý, số chương, bài test và học viên.</p>
            </div>
            <Link href="/teacher/tests" className="text-sm font-bold text-blue-700 hover:text-blue-800">
              Quản lý bài test
            </Link>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {courses.map((course) => (
              <Link key={course.id} href={`/teacher/courses/${course.id}`} className="rounded-xl border border-slate-200 p-4 hover:border-blue-300 hover:bg-blue-50/50">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-950">{course.name}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {course._count.modules} chương - {course._count.tests} bài test - {course._count.enrollments} học viên
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                    {course.status}
                  </span>
                </div>
              </Link>
            ))}
            {courses.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                Chưa có khóa học nào. Hãy tạo khóa học đầu tiên để bắt đầu ghi nhận doanh thu.
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: "emerald" | "blue" | "slate" | "amber";
}) {
  const toneClass = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-950",
    blue: "border-blue-200 bg-blue-50 text-blue-950",
    slate: "border-slate-200 bg-white text-slate-950",
    amber: "border-amber-200 bg-amber-50 text-amber-950",
  }[tone];

  return (
    <article className={`rounded-2xl border p-4 shadow-sm ${toneClass}`}>
      <p className="text-xs font-semibold uppercase opacity-70">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      <p className="mt-1 text-xs opacity-75">{detail}</p>
    </article>
  );
}
