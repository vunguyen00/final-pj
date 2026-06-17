"use server";

import { getDashboardAnalytics, type AnalyticsPreset } from "@/lib/admin-analytics";
import { authenticate } from "@/lib/auth";

type AnalyticsRequest = {
  preset: AnalyticsPreset;
  from?: string;
  to?: string;
};

export async function loadDashboardAnalytics(input: AnalyticsRequest) {
  const user = await authenticate();
  if (!user || user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  return getDashboardAnalytics({
    preset: input.preset,
    from: input.preset === "CUSTOM" ? input.from : undefined,
    to: input.preset === "CUSTOM" ? input.to : undefined,
  });
}
