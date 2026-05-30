"use client";

import { useState } from "react";
import AdminDashboard from "./AdminDashboard";
import AnalyticsDashboard from "./AnalyticsDashboard";
import type { AnalyticsPayload } from "@/lib/admin-analytics";

export default function AdminShell({
  initialEnabled,
  initialUsers,
  initialLanguages,
  initialApplications,
  analyticsInitialData,
}: {
  initialEnabled: boolean;
  initialUsers: any[];
  initialLanguages: any[];
  initialApplications: any[];
  analyticsInitialData: AnalyticsPayload;
}) {
  const [tab, setTab] = useState<"users" | "analytics">("users");

  return (
    <div>
      <div className="mb-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admin Panel</h1>
          <p className="text-sm text-slate-500">Quản lý người dùng và thống kê hệ thống</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setTab("users")}
            className={`rounded-md px-3 py-2 text-sm font-medium ${tab === "users" ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-700"}`}
          >
            Quản lý người dùng
          </button>
          <button
            onClick={() => setTab("analytics")}
            className={`rounded-md px-3 py-2 text-sm font-medium ${tab === "analytics" ? "bg-cyan-600 text-white" : "border border-slate-200 bg-white text-slate-700"}`}
          >
            Thống kê
          </button>
        </div>
      </div>

      {tab === "users" ? (
        <AdminDashboard
          initialEnabled={initialEnabled}
          initialUsers={initialUsers}
          initialLanguages={initialLanguages}
          initialApplications={initialApplications}
        />
      ) : (
        <AnalyticsDashboard initialData={analyticsInitialData} />
      )}
    </div>
  );
}
