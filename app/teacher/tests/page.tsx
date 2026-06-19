import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RevenueWithdrawalPanel } from "@/app/teacher/tests/RevenueWithdrawalPanel";
import { calculateAvailableTeacherRevenue, RESERVED_WITHDRAWAL_STATUSES } from "@/lib/teacher-revenue";

export const metadata = {
  title: "Doanh thu giảng viên | FinnCenter",
};

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "medium",
  timeStyle: "short",
});

const statusUi: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: "Đang mở", className: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  LOCKED: { label: "Đã khóa", className: "bg-slate-100 text-slate-700 ring-slate-200" },
  PENDING_APPROVAL: { label: "Chờ duyệt", className: "bg-amber-50 text-amber-700 ring-amber-200" },
  REJECTED: { label: "Bị từ chối", className: "bg-rose-50 text-rose-700 ring-rose-200" },
};

function formatCurrency(value: number) {
  return currencyFormatter.format(Math.round(value));
}

function formatDate(value: Date | null) {
  return value ? dateFormatter.format(value) : "-";
}

function getMonthStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export default async function TeacherRevenuePage() {
  const user = await requireRole("TEACHER", "ADMIN");

  if (user.role === "ADMIN") {
    redirect("/admin");
  }

  const [courses, orderItems, withdrawals, reservedWithdrawals, revenueNotifications] = await Promise.all([
    prisma.course.findMany({
      where: { instructorId: user.id },
      select: {
        id: true,
        name: true,
        price: true,
        status: true,
        createdAt: true,
        _count: { select: { enrollments: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.orderItem.findMany({
      where: { course: { instructorId: user.id } },
      select: {
        id: true,
        courseId: true,
        price: true,
        adminRevenue: true,
        teacherRevenue: true,
        revenueSplit: true,
        course: { select: { name: true } },
        order: {
          select: {
            createdAt: true,
            user: { select: { username: true, email: true } },
          },
        },
      },
    }),
    prisma.teacherRevenueWithdrawal.findMany({
      where: { teacherId: user.id },
      select: {
        id: true,
        amount: true,
        bankName: true,
        accountNumber: true,
        accountName: true,
        status: true,
        note: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.teacherRevenueWithdrawal.aggregate({
      where: {
        teacherId: user.id,
        status: { in: [...RESERVED_WITHDRAWAL_STATUSES] },
      },
      _sum: { amount: true },
    }),
    prisma.notification.findMany({
      where: {
        userId: user.id,
        title: { contains: "doanh thu", mode: "insensitive" },
      },
      select: { id: true, title: true, body: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const monthStart = getMonthStart();
  const totalGross = orderItems.reduce((sum, item) => sum + item.price, 0);
  const totalTeacherRevenue = orderItems.reduce((sum, item) => sum + item.teacherRevenue, 0);
  const reservedRevenue = reservedWithdrawals._sum.amount ?? 0;
  const availableRevenue = calculateAvailableTeacherRevenue(totalTeacherRevenue, reservedRevenue);
  const totalAdminRevenue = orderItems.reduce((sum, item) => sum + item.adminRevenue, 0);
  const monthTeacherRevenue = orderItems
    .filter((item) => item.order.createdAt >= monthStart)
    .reduce((sum, item) => sum + item.teacherRevenue, 0);
  const totalEnrollments = courses.reduce((sum, course) => sum + course._count.enrollments, 0);

  const courseRows = courses.map((course) => {
    const courseItems = orderItems.filter((item) => item.courseId === course.id);
    const gross = courseItems.reduce((sum, item) => sum + item.price, 0);
    const teacherRevenue = courseItems.reduce((sum, item) => sum + item.teacherRevenue, 0);
    const adminRevenue = courseItems.reduce((sum, item) => sum + item.adminRevenue, 0);
    const lastSale =
      courseItems.length > 0
        ? courseItems.reduce<Date | null>((latest, item) => {
            if (!latest || item.order.createdAt > latest) return item.order.createdAt;
            return latest;
          }, null)
        : null;

    return {
      ...course,
      gross,
      teacherRevenue,
      adminRevenue,
      paidOrders: courseItems.length,
      lastSale,
    };
  });

  const recentOrders = [...orderItems]
    .sort((a, b) => b.order.createdAt.getTime() - a.order.createdAt.getTime())
    .slice(0, 8);

  return (
    <main className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase text-blue-600">Teacher revenue</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-950">Doanh thu cá nhân</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Theo dõi doanh thu thực nhận từ các khóa học của bạn. Hệ thống ghi nhận phần chia doanh thu khi học viên mua khóa học.
            </p>
          </div>
          <Link href="/teacher/courses" className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            Quản lý khóa học
          </Link>
        </div>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Doanh thu thực nhận" value={formatCurrency(totalTeacherRevenue)} hint="Tổng phần giảng viên nhận" tone="emerald" />
          <SummaryCard label="Tháng này" value={formatCurrency(monthTeacherRevenue)} hint="Từ đầu tháng hiện tại" tone="blue" />
          <SummaryCard label="Tổng doanh số" value={formatCurrency(totalGross)} hint={`Doanh số khóa học thu về ${formatCurrency(totalAdminRevenue)}`} tone="slate" />
          <SummaryCard label="Lượt mua / học viên" value={`${orderItems.length} / ${totalEnrollments}`} hint={`${courses.length} khóa học đang quản lý`} tone="amber" />
        </section>

        <RevenueWithdrawalPanel
          availableRevenue={availableRevenue}
          withdrawals={withdrawals.map((item) => ({
            ...item,
            createdAt: item.createdAt.toISOString(),
          }))}
          notifications={revenueNotifications.map((item) => ({
            ...item,
            createdAt: item.createdAt.toISOString(),
          }))}
        />

        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-bold text-slate-950">Doanh thu theo khóa học</h2>
            <p className="mt-1 text-sm text-slate-500">Bao gồm doanh số, phần giảng viên nhận và thời điểm phát sinh giao dịch gần nhất.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Khóa học</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3">Giá</th>
                  <th className="px-4 py-3">Học viên</th>
                  <th className="px-4 py-3">Lượt mua</th>
                  <th className="px-4 py-3">Doanh số</th>
                  <th className="px-4 py-3">GV nhận</th>
                  <th className="px-4 py-3">Admin nhận</th>
                  <th className="px-4 py-3">Gần nhất</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {courseRows.map((course) => {
                  const ui = statusUi[course.status] ?? statusUi.LOCKED;

                  return (
                    <tr key={course.id} className="align-top hover:bg-slate-50/70">
                      <td className="px-4 py-4">
                        <Link href={`/teacher/courses/${course.id}`} className="font-semibold text-slate-950 hover:text-blue-700">
                          {course.name}
                        </Link>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${ui.className}`}>{ui.label}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 font-medium text-slate-700">{formatCurrency(course.price)}</td>
                      <td className="whitespace-nowrap px-4 py-4 text-slate-700">{course._count.enrollments}</td>
                      <td className="whitespace-nowrap px-4 py-4 text-slate-700">{course.paidOrders}</td>
                      <td className="whitespace-nowrap px-4 py-4 font-semibold text-slate-900">{formatCurrency(course.gross)}</td>
                      <td className="whitespace-nowrap px-4 py-4 font-semibold text-emerald-700">{formatCurrency(course.teacherRevenue)}</td>
                      <td className="whitespace-nowrap px-4 py-4 text-slate-600">{formatCurrency(course.adminRevenue)}</td>
                      <td className="whitespace-nowrap px-4 py-4 text-slate-500">{formatDate(course.lastSale)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {courseRows.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <h3 className="text-base font-semibold text-slate-950">Chưa có khóa học nào</h3>
              <p className="mt-1 text-sm text-slate-500">Tạo khóa học đầu tiên để bắt đầu ghi nhận doanh thu.</p>
            </div>
          ) : null}
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-950">Giao dịch gần đây</h2>
              <p className="text-sm text-slate-500">Các lượt mua mới nhất từ khóa học của bạn.</p>
            </div>
            <span className="text-xs font-semibold uppercase text-slate-400">Chia doanh thu 70/30</span>
          </div>

          <div className="mt-4 divide-y divide-slate-100">
            {recentOrders.map((item) => (
              <div key={item.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-slate-950">{item.course.name}</p>
                  <p className="text-sm text-slate-500">
                    {item.order.user.username} ({item.order.user.email}) - {formatDate(item.order.createdAt)}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm sm:text-right">
                  <div>
                    <p className="text-xs text-slate-500">Doanh số</p>
                    <p className="font-semibold text-slate-900">{formatCurrency(item.price)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">GV nhận</p>
                    <p className="font-semibold text-emerald-700">{formatCurrency(item.teacherRevenue)}</p>
                  </div>
                </div>
              </div>
            ))}

            {recentOrders.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">Chưa có giao dịch mua khóa học nào.</p> : null}
          </div>
        </section>
      </div>
    </main>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone: "emerald" | "blue" | "slate" | "amber";
}) {
  const toneMap = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    blue: "border-blue-200 bg-blue-50 text-blue-900",
    slate: "border-slate-200 bg-white text-slate-950",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
  };

  return (
    <article className={`rounded-2xl border p-4 shadow-sm ${toneMap[tone]}`}>
      <p className="text-xs font-semibold uppercase opacity-70">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      <p className="mt-1 text-xs opacity-75">{hint}</p>
    </article>
  );
}
