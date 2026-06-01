import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getCourseAutoApprovalSetting,
  setCourseAutoApprovalSetting,
} from "@/lib/course-approval";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const setting = await getCourseAutoApprovalSetting();
  return NextResponse.json(setting);
}

export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const enabled = Boolean(body.enabled);

    await setCourseAutoApprovalSetting(enabled);

    return NextResponse.json({ enabled });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Loi he thong.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
