import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  getRegistrationOtpCookieOptions,
  getRequestSecurityContext,
  REGISTRATION_OTP_COOKIE_NAME,
  resendRegistrationOtp,
} from "@/lib/registration-otp";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email) {
    return NextResponse.json({ error: "Email là bắt buộc." }, { status: 400 });
  }

  const cookieStore = await cookies();
  const challengeToken = cookieStore.get(REGISTRATION_OTP_COOKIE_NAME)?.value ?? "";
  const securityContext = getRequestSecurityContext(request);
  const result = await resendRegistrationOtp({
    challengeToken,
    email,
    requestIp: securityContext.requestIp,
    deviceFingerprint: securityContext.deviceFingerprint,
  });
  if (!result.ok) {
    return NextResponse.json(
      {
        error:
          "error" in result
            ? result.error
            : result.reason === "COOLDOWN"
              ? `Vui lòng đợi ${result.retryAfter} giây trước khi gửi lại OTP.`
              : "Bạn đã yêu cầu OTP quá nhiều lần. Vui lòng thử lại sau.",
        retryAfter: "retryAfter" in result ? result.retryAfter : undefined,
      },
      { status: "status" in result ? result.status : 429 },
    );
  }

  const response = NextResponse.json({
    ok: true,
    expiresAt: result.expiresAt.toISOString(),
    resendAvailableAt: result.resendAvailableAt.toISOString(),
  });
  response.cookies.set(
    REGISTRATION_OTP_COOKIE_NAME,
    result.challengeToken,
    getRegistrationOtpCookieOptions(),
  );
  return response;
}
