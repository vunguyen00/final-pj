import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getStudentResultDetail } from "@/lib/student-results";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ resultId: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "STUDENT" && user.role !== "TEACHER" && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Bạn chưa đăng nhập." }, { status: 401 });
    }

    const { resultId } = await params;
    const detail = await getStudentResultDetail(user, resultId);
    if (!detail) {
      return NextResponse.json({ error: "Không tìm thấy kết quả." }, { status: 404 });
    }

    return NextResponse.json(detail);
  } catch (error) {
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Bạn không có quyền xem kết quả này." }, { status: 403 });
    }

    console.error("Error fetching result detail:", error);
    return NextResponse.json({ error: "Không tải được chi tiết kết quả." }, { status: 500 });
  }
}
