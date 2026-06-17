import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getStudentsManagementData } from "@/lib/teacher-students";

export async function GET() {
  const viewer = await getCurrentUser();
  if (!viewer || (viewer.role !== "TEACHER" && viewer.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(await getStudentsManagementData(viewer));
}
