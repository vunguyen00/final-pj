import {
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Role } from "@/.generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { getRequiredAuthSecret } from "@/lib/server-secret";

const AUTH_COOKIE_NAME = "auth_token";
const TRUSTED_DEVICE_COOKIE_NAME = "trusted_device";
const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7;
const DEVICE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 180;
const DEVICE_CHALLENGE_MAX_AGE_MS = 1000 * 60 * 15;
const AUTH_ALG = "HS256";

export type AppRole = keyof typeof Role;

export const ROLE_HOME: Record<AppRole, string> = {
  STUDENT: "/",
  TEACHER: "/",
  ADMIN: "/",
};

type AuthPayload = {
  sub: string;
  role: AppRole;
  ver: number;
  sid: string;
  exp: number;
};

type SessionUser = {
  id: string;
  role: AppRole;
  authVersion: number;
};

function base64urlEncode(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64urlDecode(input: string): string {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  return Buffer.from(normalized + padding, "base64").toString("utf8");
}

function hashOpaqueToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function requestMetadata(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return {
    ip: forwarded || request.headers.get("x-real-ip") || null,
    userAgent: request.headers.get("user-agent")?.slice(0, 500) || null,
  };
}

function signAuthToken(payload: AuthPayload): string {
  const header = { alg: AUTH_ALG, typ: "AUTH" };
  const encodedHeader = base64urlEncode(JSON.stringify(header));
  const encodedPayload = base64urlEncode(JSON.stringify(payload));
  const signature = createHmac("sha256", getRequiredAuthSecret())
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function verifyAuthToken(token: string): AuthPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const expectedSignature = createHmac("sha256", getRequiredAuthSecret())
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

  const expectedBuffer = Buffer.from(expectedSignature);
  const receivedBuffer = Buffer.from(encodedSignature);
  if (
    expectedBuffer.length !== receivedBuffer.length ||
    !timingSafeEqual(expectedBuffer, receivedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(base64urlDecode(encodedPayload)) as AuthPayload;
    if (
      !payload?.sub ||
      !payload?.role ||
      !payload?.sid ||
      !Number.isInteger(payload?.ver) ||
      !payload?.exp ||
      payload.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function validateStrongPassword(password: string): string | null {
  if (password.length < 8) return "Mật khẩu phải có ít nhất 8 ký tự.";
  if (!/[a-z]/.test(password)) return "Mật khẩu phải có ít nhất 1 chữ thường.";
  if (!/[A-Z]/.test(password)) return "Mật khẩu phải có ít nhất 1 chữ hoa.";
  if (!/\d/.test(password)) return "Mật khẩu phải có ít nhất 1 chữ số.";
  if (!/[^A-Za-z0-9]/.test(password)) return "Mật khẩu phải có ít nhất 1 ký tự đặc biệt.";
  return null;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const digest = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${digest}`;
}

export function verifyPassword(password: string, storedPassword: string): boolean {
  const [salt, savedDigest] = storedPassword.split(":");
  if (!salt || !savedDigest) return false;

  const derivedBuffer = Buffer.from(scryptSync(password, salt, 64).toString("hex"), "hex");
  const savedBuffer = Buffer.from(savedDigest, "hex");
  return derivedBuffer.length === savedBuffer.length && timingSafeEqual(derivedBuffer, savedBuffer);
}

export function createAuthToken(
  userId: string,
  role: AppRole,
  authVersion: number,
  sessionId: string,
): string {
  return signAuthToken({
    sub: userId,
    role,
    ver: authVersion,
    sid: sessionId,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_MS / 1000,
  });
}

export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_MS / 1000,
  });
}

async function setTrustedDeviceCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(TRUSTED_DEVICE_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DEVICE_MAX_AGE_MS / 1000,
  });
}

export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}

export async function getTrustedDeviceForUser(userId: string) {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(TRUSTED_DEVICE_COOKIE_NAME)?.value;
  if (!rawToken) return null;
  return prisma.trustedDevice.findUnique({
    where: {
      userId_tokenHash: { userId, tokenHash: hashOpaqueToken(rawToken) },
    },
  });
}

export async function startAuthenticatedSession(params: {
  user: SessionUser;
  request: Request;
  trustedDeviceId?: string;
  trustCurrentDevice?: boolean;
}) {
  const metadata = requestMetadata(params.request);
  let trustedDeviceId = params.trustedDeviceId;
  let rawDeviceToken: string | null = null;

  if (!trustedDeviceId && params.trustCurrentDevice) {
    const cookieStore = await cookies();
    rawDeviceToken =
      cookieStore.get(TRUSTED_DEVICE_COOKIE_NAME)?.value || randomBytes(32).toString("hex");
    const tokenHash = hashOpaqueToken(rawDeviceToken);
    const device = await prisma.trustedDevice.upsert({
      where: {
        userId_tokenHash: { userId: params.user.id, tokenHash },
      },
      create: {
        userId: params.user.id,
        tokenHash,
        label: metadata.userAgent?.slice(0, 120) || "Thiết bị đã xác nhận",
        userAgent: metadata.userAgent,
        lastIp: metadata.ip,
      },
      update: {
        lastUsedAt: new Date(),
        lastIp: metadata.ip,
        userAgent: metadata.userAgent,
      },
    });
    trustedDeviceId = device.id;
  }

  if (!trustedDeviceId) throw new Error("TRUSTED_DEVICE_REQUIRED");

  const sessionId = randomUUID();
  const token = createAuthToken(
    params.user.id,
    params.user.role,
    params.user.authVersion,
    sessionId,
  );

  await prisma.$transaction([
    prisma.session.deleteMany({ where: { userId: params.user.id } }),
    prisma.session.create({
      data: {
        id: sessionId,
        userId: params.user.id,
        trustedDeviceId,
        tokenHash: hashOpaqueToken(token),
        expiresAt: new Date(Date.now() + SESSION_MAX_AGE_MS),
      },
    }),
    prisma.trustedDevice.update({
      where: { id: trustedDeviceId },
      data: { lastUsedAt: new Date(), lastIp: metadata.ip, userAgent: metadata.userAgent },
    }),
  ]);

  await setAuthCookie(token);
  if (rawDeviceToken) await setTrustedDeviceCookie(rawDeviceToken);
  return token;
}

export async function createLoginDeviceChallenge(userId: string, request: Request) {
  const token = randomBytes(32).toString("hex");
  const metadata = requestMetadata(request);
  const now = new Date();

  await prisma.$transaction([
    prisma.loginDeviceChallenge.updateMany({
      where: { userId, consumedAt: null },
      data: { consumedAt: now },
    }),
    prisma.loginDeviceChallenge.create({
      data: {
        userId,
        tokenHash: hashOpaqueToken(token),
        requestIp: metadata.ip,
        userAgent: metadata.userAgent,
        expiresAt: new Date(Date.now() + DEVICE_CHALLENGE_MAX_AGE_MS),
      },
    }),
  ]);

  return token;
}

export async function confirmLoginDevice(token: string, request: Request) {
  const challenge = await prisma.loginDeviceChallenge.findUnique({
    where: { tokenHash: hashOpaqueToken(token) },
    include: {
      user: {
        select: {
          id: true,
          role: true,
          authVersion: true,
          isBanned: true,
          accountStatus: true,
        },
      },
    },
  });

  if (
    !challenge ||
    challenge.consumedAt ||
    challenge.expiresAt <= new Date() ||
    challenge.user.isBanned ||
    challenge.user.accountStatus !== "ACTIVE"
  ) {
    return null;
  }

  const consumed = await prisma.loginDeviceChallenge.updateMany({
    where: { id: challenge.id, consumedAt: null },
    data: { consumedAt: new Date() },
  });
  if (consumed.count !== 1) return null;

  await startAuthenticatedSession({
    user: challenge.user,
    request,
    trustCurrentDevice: true,
  });
  return challenge.user;
}

export async function revokeCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  const payload = token ? verifyAuthToken(token) : null;
  if (payload?.sid) await prisma.session.deleteMany({ where: { id: payload.sid } });
}

export async function authenticate() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  const trustedDeviceToken = cookieStore.get(TRUSTED_DEVICE_COOKIE_NAME)?.value;
  if (!token || !trustedDeviceToken) return null;

  const payload = verifyAuthToken(token);
  if (!payload) {
    await clearAuthCookie();
    return null;
  }

  const session = await prisma.session.findUnique({
    where: { id: payload.sid },
    include: {
      trustedDevice: { select: { tokenHash: true } },
      user: {
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          phoneNumber: true,
          isBanned: true,
          accountStatus: true,
          learningLanguageId: true,
          authVersion: true,
        },
      },
    },
  });
  const user = session?.user;

  if (
    !session ||
    session.userId !== payload.sub ||
    session.expiresAt <= new Date() ||
    session.tokenHash !== hashOpaqueToken(token) ||
    session.trustedDevice.tokenHash !== hashOpaqueToken(trustedDeviceToken) ||
    !user ||
    user.isBanned ||
    user.accountStatus !== "ACTIVE" ||
    user.authVersion !== payload.ver
  ) {
    await clearAuthCookie();
    return null;
  }

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    phoneNumber: user.phoneNumber,
    isBanned: user.isBanned,
    learningLanguageId: user.learningLanguageId,
  };
}

export const getCurrentUser = authenticate;

export async function requireUser() {
  const user = await authenticate();
  if (!user) redirect("/auth/login");
  return user;
}

export async function requireRole(...roles: AppRole[]) {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect(ROLE_HOME[user.role]);
  return user;
}
