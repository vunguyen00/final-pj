import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ROLE_HOME, startAuthenticatedSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getRegistrationOtpCookieOptions,
  getRequestSecurityContext,
  REGISTRATION_OTP_COOKIE_NAME,
  verifyRegistrationOtp,
} from "@/lib/registration-otp";

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    email?: unknown;
    code?: unknown;
  } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  if (!email || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "Email hoặc mã OTP không hợp lệ." }, { status: 400 });
  }

  const cookieStore = await cookies();
  const challengeToken = cookieStore.get(REGISTRATION_OTP_COOKIE_NAME)?.value ?? "";
  const securityContext = getRequestSecurityContext(request);
  const result = verifyRegistrationOtp({
    challengeToken,
    email,
    code,
    deviceFingerprint: securityContext.deviceFingerprint,
  });
  if (!result.ok) {
    const response = NextResponse.json(
      {
        error: result.error,
        attemptsRemaining:
          "attemptsRemaining" in result ? result.attemptsRemaining : undefined,
      },
      { status: result.status },
    );
    if ("challengeToken" in result && result.challengeToken) {
      response.cookies.set(
        REGISTRATION_OTP_COOKIE_NAME,
        result.challengeToken,
        getRegistrationOtpCookieOptions(),
      );
    } else if ("clearChallenge" in result && result.clearChallenge) {
      response.cookies.delete(REGISTRATION_OTP_COOKIE_NAME);
    }
    return response;
  }

  let user;
  try {
    // This is the first persistent write in the registration flow.
    user = await prisma.user.create({
      data: {
        username: result.registration.username,
        email: result.registration.email,
        password: result.registration.passwordHash,
        role: "STUDENT",
        accountStatus: "ACTIVE",
        emailVerifiedAt: new Date(),
      },
      select: { id: true, role: true, authVersion: true },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      const response = NextResponse.json({ error: "Email đã tồn tại." }, { status: 409 });
      response.cookies.delete(REGISTRATION_OTP_COOKIE_NAME);
      return response;
    }
    throw error;
  }

  await startAuthenticatedSession({
    user,
    request,
    trustCurrentDevice: true,
  });

  const response = NextResponse.json({
    ok: true,
    redirectTo: ROLE_HOME[user.role],
  });
  response.cookies.delete(REGISTRATION_OTP_COOKIE_NAME);
  return response;
}
