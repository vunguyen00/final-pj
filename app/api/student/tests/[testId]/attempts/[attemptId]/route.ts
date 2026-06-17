import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getStudentTestAttemptResult } from "@/lib/student-test-attempt-result";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ testId: string; attemptId: string }> },
) {
  try {
    const { testId, attemptId } = await params;
    const user = await getCurrentUser();

    if (!user || (user.role !== "STUDENT" && user.role !== "TEACHER" && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await getStudentTestAttemptResult(user, testId, attemptId);
    if (!result) {
      return NextResponse.json({ error: "Result not found" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    console.error("Error fetching test attempt:", error);
    return NextResponse.json({ error: "Failed to fetch test attempt" }, { status: 500 });
  }
}
