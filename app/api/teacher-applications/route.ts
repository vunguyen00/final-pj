import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentUser, requireUser } from "@/lib/auth";
import { sendBasicEmail } from "@/lib/mailer";
import { prisma } from "@/lib/prisma";
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
    timeLimit: test.timeLimit,
    shuffleQuestions: test.shuffleQuestions,
    questions: test.questions.map((question) => ({
      id: question.id,
      type: question.type,
      content: question.content,
      audioUrl: question.audioUrl,
      hint: question.hint,
      order: question.order,
      score: question.score,
      answers:
        question.type === "MULTIPLE_CHOICE" || question.type === "TRUE_FALSE"
          ? question.answers.map((answer) => ({
              id: answer.id,
              content: answer.content,
              order: answer.order,
            }))
          : null,
    })),
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
      entranceTest: serializeEntranceTest(application.entranceTest),
    })),
  });
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    if (user.role !== "STUDENT" && user.role !== "TEACHER") {
      return NextResponse.json({ error: "Chi Student hoac Teacher duoc dang ky." }, { status: 403 });
    }

    const setting = await getTeacherEntranceSetting();
    if (!setting.enabled) {
      return NextResponse.json({ error: "Chuc nang dang ky giang vien dang tat." }, { status: 403 });
    }

    const formData = await request.formData();
    const languageId = String(formData.get("languageId") || "").trim();
    const expiryDates = JSON.parse(String(formData.get("expiryDates") || "[]")) as string[];
    const files = formData.getAll("certificates").filter((item): item is File => item instanceof File);

    if (!languageId) {
      return NextResponse.json({ error: "Vui long chon ngon ngu apply." }, { status: 400 });
    }

    const language = await prisma.learningLanguage.findFirst({
      where: { id: languageId, isActive: true },
    });
    if (!language) {
      return NextResponse.json({ error: "Ngon ngu khong hop le." }, { status: 400 });
    }

    if (files.length === 0 || files.length > MAX_CERTIFICATES) {
      return NextResponse.json({ error: "Vui long upload tu 1 den 3 file chung chi." }, { status: 400 });
    }

    for (const [index, file] of files.entries()) {
      if (!ALLOWED_TYPES.has(file.type)) {
        return NextResponse.json({ error: "Chi chap nhan JPG, PNG hoac PDF." }, { status: 400 });
      }
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: "Moi file toi da 10MB." }, { status: 400 });
      }
      if (!expiryDates[index] || Number.isNaN(Date.parse(expiryDates[index]))) {
        return NextResponse.json({ error: "Vui long nhap expiry date cho tung chung chi." }, { status: 400 });
      }
    }

    const attemptNo = (await prisma.teacherApplication.count({ where: { userId: user.id } })) + 1;
    const entranceTest = await findEntranceTest(languageId);
    const status = entranceTest ? "DRAFT" : "UNDER_REVIEW";

    const uploadDir = path.join(process.cwd(), "public", "certificates");
    await mkdir(uploadDir, { recursive: true });

    const savedFiles = [];
    for (const [index, file] of files.entries()) {
      const uniqueName = `${randomUUID()}-${sanitizeFileName(file.name)}`;
      const buffer = Buffer.from(await file.arrayBuffer());
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
        startedAt: entranceTest ? new Date() : null,
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
        "Ho so dang ky giang vien cua ban da duoc ghi nhan.",
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
    const message = error instanceof Error ? error.message : "Loi he thong.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
