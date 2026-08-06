import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentUser, requireUser } from "@/lib/auth";
import { sendBasicEmail } from "@/lib/mailer";
import { prisma } from "@/lib/prisma";
import { validateUploadSignature } from "@/lib/upload-validation";
import {
  getActiveLanguages,
  getTeacherRecruitmentSetting,
  isTeacherRegistrationOpen,
  logTeacherApplication,
} from "@/lib/teacher-onboarding";
import { getActiveRecruitmentRound, parseRoundLocations } from "@/lib/teacher-recruitment-rounds";

const MAX_CERTIFICATES = 3;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "application/pdf"]);

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function GET() {
  const user = await getCurrentUser();
  const [setting, languages] = await Promise.all([
    getTeacherRecruitmentSetting(),
    getActiveLanguages(),
  ]);
  const applications = user
    ? await prisma.teacherApplication.findMany({
        where: { userId: user.id },
        include: { language: true, certificates: true },
        orderBy: { createdAt: "desc" },
      })
    : [];

  return NextResponse.json({
    setting,
    registrationOpen: isTeacherRegistrationOpen(setting),
    languages,
    applications,
  });
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    if (user.role !== "STUDENT" && user.role !== "TEACHER") {
      return NextResponse.json({ error: "Chỉ học viên hoặc giảng viên được đăng ký." }, { status: 403 });
    }

    const [setting, activeRound] = await Promise.all([
      getTeacherRecruitmentSetting(),
      getActiveRecruitmentRound(),
    ]);
    if (!activeRound || !setting.enabled || setting.activeRoundId !== activeRound.id || !isTeacherRegistrationOpen(setting)) {
      return NextResponse.json({ error: "Hiện không nằm trong thời gian nhận đăng ký giảng viên." }, { status: 403 });
    }

    const formData = await request.formData();
    const languageId = String(formData.get("languageId") || "").trim();
    const locationId = String(formData.get("locationId") || "").trim();
    const expiryDates = JSON.parse(String(formData.get("expiryDates") || "[]")) as string[];
    const files = formData.getAll("certificates").filter((item): item is File => item instanceof File);
    if (!languageId) return NextResponse.json({ error: "Vui lòng chọn ngôn ngữ giảng dạy." }, { status: 400 });
    const roundLocations = parseRoundLocations(activeRound.locations);
    const selectedLocation = roundLocations.find((location) => location.id === locationId);
    if (!selectedLocation) {
      return NextResponse.json({ error: "Vui lòng chọn một địa điểm thi hợp lệ." }, { status: 400 });
    }

    const [language, duplicate] = await Promise.all([
      prisma.learningLanguage.findFirst({ where: { id: languageId, isActive: true } }),
      prisma.teacherApplication.findFirst({
        where: { userId: user.id, languageId, status: { in: ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "PENDING", "INVITED_TO_EXAM", "CHECKED_IN", "EXAM_COMPLETED", "PASSED", "CONVERTED_TO_TEACHER"] } },
        select: { id: true },
      }),
    ]);
    if (!language) return NextResponse.json({ error: "Ngôn ngữ không hợp lệ." }, { status: 400 });
    if (duplicate) {
      return NextResponse.json({ error: "Bạn đã có hồ sơ đang xử lý hoặc đã được duyệt cho ngôn ngữ này." }, { status: 409 });
    }
    if (files.length === 0 || files.length > MAX_CERTIFICATES) {
      return NextResponse.json({ error: "Vui lòng tải từ 1 đến 3 chứng chỉ." }, { status: 400 });
    }

    const fileBuffers: Buffer[] = [];
    for (const [index, file] of files.entries()) {
      if (!ALLOWED_TYPES.has(file.type) || file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: "Mỗi chứng chỉ phải là JPG, PNG hoặc PDF và không quá 10 MB." }, { status: 400 });
      }
      const expiryTime = Date.parse(expiryDates[index] || "");
      if (Number.isNaN(expiryTime) || expiryTime <= Date.now()) {
        return NextResponse.json({ error: "Vui lòng nhập ngày hết hạn hợp lệ cho từng chứng chỉ." }, { status: 400 });
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      if (!validateUploadSignature(buffer, file.type, file.name)) {
        return NextResponse.json({ error: "Nội dung file chứng chỉ không đúng định dạng." }, { status: 400 });
      }
      fileBuffers.push(buffer);
    }

    const uploadDir = path.join(process.cwd(), "public", "certificates");
    await mkdir(uploadDir, { recursive: true });
    const savedFiles = [];
    for (const [index, file] of files.entries()) {
      const uniqueName = `${randomUUID()}-${sanitizeFileName(file.name)}`;
      await writeFile(path.join(uploadDir, uniqueName), fileBuffers[index]);
      savedFiles.push({
        fileName: file.name,
        fileUrl: `/certificates/${uniqueName}`,
        fileType: file.type,
        fileSize: file.size,
        expiryDate: new Date(expiryDates[index]),
      });
    }

    const attemptNo = (await prisma.teacherApplication.count({ where: { userId: user.id } })) + 1;
    const now = new Date();
    const application = await prisma.teacherApplication.create({
      data: {
        userId: user.id,
        languageId,
        recruitmentRoundId: activeRound.id,
        examLocationId: selectedLocation.id,
        examLocationName: selectedLocation.name,
        examLocationAddress: selectedLocation.address,
        examLocationNote: selectedLocation.note || null,
        attemptNo,
        status: "PENDING",
        submittedAt: now,
        certificates: { create: savedFiles },
      },
      include: { language: true, certificates: true },
    });
    await logTeacherApplication({
      applicationId: application.id,
      status: "PENDING",
      message: `Đã nộp hồ sơ vào ${activeRound.name}; chờ quản trị viên xem xét.`,
      actorId: user.id,
    });

    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        process.env.VNPAY_BASE_URL ||
        new URL(request.url).origin;
      const registrationUrl = `${baseUrl.replace(/\/$/, "")}/teacher-registration`;
      const examTime = setting.examStartsAt
        ? `${new Date(setting.examStartsAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}${setting.examEndsAt ? ` – ${new Date(setting.examEndsAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}` : ""}`
        : "Sẽ được thông báo sau";
      const emailText = [
        `Xin chào ${user.username},`,
        "",
        "Hồ sơ đăng ký kỳ thi giảng viên của bạn đã được ghi nhận.",
        `Ngôn ngữ đăng ký: ${language.name}`,
        `Địa điểm thi: ${selectedLocation.name}`,
        `Địa chỉ: ${selectedLocation.address}`,
        selectedLocation.note ? `Lưu ý địa điểm: ${selectedLocation.note}` : null,
        `Thời gian thi: ${examTime}`,
        "",
        "Bạn có thể theo dõi trạng thái hồ sơ tại:",
        registrationUrl,
      ].filter((line): line is string => line !== null).join("\n");
      await sendBasicEmail(
        user.email,
        `Đã đăng ký: ${activeRound.name}`,
        emailText,
        { actionUrl: registrationUrl, actionLabel: "Xem hồ sơ đăng ký" },
      );
    } catch {
      // Registration remains successful when SMTP is temporarily unavailable.
    }

    return NextResponse.json({ application }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Lỗi hệ thống." }, { status: 500 });
  }
}
