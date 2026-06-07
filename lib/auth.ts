import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Role } from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

const AUTH_COOKIE_NAME = "auth_token";
const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7;
const AUTH_ALG = "HS256";
const AUTH_SECRET =
  process.env.AUTH_SECRET ??
  process.env.JWT_SECRET ??
  "dev_auth_secret_change_me";

export type AppRole = keyof typeof Role;

export const ROLE_HOME: Record<AppRole, string> = {
  STUDENT: "/",
  TEACHER: "/",
  ADMIN: "/",
};

export function normalizeRole(value: string): AppRole | null {
  if (value in Role) {
    return value as AppRole;
  }

  return null;
}

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

type AuthPayload = {
  sub: string;
  role: AppRole;
  exp: number;
};

function signAuthToken(payload: AuthPayload): string {
  const header = { alg: AUTH_ALG, typ: "AUTH" };
  const encodedHeader = base64urlEncode(JSON.stringify(header));
  const encodedPayload = base64urlEncode(JSON.stringify(payload));
  const signature = createHmac("sha256", AUTH_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function verifyAuthToken(token: string): AuthPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const expectedSignature = createHmac("sha256", AUTH_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

  const expectedBuffer = Buffer.from(expectedSignature);
  const receivedBuffer = Buffer.from(encodedSignature);
  if (expectedBuffer.length !== receivedBuffer.length) {
    return null;
  }
  if (!timingSafeEqual(expectedBuffer, receivedBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64urlDecode(encodedPayload)) as AuthPayload;
    if (!payload?.sub || !payload?.role || !payload?.exp) {
      return null;
    }

    if (payload.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function validateStrongPassword(password: string): string | null {
  if (password.length < 8) {
    return "Mat khau phai co it nhat 8 ky tu.";
  }

  if (!/[a-z]/.test(password)) {
    return "Mat khau phai co it nhat 1 chu thuong.";
  }

  if (!/[A-Z]/.test(password)) {
    return "Mat khau phai co it nhat 1 chu hoa.";
  }

  if (!/\d/.test(password)) {
    return "Mat khau phai co it nhat 1 chu so.";
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    return "Mat khau phai co it nhat 1 ky tu dac biet.";
  }

  return null;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const digest = scryptSync(password, salt, 64).toString("hex");

  return `${salt}:${digest}`;
}

export function verifyPassword(password: string, storedPassword: string): boolean {
  const [salt, savedDigest] = storedPassword.split(":");
  if (!salt || !savedDigest) {
    return false;
  }

  const derivedDigest = scryptSync(password, salt, 64).toString("hex");
  const derivedBuffer = Buffer.from(derivedDigest, "hex");
  const savedBuffer = Buffer.from(savedDigest, "hex");

  if (derivedBuffer.length !== savedBuffer.length) {
    return false;
  }

  return timingSafeEqual(derivedBuffer, savedBuffer);
}

export function createAuthToken(userId: string, role: AppRole): string {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const payload: AuthPayload = {
    sub: userId,
    role,
    exp: nowSeconds + SESSION_MAX_AGE_MS / 1000,
  };

  return signAuthToken(payload);
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

export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}

export async function authenticate() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  const payload = verifyAuthToken(token);
  if (!payload) {
    await clearAuthCookie();
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      phoneNumber: true,
      isBanned: true,
      learningLanguageId: true,
    },
  });

  if (!user || user.isBanned) {
    await clearAuthCookie();
    return null;
  }

  return user;
}

export const getCurrentUser = authenticate;

export async function requireUser() {
  const user = await authenticate();
  if (!user) {
    redirect("/auth/login");
  }

  return user;
}

export async function requireRole(...roles: AppRole[]) {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    redirect(ROLE_HOME[user.role]);
  }

  return user;
}
