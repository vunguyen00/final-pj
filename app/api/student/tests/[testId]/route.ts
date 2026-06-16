import { NextRequest, NextResponse } from "next/server";
import { getStudentTestPayload } from "@/lib/student-test-data";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ testId: string }> },
) {
  try {
    const { testId } = await params;
    const result = await getStudentTestPayload(testId);

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, ...result.details },
        { status: result.status },
      );
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error("Error fetching test:", error);
    return NextResponse.json({ error: "Failed to fetch test" }, { status: 500 });
  }
}
