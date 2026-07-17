import { createHmac, timingSafeEqual } from "node:crypto";
import { getRequiredAuthSecret } from "@/lib/server-secret";

type TestAttemptTokenPayload = {
  userId: string;
  testId: string;
  startedAt: number;
  expiresAt: number | null;
};

function base64url(input: string | Buffer) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function decodeBase64url(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  return Buffer.from(normalized + padding, "base64").toString("utf8");
}

function signPayload(encodedPayload: string) {
  return base64url(
    createHmac("sha256", getRequiredAuthSecret()).update(encodedPayload).digest(),
  );
}

export function createTestAttemptToken(params: {
  userId: string;
  testId: string;
  timeLimitMinutes: number | null;
}) {
  const startedAt = Date.now();
  const expiresAt = params.timeLimitMinutes
    ? startedAt + params.timeLimitMinutes * 60 * 1000
    : null;
  const payload: TestAttemptTokenPayload = {
    userId: params.userId,
    testId: params.testId,
    startedAt,
    expiresAt,
  };
  const encodedPayload = base64url(JSON.stringify(payload));
  return `${encodedPayload}.${signPayload(encodedPayload)}`;
}

export function verifyTestAttemptToken(params: {
  token: string;
  userId: string;
  testId: string;
}) {
  const [encodedPayload, signature] = params.token.split(".");
  if (!encodedPayload || !signature) {
    return { ok: false as const, reason: "INVALID" as const };
  }

  const expected = signPayload(encodedPayload);
  const left = Buffer.from(expected);
  const right = Buffer.from(signature);
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return { ok: false as const, reason: "INVALID" as const };
  }

  try {
    const payload = JSON.parse(decodeBase64url(encodedPayload)) as TestAttemptTokenPayload;
    if (payload.userId !== params.userId || payload.testId !== params.testId) {
      return { ok: false as const, reason: "INVALID" as const };
    }

    if (payload.expiresAt && Date.now() > payload.expiresAt + 15_000) {
      return { ok: false as const, reason: "EXPIRED" as const };
    }

    return { ok: true as const, payload };
  } catch {
    return { ok: false as const, reason: "INVALID" as const };
  }
}
