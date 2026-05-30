import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDashboardAnalytics } from "@/lib/admin-analytics";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const preset = url.searchParams.get("preset");
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");

    const data = await getDashboardAnalytics({ preset, from, to });
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load analytics.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

