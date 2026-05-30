"use client";

import { useEffect, useMemo, useState } from "react";
import type { AnalyticsPayload, AnalyticsPreset } from "@/lib/admin-analytics";

type Props = {
  initialData: AnalyticsPayload;
};

type GrowthMode = "day" | "week" | "month" | "year";

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
  { key: "CUSTOM", label: "Tuỳ chọn" },
];

function formatNumber(value: number, digits = 0) {
  return new Intl.NumberFormat("vi-VN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

function percent(value: number) {
  return `${formatNumber(value, 2)}%`;
}

function chartBounds(data: SeriesPoint[]) {
  const max = Math.max(...data.map((point) => point.value), 1);
  return { max };
}

function buildLinePath(data: SeriesPoint[], width: number, height: number) {
  if (data.length === 0) return "";
  const { max } = chartBounds(data);
  const stepX = data.length > 1 ? width / (data.length - 1) : width;

  return data
    .map((point, index) => {
      const x = index * stepX;
      const y = height - (point.value / max) * height;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function buildAreaPath(data: SeriesPoint[], width: number, height: number) {
  const linePath = buildLinePath(data, width, height);
  if (!linePath || data.length === 0) return "";
  return `${linePath} L ${width} ${height} L 0 ${height} Z`;
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm backdrop-blur">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

function KpiCard({
  title,
  value,
  subtitle,
  tone = "slate",
}: {
  title: string;
  value: string;
  subtitle?: string;
  tone?: "slate" | "emerald" | "sky" | "orange" | "rose";
}) {
  const tones: Record<string, string> = {
    slate: "from-slate-50 to-slate-100 text-slate-800",
    emerald: "from-emerald-50 to-emerald-100 text-emerald-800",
    sky: "from-sky-50 to-sky-100 text-sky-800",
    orange: "from-orange-50 to-orange-100 text-orange-800",
    rose: "from-rose-50 to-rose-100 text-rose-800",
  };
  return (
    <article className={`rounded-xl border border-slate-200/80 bg-gradient-to-br p-4 ${tones[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide">{title}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      {subtitle ? <p className="mt-1 text-xs opacity-80">{subtitle}</p> : null}
    </article>
  );
}

function LineChart({ data, color = "#0f766e" }: { data: SeriesPoint[]; color?: string }) {
  const width = 680;
  const height = 260;
  const path = buildLinePath(data, width, height);
  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height + 30}`} className="h-72 w-full min-w-[620px]">
        <path d={path} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" />
        {data.map((point, index) => {
          const max = Math.max(...data.map((item) => item.value), 1);
          const stepX = data.length > 1 ? width / (data.length - 1) : width;
          const x = index * stepX;
          const y = height - (point.value / max) * height;
          return <circle key={`${point.label}-${index}`} cx={x} cy={y} r={3} fill={color} />;
        })}
      </svg>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-500 md:grid-cols-4">
        {data.slice(-8).map((item) => (
          <div key={item.label} className="rounded-md bg-slate-50 px-2 py-1">
            {item.label}: {formatNumber(item.value)}
          </div>
        ))}
      </div>
    </div>
  );
}

function AreaChart({ data, color = "#0891b2" }: { data: SeriesPoint[]; color?: string }) {
  const width = 680;
  const height = 260;
  const linePath = buildLinePath(data, width, height);
  const areaPath = buildAreaPath(data, width, height);
  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height + 20}`} className="h-72 w-full min-w-[620px]">
        <defs>
          <linearGradient id="area-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.45" />
            <stop offset="100%" stopColor={color} stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#area-gradient)" />
        <path d={linePath} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" />
      </svg>
    </div>
  );
}

function BarChart({ data, color = "bg-cyan-500" }: { data: SeriesPoint[]; color?: string }) {
  const max = Math.max(...data.map((item) => item.value), 1);
  return (
    <div className="space-y-2">
      {data.slice(0, 10).map((item) => (
        <div key={item.label}>
          <div className="mb-1 flex justify-between text-xs text-slate-600">
            <span>{item.label}</span>
            <span>{formatNumber(item.value)}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100">
            <div className={`h-2 rounded-full ${color}`} style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function DoughnutChart({
  values,
}: {
  values: Array<{ label: string; value: number; color: string }>;
}) {
  const total = values.reduce((sum, item) => sum + item.value, 0);
  const gradientStops: string[] = [];
  let current = 0;
  for (const item of values) {
    const percentage = total ? (item.value / total) * 100 : 0;
    gradientStops.push(`${item.color} ${current}% ${current + percentage}%`);
    current += percentage;
  }
  const background = `conic-gradient(${gradientStops.join(", ")})`;

  return (
    <div className="flex flex-col items-center gap-4 md:flex-row md:items-start">
      <div className="relative h-44 w-44 rounded-full" style={{ background }}>
        <div className="absolute inset-7 rounded-full bg-white" />
        <div className="absolute inset-0 flex items-center justify-center text-lg font-bold text-slate-800">
          {formatNumber(total)}
        </div>
      </div>
      <div className="w-full space-y-2">
        {values.map((item) => (
          <div key={item.label} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              <span>{item.label}</span>
            </div>
            <span className="font-semibold">{formatNumber(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Heatmap({ values }: { values: number[][] }) {
  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[580px] grid-cols-24 gap-1">
        {values.flatMap((row, rowIndex) =>
          row.map((value, columnIndex) => (
            <div
              key={`${rowIndex}-${columnIndex}`}
              className="h-5 rounded-sm"
              style={{
                backgroundColor: `hsl(193 85% ${95 - value * 0.55}%)`,
              }}
              title={`Day ${rowIndex + 1}, Hour ${columnIndex}: ${formatNumber(value, 0)}%`}
            />
          )),
        )}
      </div>
    </div>
  );
}

function SimpleTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: Array<Array<string | number>>;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-3 py-2 font-semibold">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={`row-${rowIndex}`} className="border-t border-slate-100">
              {row.map((cell, cellIndex) => (
                <td key={`${rowIndex}-${cellIndex}`} className="px-3 py-2 text-slate-700">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function convertJsonToCsvRows(data: AnalyticsPayload) {
  const lines: string[] = [];
  lines.push("Section,Metric,Value");
  lines.push(`Range,From,${data.range.start}`);
  lines.push(`Range,To,${data.range.end}`);
  lines.push(`Users,Total Users,${data.overview.users.totalUsers}`);
  lines.push(`Users,New Users,${data.overview.users.newUsers}`);
  lines.push(`Courses,Total Courses,${data.overview.courses.totalCourses}`);
  lines.push(`Revenue,Total Revenue,${data.overview.revenue.totalRevenue}`);
  lines.push(`Revenue,Successful Transactions,${data.overview.revenue.successfulTransactions}`);
  lines.push(`AI,Total Assessments,${data.overview.aiAssessment.totalAssessments}`);
  lines.push(`Tests,Attempts,${data.overview.tests.totalAttempts}`);
  lines.push(`Points,Issued,${data.pointAnalytics.issued}`);
  lines.push(`Points,Used,${data.pointAnalytics.used}`);
  return lines.join("\n");
}

function downloadBlob(filename: string, content: BlobPart, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function AnalyticsDashboard({ initialData }: Props) {
  const [data, setData] = useState(initialData);
  const [preset, setPreset] = useState<AnalyticsPreset>(initialData.range.preset);
  const [fromDate, setFromDate] = useState(initialData.range.start.slice(0, 10));
  const [toDate, setToDate] = useState(initialData.range.end.slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [growthMode, setGrowthMode] = useState<GrowthMode>("day");

  const growthSeries = useMemo(() => {
    if (growthMode === "day") return data.userGrowth.byDay;
    if (growthMode === "week") return data.userGrowth.byWeek;
    if (growthMode === "month") return data.userGrowth.byMonth;
    return data.userGrowth.byYear;
  }, [data.userGrowth, growthMode]);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams();
        params.set("preset", preset);
        if (preset === "CUSTOM") {
          params.set("from", fromDate);
          params.set("to", toDate);
        }
        const response = await fetch(`/api/admin/analytics?${params.toString()}`, {
          signal: controller.signal,
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          setError(body?.error || "Không thể tải dữ liệu analytics.");
          return;
        }
        if (body?.data) {
          setData(body.data as AnalyticsPayload);
        }
      } catch (fetchError) {
        if ((fetchError as Error).name !== "AbortError") {
          setError("Không thể tải dữ liệu analytics.");
        }
      } finally {
        setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, [preset, fromDate, toDate]);

  async function exportCsv() {
    const csv = convertJsonToCsvRows(data);
    downloadBlob(`analytics-${data.range.label}.csv`, csv, "text/csv;charset=utf-8;");
  }

  async function exportXlsx() {
    const XLSX = await import("xlsx");
    const worksheet = XLSX.utils.json_to_sheet([
      { Section: "Range", Metric: "From", Value: data.range.start },
      { Section: "Range", Metric: "To", Value: data.range.end },
      { Section: "Users", Metric: "Total Users", Value: data.overview.users.totalUsers },
      { Section: "Courses", Metric: "Total Courses", Value: data.overview.courses.totalCourses },
      { Section: "Revenue", Metric: "Total Revenue", Value: data.overview.revenue.totalRevenue },
      { Section: "AI", Metric: "Total Assessments", Value: data.overview.aiAssessment.totalAssessments },
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Analytics");
    XLSX.writeFile(workbook, `analytics-${data.range.label}.xlsx`);
  }

  async function exportPdf() {
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("E-Learning Analytics Report", 14, 16);
    doc.setFontSize(10);
    doc.text(`Range: ${data.range.label}`, 14, 24);

    autoTable(doc, {
      startY: 30,
      head: [["Section", "Metric", "Value"]],
      body: [
        ["Users", "Total", String(data.overview.users.totalUsers)],
        ["Users", "New", String(data.overview.users.newUsers)],
        ["Courses", "Total", String(data.overview.courses.totalCourses)],
        ["Revenue", "Total", String(data.overview.revenue.totalRevenue)],
        ["Tests", "Attempts", String(data.overview.tests.totalAttempts)],
        ["AI", "Assessments", String(data.overview.aiAssessment.totalAssessments)],
      ],
    });

    doc.save(`analytics-${data.range.label}.pdf`);
  }

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-slate-200/80 bg-gradient-to-r from-cyan-50 via-white to-emerald-50 p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 [font-family:var(--font-space-grotesk)]">System Analytics Dashboard</h1>
            <p className="mt-2 text-sm text-slate-600">
              Khoảng thời gian: <span className="font-semibold">{data.range.label}</span>
            </p>
            <p className="text-xs text-slate-500">Cập nhật lần cuối: {new Date(data.generatedAt).toLocaleString("vi-VN")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setPreset(item.key)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  preset === item.key
                    ? "bg-slate-900 text-white shadow"
                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        {preset === "CUSTOM" ? (
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <label className="text-sm text-slate-600">
              Từ ngày
              <input
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
                className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm text-slate-600">
              Đến ngày
              <input
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
                className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
          </div>
        ) : null}
        {loading ? <p className="mt-3 text-sm text-cyan-700">Đang tải dữ liệu...</p> : null}
        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Tổng người dùng" value={formatNumber(data.overview.users.totalUsers)} subtitle={`Mới: ${formatNumber(data.overview.users.newUsers)}`} tone="sky" />
        <KpiCard title="Tổng khóa học" value={formatNumber(data.overview.courses.totalCourses)} subtitle={`Mới: ${formatNumber(data.overview.courses.newCourses)}`} tone="emerald" />
        <KpiCard title="Tổng lượt làm bài" value={formatNumber(data.overview.tests.totalAttempts)} subtitle={`Đậu TB: ${percent(data.overview.tests.passRate)}`} tone="orange" />
        <KpiCard title="Tổng doanh thu" value={formatCurrency(data.overview.revenue.totalRevenue)} subtitle={`GD thành công: ${formatNumber(data.overview.revenue.successfulTransactions)}`} tone="rose" />
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Panel title="Tăng trưởng người dùng" subtitle="Theo ngày / tuần / tháng / năm">
          <div className="mb-4 flex flex-wrap gap-2">
            {(["day", "week", "month", "year"] as GrowthMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setGrowthMode(mode)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold uppercase ${
                  growthMode === mode ? "bg-cyan-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
          <LineChart data={growthSeries} color="#0891b2" />
        </Panel>

        <Panel title="Doanh thu theo thời gian" subtitle="Area chart từ Payment.amount (SUCCESS)">
          <AreaChart data={data.revenueAnalytics.revenueByTime} color="#0d9488" />
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Panel title="Course Analytics" subtitle="Top phổ biến và doanh thu">
          <SimpleTable
            headers={["Khóa học", "Học viên", "Doanh thu", "Đánh giá", "Tỷ lệ HT"]}
            rows={data.courseAnalytics.topPopularCourses.slice(0, 8).map((item) => [
              item.courseName,
              formatNumber(item.learners),
              formatCurrency(item.revenue),
              formatNumber(item.reviews),
              `${item.completionRate}%`,
            ])}
          />
        </Panel>

        <Panel title="Enrollment Analytics" subtitle="Lượt ghi danh theo thời gian + top">
          <LineChart data={data.enrollmentAnalytics.byTime} color="#2563eb" />
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700">Top khóa học</p>
              <BarChart
                data={data.enrollmentAnalytics.topCourses.slice(0, 6).map((item) => ({
                  label: item.courseName,
                  value: item.enrollments,
                }))}
                color="bg-blue-500"
              />
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700">Top giảng viên</p>
              <BarChart
                data={data.enrollmentAnalytics.topInstructors.slice(0, 6).map((item) => ({
                  label: item.instructorName,
                  value: item.students,
                }))}
                color="bg-indigo-500"
              />
            </div>
          </div>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Panel title="Test Analytics" subtitle="Lượt làm bài, tỷ lệ đậu, điểm trung bình">
          <LineChart data={data.testAnalytics.attemptsByTime} color="#7c3aed" />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <KpiCard title="Đậu" value={formatNumber(data.testAnalytics.passFail.passed)} tone="emerald" />
            <KpiCard title="Trượt" value={formatNumber(data.testAnalytics.passFail.failed)} tone="rose" />
          </div>
          <div className="mt-4">
            <SimpleTable
              headers={["Top bài thi", "Lượt làm", "Điểm TB (%)"]}
              rows={data.testAnalytics.topTests.slice(0, 5).map((item) => [
                item.name,
                formatNumber(item.attempts),
                formatNumber(item.averageScore, 2),
              ])}
            />
          </div>
        </Panel>

        <Panel title="AI Assessment Analytics" subtitle="Type, band histogram, lỗi phổ biến">
          <div className="grid gap-3 sm:grid-cols-2">
            <KpiCard title="Speaking" value={formatNumber(data.aiAnalytics.totalsByType.speaking)} tone="sky" />
            <KpiCard title="Writing" value={formatNumber(data.aiAnalytics.totalsByType.writing)} tone="orange" />
            <KpiCard title="Reading" value={formatNumber(data.aiAnalytics.totalsByType.reading)} />
            <KpiCard title="Listening" value={formatNumber(data.aiAnalytics.totalsByType.listening)} />
          </div>
          <div className="mt-4">
            <p className="mb-2 text-sm font-semibold text-slate-700">Band score histogram</p>
            <BarChart
              data={data.aiAnalytics.bandHistogram.map((item) => ({
                label: `Band ${item.band}`,
                value: item.count,
              }))}
              color="bg-violet-500"
            />
          </div>
          <div className="mt-4">
            <p className="mb-2 text-sm font-semibold text-slate-700">Điểm AI trung bình theo tháng</p>
            <LineChart data={data.aiAnalytics.averageScoreByMonth} color="#7c3aed" />
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <SimpleTable
              headers={["Top lỗi", "Số lần"]}
              rows={data.aiAnalytics.topMistakes.slice(0, 5).map((item) => [item.mistake, formatNumber(item.count)])}
            />
            <SimpleTable
              headers={["Tiêu chí bị trừ", "Điểm trừ"]}
              rows={data.aiAnalytics.topCriteriaPenalty.slice(0, 5).map((item) => [item.criteria, formatNumber(item.penalty, 2)])}
            />
          </div>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Panel title="Teacher Application Analytics" subtitle="Trạng thái hồ sơ và tỷ lệ duyệt">
          <DoughnutChart
            values={data.teacherApplicationAnalytics.status.map((item, index) => ({
              label: item.status,
              value: item.count,
              color: ["#0ea5e9", "#f59e0b", "#a855f7", "#22c55e", "#ef4444", "#6b7280"][index % 6],
            }))}
          />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <KpiCard title="Tỷ lệ duyệt" value={percent(data.teacherApplicationAnalytics.approvalRate)} tone="emerald" />
            <KpiCard title="TG xét duyệt TB" value={`${formatNumber(data.teacherApplicationAnalytics.avgReviewHours, 1)} giờ`} tone="orange" />
          </div>
        </Panel>

        <Panel title="Anti Cheat Analytics" subtitle="Top hành vi và xu hướng theo thời gian">
          <div className="grid gap-3 sm:grid-cols-2">
            <KpiCard title="Tổng vi phạm" value={formatNumber(data.antiCheatAnalytics.totalViolations)} tone="rose" />
            <KpiCard title="Mức độ TB" value={formatNumber(data.antiCheatAnalytics.averageSeverity, 2)} tone="orange" />
            <KpiCard title="Bài thi gian lận" value={formatNumber(data.antiCheatAnalytics.cheatingTests)} />
            <KpiCard title="Ứng viên gian lận" value={formatNumber(data.antiCheatAnalytics.cheatingCandidates)} />
          </div>
          <div className="mt-4">
            <LineChart data={data.antiCheatAnalytics.trendByTime} color="#dc2626" />
          </div>
          <div className="mt-4">
            <SimpleTable
              headers={["Hành vi", "Số lần"]}
              rows={data.antiCheatAnalytics.topBehaviors.slice(0, 6).map((item) => [item.name, formatNumber(item.value)])}
            />
          </div>
        </Panel>
      </section>

      <Panel title="Learning Activity Heatmap" subtitle="Ngày học nhiều nhất, giờ cao điểm, hoạt động theo ngày">
        <Heatmap values={data.learningActivityAnalytics.heatmap} />
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <KpiCard
            title="Ngày cao điểm"
            value={data.learningActivityAnalytics.mostActiveDay?.day ?? "-"}
            subtitle={`Số hoạt động: ${formatNumber(data.learningActivityAnalytics.mostActiveDay?.count ?? 0)}`}
            tone="sky"
          />
          <KpiCard
            title="Giờ cao điểm"
            value={
              data.learningActivityAnalytics.peakHour
                ? `${String(data.learningActivityAnalytics.peakHour.hour).padStart(2, "0")}:00`
                : "-"
            }
            subtitle={`Số hoạt động: ${formatNumber(data.learningActivityAnalytics.peakHour?.count ?? 0)}`}
            tone="emerald"
          />
          <KpiCard title="Tổng hoạt động" value={formatNumber(data.overview.learning.learningActivities)} tone="orange" />
        </div>
      </Panel>

      <section className="grid gap-5 xl:grid-cols-3">
        <Panel title="Point System Analytics" subtitle="Điểm đã phát, đã dùng, tăng trưởng">
          <div className="grid gap-3 sm:grid-cols-2">
            <KpiCard title="Điểm đã phát" value={formatNumber(data.pointAnalytics.issued)} tone="emerald" />
            <KpiCard title="Điểm đã dùng" value={formatNumber(data.pointAnalytics.used)} tone="rose" />
            <KpiCard title="TB mỗi học viên" value={formatNumber(data.pointAnalytics.averagePerStudent, 2)} tone="sky" />
            <KpiCard title="Top học viên" value={data.pointAnalytics.topStudents[0]?.username ?? "-"} subtitle={`${formatNumber(data.pointAnalytics.topStudents[0]?.points ?? 0)} điểm`} />
          </div>
          <div className="mt-4">
            <AreaChart data={data.pointAnalytics.growthSeries} color="#16a34a" />
          </div>
        </Panel>

        <Panel title="Notification & Email" subtitle="Theo dõi thông báo và email hệ thống">
          <div className="grid gap-3 sm:grid-cols-2">
            <KpiCard title="Thông báo đã gửi" value={formatNumber(data.notificationEmailAnalytics.notificationsSent)} tone="sky" />
            <KpiCard title="Email đã gửi" value={formatNumber(data.notificationEmailAnalytics.emailsSent)} tone="emerald" />
            <KpiCard title="Email lỗi" value={formatNumber(data.notificationEmailAnalytics.emailFailed)} tone="rose" />
            <KpiCard title="Tỷ lệ lỗi" value={percent(data.notificationEmailAnalytics.emailErrorRate)} tone="orange" />
          </div>
          <div className="mt-4">
            <DoughnutChart
              values={[
                { label: "Success", value: data.notificationEmailAnalytics.emailSuccess, color: "#22c55e" },
                { label: "Failed", value: data.notificationEmailAnalytics.emailFailed, color: "#ef4444" },
              ]}
            />
          </div>
        </Panel>

        <Panel title="Learning Language Analytics" subtitle="Phân bố học viên, khóa học, bài thi">
          <div className="grid gap-3 sm:grid-cols-3">
            <KpiCard
              title="Ngôn ngữ phổ biến"
              value={data.languageAnalytics.mostPopularLanguage?.name ?? "-"}
              subtitle={`${formatNumber(data.languageAnalytics.mostPopularLanguage?.value ?? 0)} học viên`}
              tone="orange"
            />
            <KpiCard title="Số ngôn ngữ active" value={formatNumber(data.languageAnalytics.studentsByLanguage.length)} tone="sky" />
            <KpiCard title="Theo range đã chọn" value={data.range.label} tone="slate" />
          </div>
          <div className="mt-4 grid gap-3">
            <BarChart data={data.languageAnalytics.studentsByLanguage.slice(0, 5).map((item) => ({ label: item.name, value: item.value }))} color="bg-cyan-500" />
            <BarChart data={data.languageAnalytics.coursesByLanguage.slice(0, 5).map((item) => ({ label: item.name, value: item.value }))} color="bg-emerald-500" />
            <BarChart data={data.languageAnalytics.testsByLanguage.slice(0, 5).map((item) => ({ label: item.name, value: item.value }))} color="bg-violet-500" />
          </div>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <Panel title="Top 10 Học viên" subtitle="Học nhiều nhất / Điểm cao nhất / Điểm thưởng">
          <SimpleTable
            headers={["Tên", "Học nhiều", "Điểm cao nhất", "Điểm thưởng"]}
            rows={data.rankings.students.mostLearning.map((item, index) => [
              item.username,
              formatNumber(item.value),
              formatNumber(data.rankings.students.highestScore[index]?.value ?? 0, 2),
              formatNumber(data.rankings.students.mostBonusPoints[index]?.value ?? 0),
            ])}
          />
        </Panel>

        <Panel title="Top 10 Giáo viên" subtitle="Nhiều học viên / Nhiều khóa / Doanh thu cao">
          <SimpleTable
            headers={["Tên", "Học viên", "Khóa học", "Doanh thu"]}
            rows={data.rankings.teachers.mostStudents.map((item, index) => [
              item.username,
              formatNumber(item.value),
              formatNumber(data.rankings.teachers.mostCourses[index]?.value ?? 0),
              formatCurrency(data.rankings.teachers.highestRevenue[index]?.value ?? 0),
            ])}
          />
        </Panel>

        <Panel title="Top 10 Khóa học" subtitle="Doanh thu / Học viên / Đánh giá">
          <SimpleTable
            headers={["Khóa học", "Doanh thu", "Học viên", "Đánh giá"]}
            rows={data.rankings.courses.byRevenue.map((item, index) => [
              item.courseName,
              formatCurrency(item.value),
              formatNumber(data.rankings.courses.byStudents[index]?.value ?? 0),
              formatNumber(data.rankings.courses.byReviews[index]?.value ?? 0),
            ])}
          />
        </Panel>
      </section>

      <Panel title="Export Reports" subtitle="Xuất snapshot hiện tại của dashboard">
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => void exportCsv()} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
            Export CSV
          </button>
          <button type="button" onClick={() => void exportXlsx()} className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white">
            Export XLSX
          </button>
          <button type="button" onClick={() => void exportPdf()} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">
            Export PDF
          </button>
        </div>
      </Panel>
    </div>
  );
}
