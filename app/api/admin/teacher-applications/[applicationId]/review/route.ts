import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sendBasicEmail } from "@/lib/mailer";
import { prisma } from "@/lib/prisma";
import { logTeacherApplication } from "@/lib/teacher-onboarding";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ applicationId: string }> },
) {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { applicationId } = await params;
    const body = await request.json();
    const action = typeof body.action === "string" ? body.action : "";
    const rejectionReason = typeof body.rejectionReason === "string" ? body.rejectionReason.trim() : "";

    if (action !== "APPROVE" && action !== "REJECT") {
      return NextResponse.json({ error: "Action khong hop le." }, { status: 400 });
    }

    const application = await prisma.teacherApplication.findUnique({
      where: { id: applicationId },
      include: { user: true, certificates: true },
    });

    if (!application) {
      return NextResponse.json({ error: "Không tìm thấy hồ sơ." }, { status: 404 });
    }
    if (application.status !== "UNDER_REVIEW") {
      return NextResponse.json({ error: "Chỉ hồ sơ đang chờ duyệt mới được xử lý." }, { status: 409 });
    }
    if (action === "REJECT" && !rejectionReason) {
      return NextResponse.json({ error: "Vui lòng nhập lý do từ chối." }, { status: 400 });
    }
    if (action === "APPROVE") {
      const validCertificates =
        application.certificates.length > 0 &&
        application.certificates.every((certificate) => certificate.expiryDate > new Date());
      if (!validCertificates) {
        return NextResponse.json(
          { error: "Hồ sơ phải có ít nhất một chứng chỉ còn hạn." },
          { status: 400 },
        );
      }
      if (application.entranceTestId) {
        const passedAttempt = application.entranceAttemptId
          ? await prisma.testAttempt.findFirst({
              where: {
                id: application.entranceAttemptId,
                userId: application.userId,
                testId: application.entranceTestId,
                isPassed: true,
              },
              select: { id: true },
            })
          : null;
        if (!passedAttempt) {
          return NextResponse.json(
            { error: "Ứng viên chưa vượt qua bài test đầu vào." },
            { status: 400 },
          );
        }
      }
    }

    const nextStatus = action === "APPROVE" ? "APPROVED" : "REJECTED";

    await prisma.$transaction(async (tx) => {
      await tx.teacherApplication.update({
        where: { id: applicationId },
        data: {
          status: nextStatus,
          reviewedAt: new Date(),
          reviewedById: admin.id,
          rejectionReason: action === "REJECT" ? rejectionReason || null : null,
        },
      });

      if (action === "APPROVE") {
        await tx.user.update({
          where: { id: application.userId },
          data: { role: "TEACHER" },
        });
      }

      await tx.notification.create({
        data: {
          userId: application.userId,
          title: action === "APPROVE" ? "Hồ sơ giảng viên đã được duyệt" : "Hồ sơ giảng viên bị từ chối",
          body:
            action === "APPROVE"
              ? "Tài khoản của bạn đã được chuyển sang Teacher."
              : rejectionReason || "Admin da tu choi ho so giang vien cua ban.",
        },
      });
    });

    await logTeacherApplication({
      applicationId,
      status: nextStatus,
      message:
        action === "APPROVE"
          ? "Admin da approve ho so va chuyen role sang Teacher."
          : `Admin rejected ho so.${rejectionReason ? ` Ly do: ${rejectionReason}` : ""}`,
      actorId: admin.id,
    });

    try {
      await sendBasicEmail(
        application.user.email,
        action === "APPROVE" ? "Hồ sơ giảng viên đã được approve" : "Hồ sơ giảng viên bị reject",
        action === "APPROVE"
          ? "Tài khoản của bạn đã được chuyển sang Teacher. Bạn có thể tạo khóa học ngay."
          : rejectionReason || "Hồ sơ của bạn chưa được approve.",
      );
    } catch {
      // Review state is the source of truth; SMTP failures should not block admin action.
    }

    return NextResponse.json({ ok: true, status: nextStatus });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi hệ thống.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
