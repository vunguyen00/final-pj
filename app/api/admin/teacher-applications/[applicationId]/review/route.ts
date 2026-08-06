import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sendBasicEmail } from "@/lib/mailer";
import { prisma } from "@/lib/prisma";
import { getTeacherRecruitmentSetting, logTeacherApplication } from "@/lib/teacher-onboarding";

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
      include: { user: true, language: true, certificates: true },
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
    }

    const nextStatus = action === "APPROVE" ? "APPROVED" : "REJECTED";
    const setting = await getTeacherRecruitmentSetting();
    const selectedLocation = application.examLocationId
      ? setting.locations.find((location) => location.id === application.examLocationId)
      : null;
    const locationName = application.examLocationName || selectedLocation?.name || "Địa điểm sẽ được thông báo sau";
    const locationAddress = application.examLocationAddress || selectedLocation?.address || "";
    const examTime = setting.examStartsAt
      ? `${new Date(setting.examStartsAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}${setting.examEndsAt ? ` – ${new Date(setting.examEndsAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}` : ""}`
      : "Sẽ được thông báo sau";
    const approvalNotice = [
      "Hồ sơ đăng ký kỳ thi giảng viên của bạn đã được duyệt.",
      `Địa điểm thi: ${locationName}${locationAddress ? ` — ${locationAddress}` : ""}.`,
      `Thời gian thi: ${examTime}.`,
    ].join(" ");

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
          data: { role: "TEACHER", authVersion: { increment: 1 } },
        });
        await tx.session.deleteMany({ where: { userId: application.userId } });
      }

      await tx.notification.create({
        data: {
          userId: application.userId,
          title: action === "APPROVE" ? "Hồ sơ giảng viên đã được duyệt" : "Hồ sơ giảng viên bị từ chối",
          body:
            action === "APPROVE"
              ? approvalNotice
              : rejectionReason || "Quản trị viên đã từ chối hồ sơ giảng viên của bạn.",
        },
      });
    });

    await logTeacherApplication({
      applicationId,
      status: nextStatus,
      message:
        action === "APPROVE"
          ? "Quản trị viên đã duyệt hồ sơ đăng ký kỳ thi giảng viên."
          : `Quản trị viên đã từ chối hồ sơ.${rejectionReason ? ` Lý do: ${rejectionReason}` : ""}`,
      actorId: admin.id,
    });

    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        process.env.VNPAY_BASE_URL ||
        new URL(request.url).origin;
      const registrationUrl = `${baseUrl.replace(/\/$/, "")}/teacher-registration`;
      const subject = action === "APPROVE"
        ? "Xác nhận hồ sơ đăng ký kỳ thi giảng viên đã được duyệt"
        : "Hồ sơ đăng ký giảng viên bị từ chối";
      const text = action === "APPROVE"
        ? [
            `Xin chào ${application.user.username},`,
            "",
            "Hồ sơ đăng ký kỳ thi giảng viên của bạn đã được duyệt.",
            `Ngôn ngữ đăng ký: ${application.language.name}`,
            `Địa điểm thi: ${locationName}`,
            locationAddress ? `Địa chỉ: ${locationAddress}` : null,
            application.examLocationNote ? `Lưu ý địa điểm: ${application.examLocationNote}` : null,
            `Thời gian thi: ${examTime}`,
            "",
            "Vui lòng có mặt đúng giờ và mang theo giấy tờ cần thiết.",
            "Theo dõi hồ sơ tại:",
            registrationUrl,
          ].filter((line): line is string => line !== null).join("\n")
        : [
            `Xin chào ${application.user.username},`,
            "",
            "Hồ sơ đăng ký giảng viên của bạn chưa được duyệt.",
            `Lý do: ${rejectionReason || "Chưa đáp ứng yêu cầu."}`,
            "",
            "Xem hồ sơ tại:",
            registrationUrl,
          ].join("\n");
      await sendBasicEmail(
        application.user.email,
        subject,
        text,
        { actionUrl: registrationUrl, actionLabel: "Xem hồ sơ đăng ký" },
      );
      await prisma.emailLog.create({
        data: {
          userId: application.userId,
          to: application.user.email,
          subject,
          status: "SENT",
          sentAt: new Date(),
        },
      });
    } catch (error) {
      await prisma.emailLog.create({
        data: {
          userId: application.userId,
          to: application.user.email,
          subject: action === "APPROVE"
            ? "Xác nhận hồ sơ đăng ký kỳ thi giảng viên đã được duyệt"
            : "Hồ sơ đăng ký giảng viên bị từ chối",
          status: "FAILED",
          error: error instanceof Error ? error.message : String(error),
        },
      }).catch(() => undefined);
      // Review state is the source of truth; SMTP failures should not block admin action.
    }

    return NextResponse.json({ ok: true, status: nextStatus });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi hệ thống.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
