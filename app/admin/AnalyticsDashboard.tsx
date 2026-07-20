"use client";

import { useReducer, useRef } from "react";
import type { AnalyticsPayload, AnalyticsPreset } from "@/lib/admin-analytics";
import { loadDashboardAnalytics } from "./analytics-actions";
import {
  AnalyticsHeader,
  CourseAndLanguageSection,
  ExportReportsPanel,
  FinanceSection,
  OverviewKpis,
  ReportAndRefundSection,
  UserAndEnrollmentSection,
} from "./AnalyticsDashboardSections";

type Props = {
  initialData: AnalyticsPayload;
};

type DashboardState = {
  data: AnalyticsPayload;
  preset: AnalyticsPreset;
  fromDate: string;
  toDate: string;
  loading: boolean;
  error: string;
};

type DashboardAction =
  | { type: "SET_FILTERS"; preset: AnalyticsPreset; fromDate: string; toDate: string }
  | { type: "LOAD_START" }
  | { type: "LOAD_SUCCESS"; data: AnalyticsPayload }
  | { type: "LOAD_ERROR"; error: string };

function createInitialState(initialData: AnalyticsPayload): DashboardState {
  return {
    data: initialData,
    preset: initialData.range.preset,
    fromDate: initialData.range.start.slice(0, 10),
    toDate: initialData.range.end.slice(0, 10),
    loading: false,
    error: "",
  };
}

function dashboardReducer(state: DashboardState, action: DashboardAction): DashboardState {
  switch (action.type) {
    case "SET_FILTERS":
      return { ...state, preset: action.preset, fromDate: action.fromDate, toDate: action.toDate };
    case "LOAD_START":
      return { ...state, loading: true, error: "" };
    case "LOAD_SUCCESS":
      return {
        ...state,
        data: action.data,
        preset: action.data.range.preset,
        fromDate: action.data.range.start.slice(0, 10),
        toDate: action.data.range.end.slice(0, 10),
        loading: false,
      };
    case "LOAD_ERROR":
      return { ...state, loading: false, error: action.error };
    default:
      return state;
  }
}

function convertJsonToCsvRows(data: AnalyticsPayload) {
  const lines: string[] = [];
  lines.push("Section,Metric,Value");
  lines.push(`Range,From,${data.range.start}`);
  lines.push(`Range,To,${data.range.end}`);
  lines.push(`Users,Total Users,${data.overview.users.totalUsers}`);
  lines.push(`Users,New Users,${data.overview.users.newUsers}`);
  lines.push(`Courses,Total Courses,${data.overview.courses.totalCourses}`);
  lines.push(`Courses,Active Courses,${data.overview.courses.activeCourses}`);
  lines.push(`Revenue,Total Revenue,${data.overview.revenue.totalRevenue}`);
  lines.push(`Revenue,Admin Commission,${data.overview.revenue.adminRevenue}`);
  lines.push(`Revenue,Teacher Commission,${data.overview.revenue.teacherRevenue}`);
  lines.push(`Revenue,Successful Transactions,${data.overview.revenue.successfulTransactions}`);
  lines.push(`Withdrawals,Count,${data.overview.revenue.withdrawalCount}`);
  lines.push(`Withdrawals,Amount,${data.overview.revenue.withdrawalAmount}`);
  lines.push(`Language,Most Learned,${data.languageAnalytics.mostPopularLanguage?.name ?? ""}`);
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
  const [state, dispatch] = useReducer(dashboardReducer, initialData, createInitialState);
  const requestSeq = useRef(0);
  const { data, preset, fromDate, toDate, loading, error } = state;

  async function refreshAnalytics(nextPreset: AnalyticsPreset, nextFromDate: string, nextToDate: string) {
    requestSeq.current += 1;
    const activeRequest = requestSeq.current;
    dispatch({ type: "LOAD_START" });

    try {
      const nextData = await loadDashboardAnalytics({
        preset: nextPreset,
        from: nextFromDate,
        to: nextToDate,
      });
      if (activeRequest === requestSeq.current) {
        dispatch({ type: "LOAD_SUCCESS", data: nextData });
      }
    } catch {
      if (activeRequest === requestSeq.current) {
        dispatch({ type: "LOAD_ERROR", error: "Không thể tải dữ liệu thống kê." });
      }
    }
  }

  function changePreset(nextPreset: AnalyticsPreset) {
    dispatch({ type: "SET_FILTERS", preset: nextPreset, fromDate, toDate });
    void refreshAnalytics(nextPreset, fromDate, toDate);
  }

  function changeFromDate(nextFromDate: string) {
    dispatch({ type: "SET_FILTERS", preset, fromDate: nextFromDate, toDate });
    if (preset === "CUSTOM") {
      void refreshAnalytics(preset, nextFromDate, toDate);
    }
  }

  function changeToDate(nextToDate: string) {
    dispatch({ type: "SET_FILTERS", preset, fromDate, toDate: nextToDate });
    if (preset === "CUSTOM") {
      void refreshAnalytics(preset, fromDate, nextToDate);
    }
  }

  function exportCsv() {
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
      { Section: "Revenue", Metric: "Admin Commission", Value: data.overview.revenue.adminRevenue },
      { Section: "Revenue", Metric: "Teacher Commission", Value: data.overview.revenue.teacherRevenue },
      { Section: "Withdrawals", Metric: "Count", Value: data.overview.revenue.withdrawalCount },
      { Section: "Withdrawals", Metric: "Amount", Value: data.overview.revenue.withdrawalAmount },
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
    doc.text("FinnCenter Analytics Report", 14, 16);
    doc.setFontSize(10);
    doc.text(`Range: ${data.range.label}`, 14, 24);

    autoTable(doc, {
      startY: 30,
      head: [["Section", "Metric", "Value"]],
      body: [
        ["Users", "Total", String(data.overview.users.totalUsers)],
        ["Courses", "Total", String(data.overview.courses.totalCourses)],
        ["Revenue", "Total", String(data.overview.revenue.totalRevenue)],
        ["Revenue", "Admin Commission", String(data.overview.revenue.adminRevenue)],
        ["Revenue", "Teacher Commission", String(data.overview.revenue.teacherRevenue)],
        ["Withdrawals", "Count", String(data.overview.revenue.withdrawalCount)],
      ],
    });

    doc.save(`analytics-${data.range.label}.pdf`);
  }

  return (
    <div className="space-y-6">
      <AnalyticsHeader
        data={data}
        preset={preset}
        fromDate={fromDate}
        toDate={toDate}
        loading={loading}
        error={error}
        onPresetChange={changePreset}
        onFromDateChange={changeFromDate}
        onToDateChange={changeToDate}
      />
      <OverviewKpis data={data} />
      <FinanceSection data={data} />
      <ReportAndRefundSection data={data} />
      <CourseAndLanguageSection data={data} />
      <UserAndEnrollmentSection data={data} />
      <ExportReportsPanel
        onExportCsv={exportCsv}
        onExportXlsx={() => void exportXlsx()}
        onExportPdf={() => void exportPdf()}
      />
    </div>
  );
}
