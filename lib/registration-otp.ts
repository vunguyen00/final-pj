import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from "node:crypto";
import { hashPassword } from "@/lib/auth";
import { sendRegistrationOtpEmail } from "@/lib/mailer";
import { getRequiredAuthSecret } from "@/lib/server-secret";

export const REGISTRATION_OTP_EXPIRY_MINUTES = 10;
export const REGISTRATION_OTP_RESEND_SECONDS = 60;
export const REGISTRATION_OTP_MAX_ATTEMPTS = 5;
export const REGISTRATION_OTP_COOKIE_NAME = "registration_challenge";

const MAX_EMAIL_OTPS_PER_HOUR = 5;
const MAX_IP_OTPS_PER_HOUR = 20;
const MAX_DEVICE_OTPS_PER_HOUR = 10;
const RATE_LIMIT_STORE_MAX_KEYS = 10_000;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const VERIFY_LIMIT_WINDOW_MS = REGISTRATION_OTP_EXPIRY_MINUTES * 60 * 1000;

type PendingRegistration = {
  version: 1;
  challengeId: string;
  username: string;
  email: string;
  passwordHash: string;
  codeHash: string;
  deviceFingerprint: string;
  expiresAt: number;
  resendAvailableAt: number;
  attempts: number;
};

type RateLimitState = {
  entries: Map<string, number[]>;
  operations: number;
};

const globalRateLimit = globalThis as typeof globalThis & {
  registrationOtpRateLimit?: RateLimitState;
};
const rateLimitState =
  globalRateLimit.registrationOtpRateLimit ??
  { entries: new Map<string, number[]>(), operations: 0 };

globalRateLimit.registrationOtpRateLimit = rateLimitState;

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

function opaqueRateLimitKey(namespace: string, value: string) {
  return `${namespace}:${createHash("sha256").update(value).digest("hex")}`;
}

function pruneRateLimitStore(now: number) {
  rateLimitState.operations += 1;
  if (
    rateLimitState.operations % 100 !== 0 &&
    rateLimitState.entries.size <= RATE_LIMIT_STORE_MAX_KEYS
  ) return;

  const oldestAllowed = now - RATE_LIMIT_WINDOW_MS;
  for (const [key, timestamps] of rateLimitState.entries) {
    const active = timestamps.filter((timestamp) => timestamp > oldestAllowed);
    if (active.length === 0) rateLimitState.entries.delete(key);
    else rateLimitState.entries.set(key, active);
  }

  while (rateLimitState.entries.size > RATE_LIMIT_STORE_MAX_KEYS) {
    const oldestKey = rateLimitState.entries.keys().next().value;
    if (typeof oldestKey !== "string") break;
    rateLimitState.entries.delete(oldestKey);
  }
}

function consumeRateLimitRule(params: {
  key: string;
  limit: number;
  windowMs: number;
  now: number;
}) {
  const active = (rateLimitState.entries.get(params.key) ?? []).filter(
    (timestamp) => timestamp > params.now - params.windowMs,
  );
  if (active.length >= params.limit) {
    return {
      ok: false as const,
      retryAfter: Math.max(
        1,
        Math.ceil((active[0] + params.windowMs - params.now) / 1000),
      ),
    };
  }
  rateLimitState.entries.set(params.key, [...active, params.now]);
  return { ok: true as const };
}

function consumeRegistrationOtpSend(params: {
  email: string;
  requestIp?: string | null;
  deviceFingerprint?: string | null;
}) {
  const now = Date.now();
  pruneRateLimitStore(now);
  const rules = [
    {
      key: opaqueRateLimitKey("registration-email-cooldown", params.email),
      limit: 1,
      windowMs: REGISTRATION_OTP_RESEND_SECONDS * 1000,
      reason: "COOLDOWN" as const,
    },
    {
      key: opaqueRateLimitKey("registration-email-hour", params.email),
      limit: MAX_EMAIL_OTPS_PER_HOUR,
      windowMs: RATE_LIMIT_WINDOW_MS,
      reason: "RATE_LIMIT" as const,
    },
    ...(params.requestIp
      ? [{
          key: opaqueRateLimitKey("registration-ip-hour", params.requestIp),
          limit: MAX_IP_OTPS_PER_HOUR,
          windowMs: RATE_LIMIT_WINDOW_MS,
          reason: "RATE_LIMIT" as const,
        }]
      : []),
    ...(params.deviceFingerprint
      ? [{
          key: opaqueRateLimitKey("registration-device-hour", params.deviceFingerprint),
          limit: MAX_DEVICE_OTPS_PER_HOUR,
          windowMs: RATE_LIMIT_WINDOW_MS,
          reason: "RATE_LIMIT" as const,
        }]
      : []),
  ];

  // Validate every rule before consuming any counter.
  for (const rule of rules) {
    const active = (rateLimitState.entries.get(rule.key) ?? []).filter(
      (timestamp) => timestamp > now - rule.windowMs,
    );
    if (active.length >= rule.limit) {
      return {
        ok: false as const,
        reason: rule.reason,
        retryAfter: Math.max(
          1,
          Math.ceil((active[0] + rule.windowMs - now) / 1000),
        ),
      };
    }
  }
  for (const rule of rules) {
    const active = (rateLimitState.entries.get(rule.key) ?? []).filter(
      (timestamp) => timestamp > now - rule.windowMs,
    );
    rateLimitState.entries.set(rule.key, [...active, now]);
  }
  return { ok: true as const };
}

export function reserveRegistrationOtpCapacity(params: {
  email: string;
  requestIp?: string | null;
  deviceFingerprint?: string | null;
}) {
  return consumeRegistrationOtpSend(params);
}

function consumeVerificationAttempt(challengeId: string) {
  const now = Date.now();
  pruneRateLimitStore(now);
  return consumeRateLimitRule({
    key: opaqueRateLimitKey("registration-verify", challengeId),
    limit: REGISTRATION_OTP_MAX_ATTEMPTS,
    windowMs: VERIFY_LIMIT_WINDOW_MS,
    now,
  });
}

function getEncryptionKey() {
  return createHash("sha256")
    .update(`registration-challenge:${getRequiredAuthSecret()}`)
    .digest();
}

function encryptPendingRegistration(payload: PendingRegistration) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  return [iv, encrypted, cipher.getAuthTag()]
    .map((part) => part.toString("base64url"))
    .join(".");
}

function decryptPendingRegistration(token: string): PendingRegistration | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [ivValue, encryptedValue, tagValue] = parts;
    const decipher = createDecipheriv(
      "aes-256-gcm",
      getEncryptionKey(),
      Buffer.from(ivValue, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedValue, "base64url")),
      decipher.final(),
    ]).toString("utf8");
    const payload = JSON.parse(decrypted) as PendingRegistration;
    if (
      payload.version !== 1 ||
      !payload.challengeId ||
      !payload.username ||
      !payload.email ||
      !payload.passwordHash ||
      !payload.codeHash ||
      !payload.deviceFingerprint ||
      !Number.isFinite(payload.expiresAt) ||
      !Number.isFinite(payload.resendAvailableAt) ||
      !Number.isInteger(payload.attempts) ||
      payload.attempts < 0
    ) return null;
    return payload;
  } catch {
    return null;
  }
}

function challengeMatchesRequest(
  challenge: PendingRegistration,
  email: string,
  deviceFingerprint: string,
) {
  return challenge.email === email && challenge.deviceFingerprint === deviceFingerprint;
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
  const deviceFingerprint = createHash("sha256")
    .update(rawDevice)
    .digest("hex")
    .slice(0, 64);
  return { requestIp: ip, deviceFingerprint };
}

export function getRegistrationOtpCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: REGISTRATION_OTP_EXPIRY_MINUTES * 60,
  };
}

export async function createAndSendRegistrationOtp(params: {
  username: string;
  email: string;
  password: string;
  requestIp?: string | null;
  deviceFingerprint: string;
  rateLimitReserved?: boolean;
}) {
  if (!params.rateLimitReserved) {
    const allowed = consumeRegistrationOtpSend(params);
    if (!allowed.ok) return allowed;
  }

  const code = generateOtpCode();
  const now = Date.now();
  const expiresAt = now + REGISTRATION_OTP_EXPIRY_MINUTES * 60 * 1000;
  const resendAvailableAt = now + REGISTRATION_OTP_RESEND_SECONDS * 1000;
  const challenge: PendingRegistration = {
    version: 1,
    challengeId: randomBytes(16).toString("hex"),
    username: params.username,
    email: params.email,
    passwordHash: hashPassword(params.password),
    codeHash: hashOtp(code),
    deviceFingerprint: params.deviceFingerprint,
    expiresAt,
    resendAvailableAt,
    attempts: 0,
  };

  await sendRegistrationOtpEmail(params.email, code, REGISTRATION_OTP_EXPIRY_MINUTES);
  return {
    ok: true as const,
    challengeToken: encryptPendingRegistration(challenge),
    expiresAt: new Date(expiresAt),
    resendAvailableAt: new Date(resendAvailableAt),
  };
}

export async function resendRegistrationOtp(params: {
  challengeToken: string;
  email: string;
  requestIp?: string | null;
  deviceFingerprint: string;
}) {
  const challenge = decryptPendingRegistration(params.challengeToken);
  if (!challenge || !challengeMatchesRequest(challenge, params.email, params.deviceFingerprint)) {
    return {
      ok: false as const,
      status: 400,
      reason: "INVALID_CHALLENGE" as const,
      error: "Phiên đăng ký không hợp lệ. Vui lòng đăng ký lại.",
    };
  }

  const now = Date.now();
  if (challenge.resendAvailableAt > now) {
    return {
      ok: false as const,
      status: 429,
      reason: "COOLDOWN" as const,
      retryAfter: Math.ceil((challenge.resendAvailableAt - now) / 1000),
    };
  }

  const allowed = consumeRegistrationOtpSend(params);
  if (!allowed.ok) return { ...allowed, status: 429 };

  const code = generateOtpCode();
  const expiresAt = now + REGISTRATION_OTP_EXPIRY_MINUTES * 60 * 1000;
  const resendAvailableAt = now + REGISTRATION_OTP_RESEND_SECONDS * 1000;
  const refreshed: PendingRegistration = {
    ...challenge,
    challengeId: randomBytes(16).toString("hex"),
    codeHash: hashOtp(code),
    expiresAt,
    resendAvailableAt,
    attempts: 0,
  };

  await sendRegistrationOtpEmail(params.email, code, REGISTRATION_OTP_EXPIRY_MINUTES);
  return {
    ok: true as const,
    challengeToken: encryptPendingRegistration(refreshed),
    expiresAt: new Date(expiresAt),
    resendAvailableAt: new Date(resendAvailableAt),
  };
}

export function verifyRegistrationOtp(params: {
  challengeToken: string;
  email: string;
  code: string;
  deviceFingerprint: string;
}) {
  const challenge = decryptPendingRegistration(params.challengeToken);
  if (!challenge || !challengeMatchesRequest(challenge, params.email, params.deviceFingerprint)) {
    return {
      ok: false as const,
      status: 400,
      clearChallenge: true,
      error: "Phiên đăng ký không hợp lệ. Vui lòng đăng ký lại.",
    };
  }
  if (challenge.expiresAt <= Date.now()) {
    return {
      ok: false as const,
      status: 400,
      clearChallenge: true,
      error: "Mã OTP đã hết hạn. Vui lòng đăng ký lại để nhận mã mới.",
    };
  }
  if (challenge.attempts >= REGISTRATION_OTP_MAX_ATTEMPTS) {
    return {
      ok: false as const,
      status: 429,
      error: "Bạn đã nhập sai OTP quá nhiều lần. Vui lòng gửi lại mã mới.",
      attemptsRemaining: 0,
    };
  }

  const attemptAllowed = consumeVerificationAttempt(challenge.challengeId);
  if (!attemptAllowed.ok) {
    return {
      ok: false as const,
      status: 429,
      error: "Bạn đã nhập OTP quá nhiều lần. Vui lòng thử lại sau.",
      attemptsRemaining: 0,
    };
  }
  if (!compareHash(params.code, challenge.codeHash)) {
    const attempts = challenge.attempts + 1;
    return {
      ok: false as const,
      status: attempts >= REGISTRATION_OTP_MAX_ATTEMPTS ? 429 : 400,
      error: "Mã OTP không đúng.",
      attemptsRemaining: Math.max(0, REGISTRATION_OTP_MAX_ATTEMPTS - attempts),
      challengeToken: encryptPendingRegistration({ ...challenge, attempts }),
    };
  }

  return {
    ok: true as const,
    registration: {
      username: challenge.username,
      email: challenge.email,
      passwordHash: challenge.passwordHash,
    },
  };
}
