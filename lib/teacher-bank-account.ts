import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { getRequiredAuthSecret } from "@/lib/server-secret";

export const TEACHER_BANK_ACCOUNT_OTP_EXPIRES_MINUTES = 10;
export const TEACHER_BANK_ACCOUNT_OTP_MAX_ATTEMPTS = 5;

export type TeacherBankAccountPayload = {
  bankName: string;
  bankBranch: string;
  accountNumber: string;
  accountName: string;
};

function hashSecret(value: string) {
  return createHash("sha256")
    .update(`${getRequiredAuthSecret()}:${value}`)
    .digest("hex");
}

export function generateTeacherBankAccountOtp() {
  return String(randomInt(100000, 1000000));
}

export function hashTeacherBankAccountOtp(code: string) {
  return hashSecret(code);
}

export function verifyTeacherBankAccountOtp(code: string, expectedHash: string) {
  const left = Buffer.from(hashTeacherBankAccountOtp(code));
  const right = Buffer.from(expectedHash);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function normalizeTeacherBankAccountPayload(input: Record<string, unknown>): TeacherBankAccountPayload {
  return {
    bankName: cleanText(input.bankName, 100),
    bankBranch: cleanText(input.bankBranch, 100),
    accountNumber: cleanText(input.accountNumber, 30).replace(/\s/g, ""),
    accountName: cleanText(input.accountName, 100).toUpperCase(),
  };
}

export function validateTeacherBankAccountPayload(payload: TeacherBankAccountPayload) {
  if (!payload.bankName) return "Vui lòng nhập tên ngân hàng.";
  if (!/^[0-9]{6,30}$/.test(payload.accountNumber)) return "Số tài khoản phải có 6-30 chữ số.";
  if (!payload.accountName) return "Vui lòng nhập tên chủ tài khoản.";
  return "";
}

export function maskAccountNumber(accountNumber: string) {
  const last4 = accountNumber.slice(-4);
  return last4 ? `••••${last4}` : "";
}

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}
