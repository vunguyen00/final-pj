import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("registration does not persist any account data before OTP verification", async () => {
  const [register, otp, resend] = await Promise.all([
    source("app/api/auth/register/route.ts"),
    source("lib/registration-otp.ts"),
    source("app/api/auth/resend-registration-otp/route.ts"),
  ]);

  assert.match(register, /prisma\.user\.findUnique/);
  assert.match(register, /reserveRegistrationOtpCapacity/);
  assert.doesNotMatch(register, /prisma\.user\.(create|update|upsert)/);
  assert.doesNotMatch(register, /PENDING_VERIFICATION/);
  assert.ok(
    register.indexOf("reserveRegistrationOtpCapacity({") <
      register.indexOf("prisma.user.findUnique({"),
  );
  assert.doesNotMatch(resend, /@\/lib\/prisma/);
  assert.doesNotMatch(resend, /prisma\.user\.(create|update|upsert)/);
  assert.doesNotMatch(otp, /@\/lib\/prisma/);
  assert.doesNotMatch(
    otp,
    /(emailVerificationOtp|registrationSecurityEvent|emailLog)\.(create|update|upsert)/,
  );
  assert.match(otp, /createCipheriv\("aes-256-gcm"/);
  assert.match(otp, /httpOnly: true/);
});

test("a verified challenge creates an active student before starting a session", async () => {
  const verify = await source("app/api/auth/verify-registration-otp/route.ts");
  const verifyIndex = verify.indexOf("verifyRegistrationOtp({");
  const createIndex = verify.indexOf("prisma.user.create({");
  const sessionIndex = verify.indexOf("startAuthenticatedSession({");

  assert.ok(verifyIndex >= 0);
  assert.ok(createIndex > verifyIndex);
  assert.ok(sessionIndex > createIndex);
  assert.match(verify, /role: "STUDENT"/);
  assert.match(verify, /accountStatus: "ACTIVE"/);
  assert.match(verify, /emailVerifiedAt: new Date\(\)/);
  assert.doesNotMatch(verify, /prisma\.user\.update/);
});

test("registration OTP abuse controls are bounded in memory", async () => {
  const otp = await source("lib/registration-otp.ts");

  assert.match(otp, /MAX_EMAIL_OTPS_PER_HOUR = 5/);
  assert.match(otp, /MAX_IP_OTPS_PER_HOUR = 20/);
  assert.match(otp, /MAX_DEVICE_OTPS_PER_HOUR = 10/);
  assert.match(otp, /RATE_LIMIT_STORE_MAX_KEYS = 10_000/);
  assert.match(otp, /pruneRateLimitStore/);
  assert.match(otp, /consumeVerificationAttempt/);
  assert.match(otp, /REGISTRATION_OTP_MAX_ATTEMPTS/);
});
