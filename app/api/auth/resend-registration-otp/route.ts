import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createAndSendRegistrationOtp,
  getRequestSecurityContext,
} from "@/lib/registration-otp";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!email) {
    return NextResponse.json({ error: "Email là bắt buộc." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, accountStatus: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Không tìm thấy tài khoản." }, { status: 404 });
  }

  if (user.accountStatus === "ACTIVE") {
    return NextResponse.json({ ok: true, alreadyActive: true });
  }

  const securityContext = getRequestSecurityContext(request);
  const result = await createAndSendRegistrationOtp({
    userId: user.id,
    email,
    requestIp: securityContext.requestIp,
    deviceFingerprint: securityContext.deviceFingerprint,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        error:
          result.reason === "COOLDOWN"
            ? `Vui lòng đợi ${result.retryAfter} giây trước khi gửi lại OTP.`
            : "Bạn đã yêu cầu OTP quá nhiều lần. Vui lòng thử lại sau.",
        retryAfter: result.retryAfter,
      },
      { status: 429 },
    );
  }

  return NextResponse.json({
    ok: true,
    expiresAt: result.expiresAt.toISOString(),
    resendAvailableAt: result.resendAvailableAt.toISOString(),
  });
}
