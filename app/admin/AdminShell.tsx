"use client";

import { useRouter, useSearchParams } from "next/navigation";
import AdminDashboard from "./AdminDashboard";
import AnalyticsDashboard from "./AnalyticsDashboard";
import AdminTestsManagement from "./AdminTestsManagement";
import AdminCourseRefunds from "./AdminCourseRefunds";
import AdminRevenueWithdrawals, { type AdminWithdrawal } from "./AdminRevenueWithdrawals";
import type { AnalyticsPayload } from "@/lib/admin-analytics";
import type { AdminCourseRefund, AdminManagedTest, Application, Course, Language } from "./types";

type AdminTab = "overview" | "tests" | "withdrawals" | "analytics" | "refunds";

const adminTabs: { id: AdminTab; label: string }[] = [
  { id: "overview", label: "Tổng quan" },
  { id: "tests", label: "Quản lý bài kiểm tra" },
  { id: "analytics", label: "Thống kê" },
  { id: "withdrawals", label: "Rút doanh thu" },
  { id: "refunds", label: "Hoàn tiền" },
];

function isAdminTab(value: string | null): value is AdminTab {
  return Boolean(value && adminTabs.some((item) => item.id === value));
}

export default function AdminShell({
  initialEnabled,
  initialCourseAutoApproval,
  initialLanguages,
  initialApplications,
  initialCourses,
  initialAdminManagedTests,
  analyticsInitialData,
  initialWithdrawals,
  initialRefunds,
}: {
  initialEnabled: boolean;
  initialCourseAutoApproval: boolean;
  initialLanguages: Language[];
  initialApplications: Application[];
  initialCourses: Course[];
  initialAdminManagedTests: AdminManagedTest[];
  analyticsInitialData: AnalyticsPayload;
  initialWithdrawals: AdminWithdrawal[];
  initialRefunds: AdminCourseRefund[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const currentTab: AdminTab = isAdminTab(requestedTab) ? requestedTab : "overview";

  function setTab(nextTab: AdminTab) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextTab === "overview") {
      params.delete("tab");
    } else {
      params.set("tab", nextTab);
    }
    const query = params.toString();
    router.replace(query ? `/admin?${query}` : "/admin", { scroll: false });
  }

  return (
    <div>
      <div className="mb-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bảng quản trị</h1>
          <p className="text-sm text-muted-foreground">Duyệt nội dung và theo dõi hệ thống</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {adminTabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`rounded-md px-3 py-2 text-sm font-medium ${
                currentTab === item.id
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-foreground"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {currentTab === "overview" ? (
        <AdminDashboard
          initialEnabled={initialEnabled}
          initialCourseAutoApproval={initialCourseAutoApproval}
          initialApplications={initialApplications}
          initialCourses={initialCourses}
        />
      ) : currentTab === "tests" ? (
        <AdminTestsManagement
          initialLanguages={initialLanguages}
          initialAdminManagedTests={initialAdminManagedTests}
          isAdmin
        />
      ) : currentTab === "withdrawals" ? (
        <AdminRevenueWithdrawals initialWithdrawals={initialWithdrawals} />
      ) : currentTab === "refunds" ? (
        <AdminCourseRefunds initialRefunds={initialRefunds} />
      ) : (
        <AnalyticsDashboard initialData={analyticsInitialData} />
      )}
    </div>
  );
}
