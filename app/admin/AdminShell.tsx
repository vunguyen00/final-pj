"use client";

import { useState } from "react";
import AdminDashboard from "./AdminDashboard";
import AnalyticsDashboard from "./AnalyticsDashboard";
import AdminTestsManagement from "./AdminTestsManagement";
import type { AnalyticsPayload } from "@/lib/admin-analytics";
import type { AdminManagedTest, Application, Course, Language, SpeakingAiConfig, UserRow } from "./types";

export default function AdminShell({
  initialEnabled,
  initialCourseAutoApproval,
  initialSpeakingConfig,
  initialUsers,
  initialLanguages,
  initialApplications,
  initialCourses,
  initialAdminManagedTests,
  analyticsInitialData,
}: {
  initialEnabled: boolean;
  initialCourseAutoApproval: boolean;
  initialSpeakingConfig: SpeakingAiConfig;
  initialUsers: UserRow[];
  initialLanguages: Language[];
  initialApplications: Application[];
  initialCourses: Course[];
  initialAdminManagedTests: AdminManagedTest[];
  analyticsInitialData: AnalyticsPayload;
}) {
  const [tab, setTab] = useState<"users" | "tests" | "analytics">("users");

  return (
    <div>
      <div className="mb-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
          <p className="text-sm text-muted-foreground">Quản lý người dùng và thống kê hệ thống</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setTab("users")}
            className={`rounded-md px-3 py-2 text-sm font-medium ${tab === "users" ? "bg-primary text-primary-foreground" : "border border-border bg-card text-foreground"}`}
          >
            Quản lý người dùng
          </button>
          <button
            onClick={() => setTab("tests")}
            className={`rounded-md px-3 py-2 text-sm font-medium ${tab === "tests" ? "bg-primary text-primary-foreground" : "border border-border bg-card text-foreground"}`}
          >
            Quản lý test
          </button>
          <button
            onClick={() => setTab("analytics")}
            className={`rounded-md px-3 py-2 text-sm font-medium ${tab === "analytics" ? "bg-primary text-primary-foreground" : "border border-border bg-card text-foreground"}`}
          >
            Thống kê
          </button>
        </div>
      </div>

      {tab === "users" ? (
        <AdminDashboard
          initialEnabled={initialEnabled}
          initialCourseAutoApproval={initialCourseAutoApproval}
          initialSpeakingConfig={initialSpeakingConfig}
          initialUsers={initialUsers}
          initialLanguages={initialLanguages}
          initialApplications={initialApplications}
          initialCourses={initialCourses}
        />
      ) : tab === "tests" ? (
        <AdminTestsManagement
          initialLanguages={initialLanguages}
          initialAdminManagedTests={initialAdminManagedTests}
          isAdmin
        />
      ) : (
        <AnalyticsDashboard initialData={analyticsInitialData} />
      )}
    </div>
  );
}

