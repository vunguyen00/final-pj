"use client";

import { useState } from "react";
import AdminDashboard from "./AdminDashboard";
import AnalyticsDashboard from "./AnalyticsDashboard";
import AdminTestsManagement from "./AdminTestsManagement";
import AdminRevenueWithdrawals, { type AdminWithdrawal } from "./AdminRevenueWithdrawals";
import type { AnalyticsPayload } from "@/lib/admin-analytics";
import type { AdminManagedTest, Application, Course, Language } from "./types";

export default function AdminShell({
  initialEnabled,
  initialCourseAutoApproval,
  initialLanguages,
  initialApplications,
  initialCourses,
  initialAdminManagedTests,
  analyticsInitialData,
  initialWithdrawals,
}: {
  initialEnabled: boolean;
  initialCourseAutoApproval: boolean;
  initialLanguages: Language[];
  initialApplications: Application[];
  initialCourses: Course[];
  initialAdminManagedTests: AdminManagedTest[];
  analyticsInitialData: AnalyticsPayload;
  initialWithdrawals: AdminWithdrawal[];
}) {
  const [tab, setTab] = useState<"overview" | "tests" | "withdrawals" | "analytics">("overview");

  return (
    <div>
      <div className="mb-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
          <p className="text-sm text-muted-foreground">Duyệt nội dung và theo dõi hệ thống</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTab("overview")}
            className={`rounded-md px-3 py-2 text-sm font-medium ${tab === "overview" ? "bg-primary text-primary-foreground" : "border border-border bg-card text-foreground"}`}
          >
            Tổng quan
          </button>
          <button
            type="button"
            onClick={() => setTab("tests")}
            className={`rounded-md px-3 py-2 text-sm font-medium ${tab === "tests" ? "bg-primary text-primary-foreground" : "border border-border bg-card text-foreground"}`}
          >
            Quản lý test
          </button>
          <button
            type="button"
            onClick={() => setTab("analytics")}
            className={`rounded-md px-3 py-2 text-sm font-medium ${tab === "analytics" ? "bg-primary text-primary-foreground" : "border border-border bg-card text-foreground"}`}
          >
            Thống kê
          </button>
          <button
            type="button"
            onClick={() => setTab("withdrawals")}
            className={`rounded-md px-3 py-2 text-sm font-medium ${tab === "withdrawals" ? "bg-primary text-primary-foreground" : "border border-border bg-card text-foreground"}`}
          >
            Rút doanh thu
          </button>
        </div>
      </div>

      {tab === "overview" ? (
        <AdminDashboard
          initialEnabled={initialEnabled}
          initialCourseAutoApproval={initialCourseAutoApproval}
          initialApplications={initialApplications}
          initialCourses={initialCourses}
        />
      ) : tab === "tests" ? (
        <AdminTestsManagement
          initialLanguages={initialLanguages}
          initialAdminManagedTests={initialAdminManagedTests}
          isAdmin
        />
      ) : tab === "withdrawals" ? (
        <AdminRevenueWithdrawals initialWithdrawals={initialWithdrawals} />
      ) : (
        <AnalyticsDashboard initialData={analyticsInitialData} />
      )}
    </div>
  );
}

