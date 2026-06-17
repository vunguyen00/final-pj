import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getStudentResults } from "@/lib/student-results";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "STUDENT" && user.role !== "TEACHER" && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Bạn chưa đăng nhập." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const results = await getStudentResults(user, searchParams.get("type"));

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Error fetching result history:", error);
    return NextResponse.json({ error: "Không tải được lịch sử kết quả." }, { status: 500 });
  }
}
