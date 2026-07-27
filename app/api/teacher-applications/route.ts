import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentUser, requireUser } from "@/lib/auth";
import { sendBasicEmail } from "@/lib/mailer";
import { prisma } from "@/lib/prisma";
import { validateUploadSignature } from "@/lib/upload-validation";
import {
  findEntranceTest,
  getActiveLanguages,
  getTeacherEntranceSetting,
  logTeacherApplication,
} from "@/lib/teacher-onboarding";

const MAX_CERTIFICATES = 3;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "application/pdf"]);

function publicCertificatePath(fileName: string) {
  return `/certificates/${fileName}`;
}

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function serializeEntranceTest(test: Awaited<ReturnType<typeof findEntranceTest>>) {
  if (!test) return null;
  return {
    id: test.id,
    name: test.name,
    description: test.description,
    assessmentMode: test.assessmentMode,
    timeLimit: test.timeLimit,
    shuffleQuestions: test.shuffleQuestions,
    // Questions are released one at a time by the sequential session API.
    questions: [],
  };
}

export async function GET() {
  const user = await getCurrentUser();
  const [setting, languages] = await Promise.all([
    getTeacherEntranceSetting(),
    getActiveLanguages(),
  ]);

  if (!user) {
    return NextResponse.json({ setting, languages, applications: [] });
  }

  const applications = await prisma.teacherApplication.findMany({
    where: { userId: user.id },
    include: {
      language: true,
      certificates: true,
      entranceTest: {
        include: {
          questions: {
            include: { answers: { orderBy: { order: "asc" } } },
            orderBy: { order: "asc" },
          },
        },
      },
      antiCheatLogs: {
        orderBy: { serverTimestamp: "desc" },
        take: 10,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    setting,
    languages,
    applications: applications.map((application) => ({
      ...application,
      entranceTest: application.entranceTest
        ? {
            ...serializeEntranceTest(application.entranceTest),
            timeLimit:
              application.entranceTimeLimit ??
              application.entranceTest.timeLimit,
          }
        : null,
    })),
  });
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    if (user.role !== "STUDENT" && user.role !== "TEACHER") {
      return NextResponse.json({ error: "Chỉ học viên hoặc giảng viên được đăng ký." }, { status: 403 });
    }

    const setting = await getTeacherEntranceSetting();
    if (!setting.enabled) {
      return NextResponse.json({ error: "Chức năng đăng ký giảng viên đang tạm tắt." }, { status: 403 });
    }

    const formData = await request.formData();
    const languageId = String(formData.get("languageId") || "").trim();
    const expiryDates = JSON.parse(String(formData.get("expiryDates") || "[]")) as string[];
    const files = formData.getAll("certificates").filter((item): item is File => item instanceof File);

    if (!languageId) {
      return NextResponse.json({ error: "Vui lòng chọn ngôn ngữ apply." }, { status: 400 });
    }

    const language = await prisma.learningLanguage.findFirst({
      where: { id: languageId, isActive: true },
    });
    if (!language) {
      return NextResponse.json({ error: "Ngôn ngữ không hợp lệ." }, { status: 400 });
    }

    const duplicate = await prisma.teacherApplication.findFirst({
      where: {
        userId: user.id,
        languageId,
        status: { in: ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "APPROVED"] },
      },
      select: { id: true },
    });
    if (duplicate) {
      return NextResponse.json(
        { error: "Bạn đã có hồ sơ đang xử lý hoặc đã được duyệt cho ngôn ngữ này." },
        { status: 409 },
      );
    }

    if (files.length === 0 || files.length > MAX_CERTIFICATES) {
      return NextResponse.json({ error: "Vui lòng upload từ 1 đến 3 file chứng chỉ." }, { status: 400 });
    }

    const fileBuffers: Buffer[] = [];
    for (const [index, file] of files.entries()) {
      if (!ALLOWED_TYPES.has(file.type)) {
        return NextResponse.json({ error: "Chỉ chấp nhận tệp JPG, PNG hoặc PDF." }, { status: 400 });
      }
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: "Mỗi tệp có dung lượng tối đa 10 MB." }, { status: 400 });
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

    const attemptNo = (await prisma.teacherApplication.count({ where: { userId: user.id } })) + 1;
    const entranceTest = await findEntranceTest(languageId);
    const status = entranceTest ? "DRAFT" : "UNDER_REVIEW";

    const uploadDir = path.join(process.cwd(), "public", "certificates");
    await mkdir(uploadDir, { recursive: true });

    const savedFiles = [];
    for (const [index, file] of files.entries()) {
      const uniqueName = `${randomUUID()}-${sanitizeFileName(file.name)}`;
      const buffer = fileBuffers[index];
      await writeFile(path.join(uploadDir, uniqueName), buffer);
      savedFiles.push({
        fileName: file.name,
        fileUrl: publicCertificatePath(uniqueName),
        fileType: file.type,
        fileSize: file.size,
        expiryDate: new Date(expiryDates[index]),
      });
    }

    const application = await prisma.teacherApplication.create({
      data: {
        userId: user.id,
        languageId,
        attemptNo,
        status,
        entranceTestId: entranceTest?.id ?? null,
        // The countdown starts only after camera permission and fullscreen are ready.
        startedAt: null,
        submittedAt: entranceTest ? null : new Date(),
        certificates: { create: savedFiles },
      },
      include: {
        language: true,
        certificates: true,
      },
    });

    await logTeacherApplication({
      applicationId: application.id,
      status,
      message: entranceTest ? "Da upload chung chi, bat dau bai test dau vao." : "Da nop ho so, cho admin review.",
      actorId: user.id,
    });

    try {
      await sendBasicEmail(
        user.email,
        "Da nhan ho so dang ky giang vien",
        "Hồ sơ đăng ký giảng viên của bạn đã được ghi nhận.",
      );
    } catch {
      // Email errors are logged in the admin setting flow; application submission must not fail on SMTP config.
    }

    return NextResponse.json({
      application: {
        ...application,
        entranceTest: serializeEntranceTest(entranceTest),
      },
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi hệ thống.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
