import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { hashPassword, startAuthenticatedSession, validateStrongPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function findActiveInvitation(token: string) {
  if (!token) return null;
  return prisma.userInvitation.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { language: { select: { id: true, name: true, code: true } } },
  });
}

function isUsable(invitation: Awaited<ReturnType<typeof findActiveInvitation>>) {
  return Boolean(
    invitation &&
      !invitation.acceptedAt &&
      !invitation.revokedAt &&
      invitation.expiresAt > new Date(),
  );
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token")?.trim() ?? "";
  const invitation = await findActiveInvitation(token);
  if (!isUsable(invitation) || !invitation) {
    return NextResponse.json({ error: "Lời mời không hợp lệ hoặc đã hết hạn." }, { status: 404 });
  }
  return NextResponse.json({
    invitation: {
      email: invitation.email,
      username: invitation.username,
      role: invitation.role,
      language: invitation.language,
      expiresAt: invitation.expiresAt,
    },
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    token?: unknown;
    password?: unknown;
    confirmPassword?: unknown;
  } | null;
  const token = typeof body?.token === "string" ? body.token.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const confirmPassword = typeof body?.confirmPassword === "string" ? body.confirmPassword : "";
  if (password !== confirmPassword) {
    return NextResponse.json({ error: "Xác nhận mật khẩu không khớp." }, { status: 400 });
  }
  const passwordError = validateStrongPassword(password);
  if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 });

  const invitation = await findActiveInvitation(token);
  if (!isUsable(invitation) || !invitation) {
    return NextResponse.json({ error: "Lời mời không hợp lệ hoặc đã hết hạn." }, { status: 400 });
  }
  if (!invitation.languageId) {
    return NextResponse.json({ error: "Lời mời thiếu ngôn ngữ giảng dạy." }, { status: 400 });
  }
  const existing = await prisma.user.findUnique({ where: { email: invitation.email }, select: { id: true } });
  if (existing) {
    return NextResponse.json({ error: "Email này đã có tài khoản." }, { status: 409 });
  }

  const now = new Date();
  const created = await prisma.$transaction(async (tx) => {
    const claimed = await tx.userInvitation.updateMany({
      where: { id: invitation.id, acceptedAt: null, revokedAt: null, expiresAt: { gt: now } },
      data: { acceptedAt: now },
    });
    if (claimed.count !== 1) throw new Error("INVITATION_ALREADY_USED");

    const user = await tx.user.create({
      data: {
        username: invitation.username,
        email: invitation.email,
        password: hashPassword(password),
        role: "TEACHER",
        accountStatus: "ACTIVE",
        emailVerifiedAt: now,
      },
      select: { id: true, role: true, authVersion: true },
    });
    const application = await tx.teacherApplication.create({
      data: {
        userId: user.id,
        languageId: invitation.languageId!,
        status: "APPROVED",
        attemptNo: 1,
        submittedAt: now,
        reviewedAt: now,
        reviewedById: invitation.invitedById,
      },
    });
    await tx.teacherApplicationLog.create({
      data: {
        applicationId: application.id,
        status: "APPROVED",
        message: "Tài khoản giảng viên được tạo từ lời mời của quản trị viên.",
        actorId: invitation.invitedById,
      },
    });
    await tx.userInvitation.update({
      where: { id: invitation.id },
      data: { acceptedUserId: user.id },
    });
    return user;
  });

  await startAuthenticatedSession({ user: created, request, trustCurrentDevice: true });
  return NextResponse.json({ ok: true, redirectTo: "/" });
}
