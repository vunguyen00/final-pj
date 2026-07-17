"use client";

import type { ReactNode } from "react";
import type { AnalyticsPayload, AnalyticsPreset } from "@/lib/admin-analytics";

type SeriesPoint = { label: string; value: number };

const PRESETS: Array<{ key: AnalyticsPreset; label: string }> = [
  { key: "TODAY", label: "Hôm nay" },
  { key: "YESTERDAY", label: "Hôm qua" },
  { key: "LAST_7_DAYS", label: "7 ngày" },
  { key: "LAST_30_DAYS", label: "30 ngày" },
  { key: "THIS_WEEK", label: "Tuần này" },
  { key: "THIS_MONTH", label: "Tháng này" },
  { key: "THIS_QUARTER", label: "Quý này" },
  { key: "THIS_YEAR", label: "Năm này" },
  { key: "CUSTOM", label: "Tùy chọn" },
];

const MONEY = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });
const NUMBER = new Intl.NumberFormat("vi-VN");

function formatNumber(value: number) {
  return NUMBER.format(value);
}

function formatCurrency(value: number) {
  return MONEY.format(value);
}

function percent(value: number) {
  return `${value.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`;
}

function Panel({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-950">{title}</h3>
          {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function KpiCard({ label, value, detail, tone = "slate" }: { label: string; value: string; detail?: string; tone?: "slate" | "blue" | "emerald" | "amber" | "rose" }) {
  const toneClass = {
    slate: "border-slate-200 bg-slate-50 text-slate-950",
    blue: "border-blue-200 bg-blue-50 text-blue-950",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-950",
    amber: "border-amber-200 bg-amber-50 text-amber-950",
    rose: "border-rose-200 bg-rose-50 text-rose-950",
  }[tone];

  return (
    <article className={`rounded-lg border p-4 ${toneClass}`}>
      <p className="text-xs font-bold uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-2 break-words text-2xl font-black">{value}</p>
      {detail ? <p className="mt-1 text-xs opacity-75">{detail}</p> : null}
    </article>
  );
}

function BarList({ data, valueLabel, color = "bg-blue-600" }: { data: SeriesPoint[]; valueLabel?: (value: number) => string; color?: string }) {
  const max = Math.max(1, ...data.map((item) => item.value));
  const rows = data.slice(0, 8);

  if (rows.length === 0) {
    return <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">Chưa có dữ liệu trong khoảng này.</p>;
  }

  return (
    <div className="space-y-3">
      {rows.map((item) => (
        <div key={item.label}>
          <div className="mb-1 flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-semibold text-slate-700">{item.label}</span>
            <span className="shrink-0 font-bold text-slate-950">{valueLabel ? valueLabel(item.value) : formatNumber(item.value)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(3, (item.value / max) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function DataTable({ headers, rows }: { headers: string[]; rows: Array<Array<string | number>> }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>{headers.map((header) => <th key={header} className="px-3 py-2 font-bold">{header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length ? rows.map((row, rowIndex) => (
            <tr key={`row-${rowIndex}`} className="border-t border-slate-100">
              {row.map((cell, cellIndex) => <td key={`${rowIndex}-${cellIndex}`} className="px-3 py-2 text-slate-700">{cell}</td>)}
            </tr>
          )) : (
            <tr>
              <td colSpan={headers.length} className="px-3 py-8 text-center text-slate-500">Chưa có dữ liệu.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function AnalyticsHeader({
  data,
  preset,
  fromDate,
  toDate,
  loading,
  error,
  onPresetChange,
  onFromDateChange,
  onToDateChange,
}: {
  data: AnalyticsPayload;
  preset: AnalyticsPreset;
  fromDate: string;
  toDate: string;
  loading: boolean;
  error: string;
  onPresetChange: (preset: AnalyticsPreset) => void;
  onFromDateChange: (value: string) => void;
  onToDateChange: (value: string) => void;
}) {
  return (
    <header className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-950">Thống kê quản trị</h1>
          <p className="mt-2 text-sm text-slate-600">Khoảng thời gian: <span className="font-bold">{data.range.label}</span></p>
          <p className="mt-1 text-xs text-slate-500">Cập nhật: {new Date(data.generatedAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => onPresetChange(item.key)}
              className={`rounded-md px-3 py-2 text-sm font-bold transition ${preset === item.key ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      {preset === "CUSTOM" ? (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <label className="text-sm font-semibold text-slate-600">
            Từ ngày
            <input type="date" value={fromDate} onChange={(event) => onFromDateChange(event.target.value)} className="mt-1 block rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </label>
          <label className="text-sm font-semibold text-slate-600">
            Đến ngày
            <input type="date" value={toDate} onChange={(event) => onToDateChange(event.target.value)} className="mt-1 block rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </label>
        </div>
      ) : null}
      {loading ? <p className="mt-3 text-sm font-semibold text-blue-700">Đang tải dữ liệu...</p> : null}
      {error ? <p className="mt-3 text-sm font-semibold text-rose-600">{error}</p> : null}
    </header>
  );
}

export function OverviewKpis({ data }: { data: AnalyticsPayload }) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard label="Doanh thu khóa học" value={formatCurrency(data.overview.revenue.totalRevenue)} detail={`${formatNumber(data.overview.revenue.totalOrders)} đơn hàng`} tone="emerald" />
      <KpiCard label="Hoa hồng admin" value={formatCurrency(data.overview.revenue.adminRevenue)} detail={`Giảng viên: ${formatCurrency(data.overview.revenue.teacherRevenue)}`} tone="blue" />
      <KpiCard label="Yêu cầu rút tiền" value={formatNumber(data.overview.revenue.withdrawalCount)} detail={`Chờ xử lý: ${formatCurrency(data.overview.revenue.pendingWithdrawalAmount)}`} tone="amber" />
      <KpiCard label="Ngôn ngữ học nhiều nhất" value={data.languageAnalytics.mostPopularLanguage?.name ?? "-"} detail={`${formatNumber(data.languageAnalytics.mostPopularLanguage?.value ?? 0)} lượt ghi danh`} tone="rose" />
    </section>
  );
}

export function FinanceSection({ data }: { data: AnalyticsPayload }) {
  return (
    <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
      <Panel title="Tài chính" subtitle="Doanh thu khóa học, hoa hồng và nạp điểm AI">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <KpiCard label="Tổng doanh thu" value={formatCurrency(data.revenueAnalytics.totalRevenue)} tone="emerald" />
          <KpiCard label="Hoa hồng admin" value={formatCurrency(data.revenueAnalytics.adminRevenue)} tone="blue" />
          <KpiCard label="Hoa hồng giảng viên" value={formatCurrency(data.revenueAnalytics.teacherRevenue)} tone="amber" />
          <KpiCard label="Doanh thu điểm AI" value={formatCurrency(data.revenueAnalytics.walletTopUpRevenue)} />
          <KpiCard label="Giá trị đơn TB" value={formatCurrency(data.revenueAnalytics.averageOrderValue)} />
          <KpiCard label="Giao dịch khóa học" value={formatNumber(data.overview.revenue.successfulTransactions)} />
        </div>
        <div className="mt-5">
          <BarList data={data.revenueAnalytics.revenueByTime} valueLabel={formatCurrency} color="bg-emerald-600" />
        </div>
      </Panel>

      <Panel title="Rút doanh thu" subtitle="Theo trạng thái xử lý yêu cầu của giảng viên">
        <div className="grid gap-3 sm:grid-cols-2">
          <KpiCard label="Tổng yêu cầu" value={formatNumber(data.revenueAnalytics.withdrawalCount)} detail={formatCurrency(data.revenueAnalytics.withdrawalAmount)} tone="amber" />
          <KpiCard label="Đã chuyển" value={formatCurrency(data.revenueAnalytics.withdrawalPaidAmount)} tone="emerald" />
          <KpiCard label="Đang chờ" value={formatCurrency(data.revenueAnalytics.withdrawalPendingAmount)} tone="rose" />
          <KpiCard label="Đã duyệt" value={formatCurrency(data.revenueAnalytics.withdrawalApprovedAmount)} tone="blue" />
        </div>
        <div className="mt-5">
          <DataTable
            headers={["Trạng thái", "Số lần", "Số tiền"]}
            rows={data.revenueAnalytics.withdrawalsByStatus.map((item) => [item.status, formatNumber(item.count), formatCurrency(item.amount)])}
          />
        </div>
      </Panel>
    </section>
  );
}

export function CourseAndLanguageSection({ data }: { data: AnalyticsPayload }) {
  return (
    <section className="grid gap-5 xl:grid-cols-2">
      <Panel title="Khóa học bán tốt" subtitle="Ưu tiên số lượt bán và doanh thu">
        <DataTable
          headers={["Khóa học", "Lượt bán", "Doanh thu"]}
          rows={data.revenueAnalytics.topSellingCourses.map((item) => [item.courseName, formatNumber(item.units), formatCurrency(item.revenue)])}
        />
      </Panel>

      <Panel title="Ngôn ngữ được học nhiều nhất" subtitle="Tính theo lượt ghi danh khóa học trong khoảng đã chọn">
        <BarList data={data.languageAnalytics.enrollmentsByLanguage.map((item) => ({ label: item.name, value: item.value }))} color="bg-rose-600" />
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <KpiCard label="Khóa học mới" value={formatNumber(data.overview.courses.newCourses)} detail={`Tổng: ${formatNumber(data.overview.courses.totalCourses)}`} tone="blue" />
          <KpiCard label="Khóa đang mở" value={formatNumber(data.overview.courses.activeCourses)} detail={`Khóa bị khóa: ${formatNumber(data.overview.courses.lockedCourses)}`} tone="emerald" />
        </div>
      </Panel>
    </section>
  );
}

export function UserAndEnrollmentSection({ data }: { data: AnalyticsPayload }) {
  return (
    <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
      <Panel title="Người dùng" subtitle="Quy mô học sinh, giảng viên và tài khoản mới">
        <div className="grid gap-3 sm:grid-cols-2">
          <KpiCard label="Tổng người dùng" value={formatNumber(data.overview.users.totalUsers)} detail={`Mới: ${formatNumber(data.overview.users.newUsers)}`} tone="blue" />
          <KpiCard label="Học sinh" value={formatNumber(data.overview.users.students)} tone="emerald" />
          <KpiCard label="Giảng viên" value={formatNumber(data.overview.users.teachers)} tone="amber" />
          <KpiCard label="Tăng trưởng" value={percent(data.overview.users.growthRate)} />
        </div>
      </Panel>

      <Panel title="Ghi danh và khóa học phổ biến" subtitle="Theo lượt ghi danh thực tế">
        <div className="grid gap-5 lg:grid-cols-2">
          <BarList data={data.enrollmentAnalytics.topCourses.map((item) => ({ label: item.courseName, value: item.enrollments }))} color="bg-blue-600" />
          <DataTable
            headers={["Khóa học", "Học viên", "Doanh thu", "Hoàn thành"]}
            rows={data.courseAnalytics.topPopularCourses.slice(0, 6).map((item) => [
              item.courseName,
              formatNumber(item.learners),
              formatCurrency(item.revenue),
              percent(item.completionRate),
            ])}
          />
        </div>
      </Panel>
    </section>
  );
}

export function ExportReportsPanel({
  onExportCsv,
  onExportXlsx,
  onExportPdf,
}: {
  onExportCsv: () => void;
  onExportXlsx: () => void;
  onExportPdf: () => void;
}) {
  return (
    <Panel title="Xuất báo cáo" subtitle="Tải snapshot thống kê hiện tại">
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={onExportCsv} className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-bold text-white">CSV</button>
        <button type="button" onClick={onExportXlsx} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white">XLSX</button>
        <button type="button" onClick={onExportPdf} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white">PDF</button>
      </div>
    </Panel>
  );
}
