import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  calculateAvailableTeacherRevenue,
  REVENUE_ELIGIBLE_ORDER_ITEM_WHERE,
  RESERVED_WITHDRAWAL_STATUSES,
} from "@/lib/teacher-revenue";

const currencyFormatter = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });
const formatCurrency = (value: number) => currencyFormatter.format(Math.round(value));

function buildWeeklyReportTrend(dates: Date[]) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 7 * 7);
  return Array.from({ length: 8 }, (_, index) => {
    const from = new Date(start);
    from.setDate(start.getDate() + index * 7);
    const to = new Date(from);
    to.setDate(from.getDate() + 7);
    return { label: `${from.getDate()}/${from.getMonth() + 1}`, value: dates.filter((date) => date >= from && date < to).length };
  });
}

function getReportRangeStart() {
  return new Date(Date.now() - 56 * 24 * 60 * 60 * 1000);
}

export default async function TeacherPage() {
  const user = await requireRole("TEACHER");
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const reportRangeStart = getReportRangeStart();

  const [courses, orderItems, reservedWithdrawals, reportStatuses, reportDates, recentReports, totalTeacherEnrollments, reportsByCourse] = await Promise.all([
    prisma.course.findMany({
      where: { instructorId: user.id },
      select: { id: true, name: true, status: true, _count: { select: { enrollments: true, tests: true, modules: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.orderItem.findMany({
      where: { course: { instructorId: user.id }, ...REVENUE_ELIGIBLE_ORDER_ITEM_WHERE },
      select: { price: true, teacherRevenue: true, order: { select: { createdAt: true } } },
    }),
    prisma.teacherRevenueWithdrawal.aggregate({
      where: { teacherId: user.id, status: { in: [...RESERVED_WITHDRAWAL_STATUSES] } },
      _sum: { amount: true },
    }),
    prisma.courseReport.groupBy({ by: ["status"], where: { course: { instructorId: user.id } }, _count: { _all: true } }),
    prisma.courseReport.findMany({ where: { course: { instructorId: user.id }, createdAt: { gte: reportRangeStart } }, select: { createdAt: true } }),
    prisma.courseReport.findMany({
      where: { course: { instructorId: user.id } },
      select: { id: true, title: true, status: true, course: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.enrollment.count({ where: { course: { instructorId: user.id } } }),
    prisma.courseReport.groupBy({ by: ["courseId"], where: { course: { instructorId: user.id } }, _count: { _all: true }, orderBy: { _count: { courseId: "desc" } }, take: 5 }),
  ]);

  const reportedCourses = reportsByCourse.length
    ? await prisma.course.findMany({ where: { id: { in: reportsByCourse.map((item) => item.courseId) } }, select: { id: true, name: true } })
    : [];
  const courseNameMap = new Map(reportedCourses.map((course) => [course.id, course.name]));
  const totalRevenue = orderItems.reduce((sum, item) => sum + item.teacherRevenue, 0);
  const monthRevenue = orderItems.filter((item) => item.order.createdAt >= monthStart).reduce((sum, item) => sum + item.teacherRevenue, 0);
  const totalSales = orderItems.reduce((sum, item) => sum + item.price, 0);
  const reservedRevenue = reservedWithdrawals._sum.amount ?? 0;
  const availableRevenue = calculateAvailableTeacherRevenue(totalRevenue, reservedRevenue);
  const totalEnrollments = courses.reduce((sum, course) => sum + course._count.enrollments, 0);
  const reportCountMap = new Map(reportStatuses.map((item) => [item.status, item._count._all]));
  const totalReports = reportStatuses.reduce((sum, item) => sum + item._count._all, 0);
  const pendingReports = (reportCountMap.get("PENDING") ?? 0) + (reportCountMap.get("IN_REVIEW") ?? 0);
  const resolvedReports = reportCountMap.get("RESOLVED") ?? 0;
  const reportRate = totalTeacherEnrollments ? (totalReports / totalTeacherEnrollments) * 100 : 0;
  const reportTrend = buildWeeklyReportTrend(reportDates.map((item) => item.createdAt));

  return (
    <main className="min-h-dvh bg-slate-50 py-8">
      <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div><p className="text-sm font-semibold uppercase text-blue-600">Tổng quan giảng viên</p><h1 className="mt-2 text-3xl font-bold text-slate-950">Xin chào, {user.username}</h1><p className="mt-2 text-sm text-slate-600">Theo dõi doanh thu, khóa học, học viên, bài test và báo cáo trong cùng một nơi.</p></div>
            <div className="flex flex-wrap gap-2">
              <Link href="/teacher/courses" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Quản lý khóa học</Link>
              <Link href="/teacher/revenue" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Chi tiết doanh thu</Link>
              <Link href="/teacher/reports" className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700">Báo cáo khóa học</Link>
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
          <div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-bold text-slate-950">Thống kê báo cáo khóa học</h2><p className="mt-1 text-sm text-slate-500">Chỉ gồm dữ liệu thuộc khóa học do bạn phụ trách.</p></div><Link href="/teacher/reports" className="text-sm font-bold text-blue-700">Xem tất cả</Link></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Tổng báo cáo" value={String(totalReports)} detail={`${reportRate.toFixed(1)}% trên lượt ghi danh`} tone="slate" />
            <Metric label="Đang chờ xử lý" value={String(pendingReports)} detail="Chờ xử lý và đang xem xét" tone="amber" />
            <Metric label="Đã giải quyết" value={String(resolvedReports)} detail="Đã có kết luận cuối" tone="emerald" />
            <Metric label="Khóa bị báo cáo" value={String(reportsByCourse.length)} detail="Nhóm khóa có phát sinh báo cáo" tone="blue" />
          </div>
          <div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
            <ReportBarChart data={reportTrend} />
            <div><h3 className="text-sm font-bold text-slate-800">Khóa học bị báo cáo nhiều</h3><div className="mt-3 space-y-2">{reportsByCourse.map((item) => <div key={item.courseId} className="flex justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm"><span className="truncate text-slate-700">{courseNameMap.get(item.courseId) ?? item.courseId}</span><strong>{item._count._all}</strong></div>)}{reportsByCourse.length === 0 ? <p className="text-sm text-slate-500">Chưa có báo cáo.</p> : null}</div></div>
          </div>
          {recentReports.length ? <div className="mt-5"><h3 className="text-sm font-bold text-slate-800">Báo cáo gần nhất</h3><div className="mt-2 grid gap-2 md:grid-cols-2">{recentReports.map((report) => <Link key={report.id} href="/teacher/reports" className="rounded-lg border border-slate-200 p-3 text-sm"><strong className="block text-slate-900">{report.title}</strong><span className="mt-1 block text-xs text-slate-500">{report.course.name} · {report.status}</span></Link>)}</div></div> : null}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-end justify-between gap-3"><div><h2 className="text-lg font-bold text-slate-950">Khóa học gần đây</h2><p className="text-sm text-slate-500">Trạng thái, số chương, bài test và học viên.</p></div><Link href="/student/tests" className="text-sm font-bold text-blue-700">Xem bài test</Link></div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">{courses.map((course) => <Link key={course.id} href={`/teacher/courses/${course.id}`} className="rounded-xl border border-slate-200 p-4 hover:border-blue-300"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-semibold text-slate-950">{course.name}</p><p className="mt-1 text-sm text-slate-500">{course._count.modules} chương · {course._count.tests} bài test · {course._count.enrollments} học viên</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{course.status}</span></div></Link>)}{courses.length === 0 ? <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">Chưa có khóa học nào.</p> : null}</div>
        </section>
      </div>
    </main>
  );
}

function ReportBarChart({ data }: { data: Array<{ label: string; value: number }> }) {
  const max = Math.max(1, ...data.map((item) => item.value));
  return <div><h3 className="text-sm font-bold text-slate-800">Báo cáo theo tuần</h3><div className="mt-3 flex h-48 items-end gap-2 rounded-xl bg-slate-50 p-4" role="img" aria-label="Biểu đồ cột số báo cáo theo tuần">{data.map((item) => <div key={item.label} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><span className="text-xs font-bold text-slate-700">{item.value}</span><div className="w-full rounded-t bg-red-500" style={{ height: `${Math.max(3, (item.value / max) * 100)}%` }} /><span className="text-[10px] text-slate-500">{item.label}</span></div>)}</div></div>;
}

function Metric({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: "emerald" | "blue" | "slate" | "amber" }) {
  const toneClass = { emerald: "border-emerald-200 bg-emerald-50 text-emerald-950", blue: "border-blue-200 bg-blue-50 text-blue-950", slate: "border-slate-200 bg-white text-slate-950", amber: "border-amber-200 bg-amber-50 text-amber-950" }[tone];
  return <article className={`rounded-2xl border p-4 shadow-sm ${toneClass}`}><p className="text-xs font-semibold uppercase opacity-70">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p><p className="mt-1 text-xs opacity-75">{detail}</p></article>;
}
