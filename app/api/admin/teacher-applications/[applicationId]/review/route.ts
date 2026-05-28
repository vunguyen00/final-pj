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
      include: { user: true },
    });

    if (!application) {
      return NextResponse.json({ error: "Khong tim thay ho so." }, { status: 404 });
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
          title: action === "APPROVE" ? "Ho so giang vien da duoc duyet" : "Ho so giang vien bi tu choi",
          body:
            action === "APPROVE"
              ? "Tai khoan cua ban da duoc chuyen sang Teacher."
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
        action === "APPROVE" ? "Ho so giang vien da duoc approve" : "Ho so giang vien bi reject",
        action === "APPROVE"
          ? "Tai khoan cua ban da duoc chuyen sang Teacher. Ban co the tao khoa hoc ngay."
          : rejectionReason || "Ho so cua ban chua duoc approve.",
      );
    } catch {
      // Review state is the source of truth; SMTP failures should not block admin action.
    }

    return NextResponse.json({ ok: true, status: nextStatus });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Loi he thong.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
