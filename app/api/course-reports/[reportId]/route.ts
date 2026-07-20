import { NextResponse } from "next/server";
import { CourseReportStatus } from "@/.generated/prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const STATUSES = new Set(Object.values(CourseReportStatus));

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ reportId: string }> },
) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const [{ reportId }, body] = await Promise.all([
    params,
    request.json().catch(() => ({})),
  ]);
  const report = await prisma.courseReport.findUnique({
    where: { id: reportId },
    select: { id: true, status: true, course: { select: { instructorId: true } } },
  });
  if (!report || (user.role === "TEACHER" && report.course.instructorId !== user.id)) {
    return NextResponse.json({ error: "Không tìm thấy báo cáo." }, { status: 404 });
  }

  const response = typeof body.response === "string" ? body.response.trim().slice(0, 3000) : undefined;
  const requestedStatus = typeof body.status === "string" && STATUSES.has(body.status as CourseReportStatus)
    ? (body.status as CourseReportStatus)
    : undefined;
  if (user.role === "TEACHER" && requestedStatus && requestedStatus !== "IN_REVIEW") {
    return NextResponse.json({ error: "Giảng viên chỉ có thể chuyển báo cáo sang đang xem xét; trạng thái cuối do admin quyết định." }, { status: 403 });
  }
  if (!response && !requestedStatus) {
    return NextResponse.json({ error: "Không có thay đổi hợp lệ." }, { status: 400 });
  }

  const updated = await prisma.courseReport.update({
    where: { id: reportId },
    data: {
      ...(response !== undefined ? { response, respondedById: user.id } : {}),
      ...(requestedStatus ? { status: requestedStatus } : {}),
    },
  });
  return NextResponse.json({ report: updated });
}
