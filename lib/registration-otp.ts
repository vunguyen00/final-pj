import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import type { Prisma } from "@/.generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { sendRegistrationOtpEmail } from "@/lib/mailer";
import { getRequiredAuthSecret } from "@/lib/server-secret";

export const REGISTRATION_OTP_EXPIRY_MINUTES = 10;
export const REGISTRATION_OTP_RESEND_SECONDS = 60;
export const REGISTRATION_OTP_MAX_ATTEMPTS = 5;
const MAX_EMAIL_OTPS_PER_HOUR = 5;
const MAX_IP_OTPS_PER_HOUR = 20;
const MAX_DEVICE_OTPS_PER_HOUR = 10;

function hashOtp(code: string) {
  return createHash("sha256")
    .update(`${getRequiredAuthSecret()}:${code}`)
    .digest("hex");
}

function compareHash(value: string, expected: string) {
  const left = Buffer.from(hashOtp(value));
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function generateOtpCode() {
  return String(randomInt(100000, 1000000));
}

export function getRequestSecurityContext(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null;
  const rawDevice =
    request.headers.get("x-device-id") ||
    request.headers.get("user-agent") ||
    "unknown-device";
  const deviceFingerprint = createHash("sha256").update(rawDevice).digest("hex").slice(0, 64);

  return { requestIp: ip, deviceFingerprint };
}

async function logRegistrationEvent(params: {
  tx?: Prisma.TransactionClient;
  userId?: string | null;
  email: string;
  requestIp?: string | null;
  deviceFingerprint?: string | null;
  eventType: string;
  detail?: Prisma.InputJsonValue;
}) {
  const client = params.tx ?? prisma;
  await client.registrationSecurityEvent.create({
    data: {
      userId: params.userId ?? null,
      email: params.email,
      requestIp: params.requestIp ?? null,
      deviceFingerprint: params.deviceFingerprint ?? null,
      eventType: params.eventType,
      detail: params.detail ?? {},
    },
  });
}

export async function ensureRegistrationOtpCanBeSent(params: {
  userId: string;
  email: string;
  requestIp?: string | null;
  deviceFingerprint?: string | null;
}) {
  const now = new Date();
  const since = new Date(now.getTime() - 60 * 60 * 1000);
  const latest = await prisma.emailVerificationOtp.findFirst({
    where: { userId: params.userId, consumedAt: null },
    orderBy: { createdAt: "desc" },
    select: { resendAvailableAt: true },
  });

  if (latest && latest.resendAvailableAt > now) {
    const retryAfter = Math.ceil((latest.resendAvailableAt.getTime() - now.getTime()) / 1000);
    await logRegistrationEvent({
      userId: params.userId,
      email: params.email,
      requestIp: params.requestIp,
      deviceFingerprint: params.deviceFingerprint,
      eventType: "OTP_RESEND_COOLDOWN",
      detail: { retryAfter },
    });
    return { ok: false as const, retryAfter, reason: "COOLDOWN" as const };
  }

  const [emailCount, ipCount, deviceCount] = await Promise.all([
    prisma.emailVerificationOtp.count({ where: { email: params.email, createdAt: { gte: since } } }),
    params.requestIp
      ? prisma.emailVerificationOtp.count({ where: { requestIp: params.requestIp, createdAt: { gte: since } } })
      : Promise.resolve(0),
    params.deviceFingerprint
      ? prisma.emailVerificationOtp.count({ where: { deviceFingerprint: params.deviceFingerprint, createdAt: { gte: since } } })
      : Promise.resolve(0),
  ]);

  if (
    emailCount >= MAX_EMAIL_OTPS_PER_HOUR ||
    ipCount >= MAX_IP_OTPS_PER_HOUR ||
    deviceCount >= MAX_DEVICE_OTPS_PER_HOUR
  ) {
    await logRegistrationEvent({
      userId: params.userId,
      email: params.email,
      requestIp: params.requestIp,
      deviceFingerprint: params.deviceFingerprint,
      eventType: "OTP_RATE_LIMITED",
      detail: { emailCount, ipCount, deviceCount },
    });
    return { ok: false as const, retryAfter: REGISTRATION_OTP_RESEND_SECONDS, reason: "RATE_LIMIT" as const };
  }

  return { ok: true as const };
}

export async function createAndSendRegistrationOtp(params: {
  userId: string;
  email: string;
  requestIp?: string | null;
  deviceFingerprint?: string | null;
}) {
  const allowed = await ensureRegistrationOtpCanBeSent(params);
  if (!allowed.ok) return allowed;

  const code = generateOtpCode();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + REGISTRATION_OTP_EXPIRY_MINUTES * 60 * 1000);
  const resendAvailableAt = new Date(now.getTime() + REGISTRATION_OTP_RESEND_SECONDS * 1000);

  await prisma.emailVerificationOtp.create({
    data: {
      userId: params.userId,
      email: params.email,
      codeHash: hashOtp(code),
      expiresAt,
      resendAvailableAt,
      requestIp: params.requestIp,
      deviceFingerprint: params.deviceFingerprint,
    },
  });

  try {
    await sendRegistrationOtpEmail(params.email, code, REGISTRATION_OTP_EXPIRY_MINUTES);
    await prisma.emailLog.create({
      data: {
        userId: params.userId,
        to: params.email,
        subject: "Mã OTP xác thực tài khoản",
        status: "SENT",
        sentAt: new Date(),
      },
    });
  } catch (error) {
    await prisma.emailLog.create({
      data: {
        userId: params.userId,
        to: params.email,
        subject: "Mã OTP xác thực tài khoản",
        status: "FAILED",
        error: error instanceof Error ? error.message : String(error),
      },
    });
    throw error;
  }

  await logRegistrationEvent({
    userId: params.userId,
    email: params.email,
    requestIp: params.requestIp,
    deviceFingerprint: params.deviceFingerprint,
    eventType: "OTP_SENT",
    detail: { expiresAt: expiresAt.toISOString() },
  });

  return { ok: true as const, expiresAt, resendAvailableAt };
}

export async function verifyRegistrationOtp(params: {
  email: string;
  code: string;
  requestIp?: string | null;
  deviceFingerprint?: string | null;
}) {
  const user = await prisma.user.findUnique({
    where: { email: params.email },
    select: { id: true, role: true, accountStatus: true, authVersion: true },
  });

  if (!user) return { ok: false as const, status: 404, error: "Không tìm thấy tài khoản." };
  if (user.accountStatus === "ACTIVE") return { ok: true as const, user, alreadyActive: true };

  const otp = await prisma.emailVerificationOtp.findFirst({
    where: { userId: user.id, email: params.email, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!otp) {
    return { ok: false as const, status: 400, error: "Mã OTP không tồn tại hoặc đã được sử dụng." };
  }

  if (otp.expiresAt < new Date()) {
    await logRegistrationEvent({
      userId: user.id,
      email: params.email,
      requestIp: params.requestIp,
      deviceFingerprint: params.deviceFingerprint,
      eventType: "OTP_EXPIRED",
      detail: { otpId: otp.id },
    });
    return { ok: false as const, status: 400, error: "Mã OTP đã hết hạn. Vui lòng gửi lại mã mới." };
  }

  if (otp.attempts >= REGISTRATION_OTP_MAX_ATTEMPTS) {
    await logRegistrationEvent({
      userId: user.id,
      email: params.email,
      requestIp: params.requestIp,
      deviceFingerprint: params.deviceFingerprint,
      eventType: "OTP_ATTEMPTS_EXCEEDED",
      detail: { otpId: otp.id },
    });
    return { ok: false as const, status: 429, error: "Bạn đã nhập sai OTP quá nhiều lần. Vui lòng gửi lại mã mới." };
  }

  if (!compareHash(params.code, otp.codeHash)) {
    const updated = await prisma.emailVerificationOtp.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
      select: { attempts: true },
    });
    await logRegistrationEvent({
      userId: user.id,
      email: params.email,
      requestIp: params.requestIp,
      deviceFingerprint: params.deviceFingerprint,
      eventType: "OTP_INVALID",
      detail: { attempts: updated.attempts },
    });
    return {
      ok: false as const,
      status: updated.attempts >= REGISTRATION_OTP_MAX_ATTEMPTS ? 429 : 400,
      error: "Mã OTP không đúng.",
      attemptsRemaining: Math.max(0, REGISTRATION_OTP_MAX_ATTEMPTS - updated.attempts),
    };
  }

  await prisma.$transaction([
    prisma.emailVerificationOtp.update({
      where: { id: otp.id },
      data: { consumedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { accountStatus: "ACTIVE", emailVerifiedAt: new Date() },
    }),
  ]);

  await logRegistrationEvent({
    userId: user.id,
    email: params.email,
    requestIp: params.requestIp,
    deviceFingerprint: params.deviceFingerprint,
    eventType: "OTP_VERIFIED",
  });

  return { ok: true as const, user };
}
