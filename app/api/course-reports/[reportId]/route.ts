import { NextResponse } from "next/server";
import { CourseReportStatus } from "@/.generated/prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { getCourseReportLabels } from "@/lib/course-report-labels";
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
    select: {
      id: true,
      status: true,
      response: true,
      respondedById: true,
      reporterId: true,
      course: {
        select: {
          instructorId: true,
          name: true,
          language: { select: { code: true, name: true } },
        },
      },
    },
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
  if ((report.status === "RESOLVED" || report.status === "REJECTED") && requestedStatus === "IN_REVIEW") {
    return NextResponse.json({ error: "Báo cáo đã kết thúc và không thể nhận xử lý lại." }, { status: 400 });
  }
  if (!response && !requestedStatus) {
    return NextResponse.json({ error: "Không có thay đổi hợp lệ." }, { status: 400 });
  }
  const wantsOwnership = requestedStatus === "IN_REVIEW" || response !== undefined;
  if (wantsOwnership && report.respondedById && report.respondedById !== user.id) {
    return NextResponse.json({ error: "Báo cáo đã có người khác tiếp nhận và phản hồi." }, { status: 409 });
  }

  const claimResponder = wantsOwnership && !report.respondedById;
  const effectiveStatus = requestedStatus ?? (response !== undefined && report.status === "PENDING" ? CourseReportStatus.IN_REVIEW : undefined);
  const labels = getCourseReportLabels(report.course.language?.code || report.course.language?.name);
  try {
    const result = await prisma.$transaction(async (transaction) => {
      const updateResult = await transaction.courseReport.updateMany({
        where: {
          id: reportId,
          ...(wantsOwnership
            ? {
                status: { notIn: [CourseReportStatus.RESOLVED, CourseReportStatus.REJECTED] },
                respondedById: claimResponder ? null : user.id,
              }
            : {}),
        },
        data: {
          ...(response !== undefined ? { response } : {}),
          ...(claimResponder ? { respondedById: user.id } : {}),
          ...(effectiveStatus ? { status: effectiveStatus } : {}),
        },
      });
      if (updateResult.count === 0) throw new Error("REPORT_ALREADY_CLAIMED");

      const nextReport = await transaction.courseReport.findUniqueOrThrow({ where: { id: reportId } });
      const responseChanged = response !== undefined && response !== (report.response ?? "");
      const statusChanged = nextReport.status !== report.status;
      const ownershipChanged = claimResponder && nextReport.respondedById === user.id;

      if (responseChanged || statusChanged || ownershipChanged) {
        const acknowledged = ownershipChanged && nextReport.status === "IN_REVIEW";
        const statusLabel = labels.statuses[nextReport.status];
        const responseSummary = responseChanged && nextReport.response
          ? ` ${labels.responsePrefix}: ${nextReport.response.slice(0, 500)}`
          : "";
        await transaction.notification.create({
          data: {
            userId: report.reporterId,
            title: acknowledged ? labels.acknowledgedNotificationTitle : labels.updatedNotificationTitle,
            body: `${acknowledged
              ? labels.acknowledgedNotificationBody(report.course.name)
              : labels.updatedNotificationBody(report.course.name, statusLabel)}${responseSummary}`,
          },
        });
      }

      return { report: nextReport, notificationSent: responseChanged || statusChanged || ownershipChanged };
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "REPORT_ALREADY_CLAIMED") {
      return NextResponse.json({ error: "Báo cáo vừa được người khác tiếp nhận hoặc đã kết thúc. Vui lòng tải lại danh sách." }, { status: 409 });
    }
    throw error;
  }
}
