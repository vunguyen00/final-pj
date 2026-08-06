import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sendBasicEmail } from "@/lib/mailer";
import { prisma } from "@/lib/prisma";
import { logTeacherApplication } from "@/lib/teacher-onboarding";
import { calculateTeacherExamAverage, TEACHER_EXAM_PASSING_AVERAGE } from "@/lib/teacher-exam-skills";

type ApplicationAction = "INVITE_TO_EXAM" | "REJECT" | "CONVERT_TO_TEACHER";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ applicationId: string }> },
) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { applicationId } = await params;
  const body = await request.json().catch(() => null) as {
    action?: unknown;
    rejectionReason?: unknown;
  } | null;
  const action = typeof body?.action === "string" ? body.action as ApplicationAction : "";
  const rejectionReason = typeof body?.rejectionReason === "string" ? body.rejectionReason.trim().slice(0, 1000) : "";
  const application = await prisma.teacherApplication.findUnique({
    where: { id: applicationId },
    include: {
      user: true,
      language: true,
      certificates: true,
      examResult: true,
      recruitmentRound: true,
    },
  });
  if (!application || !application.recruitmentRoundId) {
    return NextResponse.json({ error: "Không tìm thấy hồ sơ thuộc đợt tuyển." }, { status: 404 });
  }

  let nextStatus: "INVITED_TO_EXAM" | "REJECTED" | "CONVERTED_TO_TEACHER";
  let notificationTitle: string;
  let notificationBody: string;

  if (action === "INVITE_TO_EXAM") {
    if (!(["PENDING", "UNDER_REVIEW"] as string[]).includes(application.status)) {
      return NextResponse.json({ error: "Chỉ hồ sơ đang chờ mới có thể mời dự thi." }, { status: 409 });
    }
    const certificatesValid = application.certificates.length > 0 && application.certificates.every((item) => item.expiryDate > new Date());
    if (!certificatesValid) return NextResponse.json({ error: "Hồ sơ cần có chứng chỉ còn hạn." }, { status: 400 });
    nextStatus = "INVITED_TO_EXAM";
    notificationTitle = "Hồ sơ đã được duyệt tham gia kỳ thi";
    const examTime = application.recruitmentRound
      ? `${application.recruitmentRound.examStartsAt.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })} – ${application.recruitmentRound.examEndsAt.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}`
      : "Sẽ được thông báo sau";
    notificationBody = [
      `Bạn đã được mời tham gia ${application.recruitmentRound?.name ?? "kỳ thi tuyển giảng viên"}.`,
      `Ngôn ngữ đăng ký: ${application.language.name}`,
      `Địa điểm thi: ${application.examLocationName ?? "Sẽ được thông báo sau"}`,
      application.examLocationAddress ? `Địa chỉ: ${application.examLocationAddress}` : null,
      `Thời gian thi: ${examTime}`,
    ].filter((line): line is string => line !== null).join("\n");
  } else if (action === "REJECT") {
    if (!(["PENDING", "UNDER_REVIEW"] as string[]).includes(application.status)) {
      return NextResponse.json({ error: "Chỉ hồ sơ đang chờ mới có thể bị từ chối tại bước duyệt hồ sơ." }, { status: 409 });
    }
    if (!rejectionReason) return NextResponse.json({ error: "Vui lòng nhập lý do từ chối." }, { status: 400 });
    nextStatus = "REJECTED";
    notificationTitle = "Hồ sơ tuyển giảng viên bị từ chối";
    notificationBody = rejectionReason;
  } else if (action === "CONVERT_TO_TEACHER") {
    const averageScore = application.examResult ? calculateTeacherExamAverage(application.examResult) : null;
    if (application.status !== "PASSED" || !application.examResult?.submittedAt || application.examResult.failed || averageScore === null || averageScore < TEACHER_EXAM_PASSING_AVERAGE) {
      return NextResponse.json({ error: `Chỉ ứng viên có điểm trung bình bốn kỹ năng từ ${TEACHER_EXAM_PASSING_AVERAGE}/100 mới được chuyển thành giảng viên.` }, { status: 409 });
    }
    const language = await prisma.learningLanguage.findFirst({
      where: { id: application.languageId, isActive: true },
    });
    if (!language) return NextResponse.json({ error: "Ngôn ngữ giảng dạy không hợp lệ." }, { status: 400 });
    nextStatus = "CONVERTED_TO_TEACHER";
    notificationTitle = "Tài khoản đã được chuyển thành giảng viên";
    notificationBody = `Bạn đã được cấp quyền giảng dạy ngôn ngữ ${language.name}.`;
    await prisma.$transaction(async (tx) => {
      await tx.teacherApplication.update({
        where: { id: application.id },
        data: { status: nextStatus, languageId: language.id, reviewedAt: new Date(), reviewedById: admin.id, rejectionReason: null },
      });
      await tx.user.update({
        where: { id: application.userId },
        data: { role: "TEACHER", authVersion: { increment: 1 } },
      });
      await tx.session.deleteMany({ where: { userId: application.userId } });
      await tx.notification.create({ data: { userId: application.userId, title: notificationTitle, body: notificationBody } });
    });
    await logTeacherApplication({ applicationId, status: nextStatus, message: notificationBody, actorId: admin.id });
    await sendStatusEmail(request, application.user.email, notificationTitle, notificationBody);
    return NextResponse.json({ ok: true, status: nextStatus, language: { id: language.id, name: language.name, code: language.code } });
  } else {
    return NextResponse.json({ error: "Thao tác không hợp lệ." }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.teacherApplication.update({
      where: { id: application.id },
      data: {
        status: nextStatus,
        reviewedAt: new Date(),
        reviewedById: admin.id,
        rejectionReason: nextStatus === "REJECTED" ? rejectionReason : null,
      },
    }),
    prisma.notification.create({ data: { userId: application.userId, title: notificationTitle, body: notificationBody } }),
  ]);
  await logTeacherApplication({ applicationId, status: nextStatus, message: notificationBody, actorId: admin.id });
  await sendStatusEmail(request, application.user.email, notificationTitle, notificationBody);
  return NextResponse.json({ ok: true, status: nextStatus });
}

async function sendStatusEmail(request: Request, email: string, subject: string, body: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VNPAY_BASE_URL || new URL(request.url).origin;
  const url = `${baseUrl.replace(/\/$/, "")}/teacher-registration`;
  try {
    await sendBasicEmail(email, subject, `${body}\n\nTheo dõi hồ sơ tại:\n${url}`, { actionUrl: url, actionLabel: "Xem hồ sơ" });
  } catch {
    // Database state remains authoritative if email is temporarily unavailable.
  }
}
