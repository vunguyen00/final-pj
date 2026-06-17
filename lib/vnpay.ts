import { createHmac, timingSafeEqual } from "node:crypto";

export type VnpayConfig = {
  tmnCode: string;
  hashSecret: string;
  paymentUrl: string;
  apiUrl: string;
  baseUrl: string;
  returnUrl: string;
  ipnUrl: string;
};

function normalizeBaseUrl(baseUrl: string) {
  const parsed = new URL(baseUrl);
  const host = parsed.hostname.toLowerCase();
  const isLocal = host === "localhost" || host === "127.0.0.1";
  if (!isLocal) {
    parsed.protocol = "https:";
  }
  return parsed.origin;
}

function inferBaseUrlFromRequest(request?: Request | null) {
  if (!request) return null;
  // When ngrok restarts and domain changes, this keeps callback URLs aligned with current request host.
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) return null;
  const proto = request.headers.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

function joinUrl(base: string, path: string) {
  return new URL(path, base).toString();
}

function readVnpEnv(name: string, fallback = "") {
  const value = String(process.env[name] ?? fallback).trim();
  if (value.length < 2) return value;

  const first = value[0];
  const last = value[value.length - 1];
  if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
    return value.slice(1, -1).trim();
  }

  return value;
}

export function getVnpayConfig(request?: Request | null): VnpayConfig {
  const tmnCode = readVnpEnv("VNPAY_TMN_CODE");
  const hashSecret = readVnpEnv("VNPAY_HASH_SECRET");
  const paymentUrl = readVnpEnv("VNPAY_PAYMENT_URL", readVnpEnv("VNPAY_URL"));
  const apiUrl = readVnpEnv("VNPAY_API");
  const defaultBaseUrl = readVnpEnv("VNPAY_BASE_URL");
  const configuredReturnUrl = readVnpEnv("VNPAY_RETURN_URL");
  const configuredIpnUrl = readVnpEnv("VNPAY_IPN_URL");
  const returnPath = readVnpEnv("VNPAY_RETURN_PATH", "/api/wallet/vnpay-return");
  const ipnPath = readVnpEnv("VNPAY_IPN_PATH", "/api/wallet/vnpay-ipn");

  if (!tmnCode || !hashSecret || !paymentUrl || !apiUrl || !defaultBaseUrl || !returnPath || !ipnPath) {
    throw new Error("VNPAY_CONFIG_MISSING");
  }

  const requestBaseUrl = inferBaseUrlFromRequest(request);
  const baseUrl = normalizeBaseUrl(requestBaseUrl ?? defaultBaseUrl);
  const returnUrl = requestBaseUrl ? joinUrl(baseUrl, returnPath) : configuredReturnUrl || joinUrl(baseUrl, returnPath);
  const ipnUrl = requestBaseUrl ? joinUrl(baseUrl, ipnPath) : configuredIpnUrl || joinUrl(baseUrl, ipnPath);

  return { tmnCode, hashSecret, paymentUrl, apiUrl, baseUrl, returnUrl, ipnUrl };
}

export function sortObject(obj: Record<string, string | number>) {
  const sorted: Record<string, string> = {};
  const keys = Object.keys(obj).sort();

  for (const key of keys) {
    const value = obj[key];
    if (value === undefined || value === null) continue;
    const clean = String(value).trim();
    if (!clean) continue;
    sorted[key] = clean;
  }

  return sorted;
}

function vnpEncode(input: string) {
  return encodeURIComponent(input).replace(/%20/g, "+");
}

export function buildVnpQuery(params: Record<string, string | number>) {
  return Object.entries(params)
    .map(([key, value]) => `${vnpEncode(key)}=${vnpEncode(String(value))}`)
    .join("&");
}

export function signVnpParams(params: Record<string, string | number>, hashSecret: string) {
  const sorted = sortObject(params);
  const signData = buildVnpQuery(sorted);
  const signature = createHmac("sha512", hashSecret).update(Buffer.from(signData, "utf-8")).digest("hex");
  return { sorted, signature, signData };
}

export function verifyVnpParams(params: Record<string, string>, hashSecret: string) {
  const cloned = { ...params };
  const secureHash = cloned.vnp_SecureHash;
  delete cloned.vnp_SecureHash;
  delete cloned.vnp_SecureHashType;

  if (!secureHash) return false;

  const { signature } = signVnpParams(cloned, hashSecret);
  const expected = Buffer.from(signature, "utf8");
  const received = Buffer.from(secureHash, "utf8");
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export function createTxnRef() {
  const now = new Date();
  const yyyy = now.getFullYear().toString();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mi = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  const ms = String(now.getMilliseconds()).padStart(3, "0");
  const rand = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
  return `${yyyy}${mm}${dd}${hh}${mi}${ss}${ms}${rand}`;
}

export function formatVnpDate(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const yyyy = parts.find((part) => part.type === "year")?.value ?? "";
  const mm = parts.find((part) => part.type === "month")?.value ?? "";
  const dd = parts.find((part) => part.type === "day")?.value ?? "";
  const hh = parts.find((part) => part.type === "hour")?.value ?? "";
  const mi = parts.find((part) => part.type === "minute")?.value ?? "";
  const ss = parts.find((part) => part.type === "second")?.value ?? "";
  return `${yyyy}${mm}${dd}${hh}${mi}${ss}`;
}

export function normalizeIpAddr(rawIp: string | null) {
  if (!rawIp) return "127.0.0.1";
  const first = rawIp.split(",")[0]?.trim() ?? "";
  if (!first || first === "::1" || first === "::ffff:127.0.0.1") {
    return "127.0.0.1";
  }
  return first.replace("::ffff:", "");
}

export function getRequestIpAddr(request: Request) {
  return normalizeIpAddr(request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip"));
}
