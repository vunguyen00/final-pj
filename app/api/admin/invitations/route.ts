import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sendBasicEmail } from "@/lib/mailer";
import { prisma } from "@/lib/prisma";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function GET() {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const invitations = await prisma.userInvitation.findMany({
    include: {
      language: { select: { id: true, name: true, code: true } },
      acceptedUser: { select: { id: true, username: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ invitations });
}

export async function POST(request: Request) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    email?: unknown;
    username?: unknown;
    languageId?: unknown;
  } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const languageId = typeof body?.languageId === "string" ? body.languageId.trim() : "";

  if (!/^\S+@\S+\.\S+$/.test(email) || username.length < 2 || !languageId) {
    return NextResponse.json(
      { error: "Vui lòng nhập email, tên người dùng và ngôn ngữ giảng dạy hợp lệ." },
      { status: 400 },
    );
  }

  const [existingUser, language, pendingInvite] = await Promise.all([
    prisma.user.findUnique({ where: { email }, select: { id: true } }),
    prisma.learningLanguage.findFirst({ where: { id: languageId, isActive: true } }),
    prisma.userInvitation.findFirst({
      where: { email, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true },
    }),
  ]);
  if (existingUser) {
    return NextResponse.json({ error: "Email này đã có tài khoản trong hệ thống." }, { status: 409 });
  }
  if (!language) {
    return NextResponse.json({ error: "Ngôn ngữ giảng dạy không hợp lệ." }, { status: 400 });
  }
  if (pendingInvite) {
    return NextResponse.json({ error: "Email này đang có lời mời còn hiệu lực." }, { status: 409 });
  }

  const rawToken = randomBytes(32).toString("hex");
  const invitation = await prisma.userInvitation.create({
    data: {
      email,
      username,
      role: "TEACHER",
      languageId,
      tokenHash: hashToken(rawToken),
      invitedById: admin.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    include: { language: { select: { name: true } } },
  });

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VNPAY_BASE_URL ||
    new URL(request.url).origin;
  const inviteUrl = `${baseUrl.replace(/\/$/, "")}/auth/accept-invitation?token=${encodeURIComponent(rawToken)}`;
  const subject = "Lời mời trở thành giảng viên FinnCenter";
  const text = `Bạn được mời vào FinnCenter với vai trò giảng viên ${invitation.language?.name ?? ""}. Hãy đặt mật khẩu trong vòng 7 ngày tại: ${inviteUrl}`;

  try {
    await sendBasicEmail(email, subject, text);
    await prisma.emailLog.create({
      data: { to: email, subject, status: "SENT", sentAt: new Date() },
    });
  } catch (error) {
    await prisma.$transaction([
      prisma.userInvitation.update({ where: { id: invitation.id }, data: { revokedAt: new Date() } }),
      prisma.emailLog.create({
        data: {
          to: email,
          subject,
          status: "FAILED",
          error: error instanceof Error ? error.message : String(error),
        },
      }),
    ]);
    return NextResponse.json({ error: "Không thể gửi email mời. Vui lòng kiểm tra cấu hình SMTP." }, { status: 503 });
  }

  return NextResponse.json({ invitation }, { status: 201 });
}
