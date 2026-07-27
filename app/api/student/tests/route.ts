import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getStudentTestsData } from "@/lib/student-tests-data";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (
      !user ||
      (user.role !== "STUDENT" && user.role !== "TEACHER" && user.role !== "ADMIN")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const courseId = request.nextUrl.searchParams.get("courseId");
    const data = await getStudentTestsData(user, courseId);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching student tests:", error);
    return NextResponse.json({ error: "Failed to fetch tests" }, { status: 500 });
  }
}
