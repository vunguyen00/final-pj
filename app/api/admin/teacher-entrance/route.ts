import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendBasicEmail } from "@/lib/mailer";
import {
  getTeacherEntranceSetting,
  setTeacherEntranceSetting,
} from "@/lib/teacher-onboarding";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const setting = await getTeacherEntranceSetting();
  return NextResponse.json(setting);
}

export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const previous = await getTeacherEntranceSetting();
    const body = await request.json();
    const enabled = Boolean(body.enabled);
    await setTeacherEntranceSetting(enabled);

    let notified = 0;
    if (enabled && !previous.enabled) {
      const students = await prisma.user.findMany({
        where: { role: "STUDENT", isBanned: false },
        select: { id: true, email: true },
      });

      for (const student of students) {
        const subject = "Mo dang ky tro thanh giang vien";
        const text = "He thong da mo dang ky dau vao giang vien. Ban co the vao menu tai khoan de nop ho so.";
        try {
          await sendBasicEmail(student.email, subject, text);
          await prisma.emailLog.create({
            data: { userId: student.id, to: student.email, subject, status: "SENT", sentAt: new Date() },
          });
          notified += 1;
        } catch (error) {
          await prisma.emailLog.create({
            data: {
              userId: student.id,
              to: student.email,
              subject,
              status: "FAILED",
              error: error instanceof Error ? error.message : String(error),
            },
          });
        }

        await prisma.notification.create({
          data: {
            userId: student.id,
            title: "Dang ky giang vien da mo",
            body: text,
          },
        });
      }
    }

    return NextResponse.json({ enabled, notified });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Loi he thong.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
