import { NextResponse } from "next/server";
import { ROLE_HOME, createAuthToken, setAuthCookie } from "@/lib/auth";
import {
  getRequestSecurityContext,
  verifyRegistrationOtp,
} from "@/lib/registration-otp";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    email?: unknown;
    code?: unknown;
  } | null;

  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const code = typeof body?.code === "string" ? body.code.trim() : "";

  if (!email || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "Email hoac ma OTP khong hop le." }, { status: 400 });
  }

  const securityContext = getRequestSecurityContext(request);
  const result = await verifyRegistrationOtp({
    email,
    code,
    requestIp: securityContext.requestIp,
    deviceFingerprint: securityContext.deviceFingerprint,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.error,
        attemptsRemaining: "attemptsRemaining" in result ? result.attemptsRemaining : undefined,
      },
      { status: result.status },
    );
  }

  const token = createAuthToken(result.user.id, result.user.role);
  await setAuthCookie(token);

  return NextResponse.json({
    ok: true,
    redirectTo: ROLE_HOME[result.user.role],
    alreadyActive: "alreadyActive" in result ? result.alreadyActive : false,
  });
}
