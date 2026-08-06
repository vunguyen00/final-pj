import { NextResponse } from "next/server";
import { clearAuthCookie, revokeCurrentSession } from "@/lib/auth";

export async function POST() {
  await revokeCurrentSession();
  await clearAuthCookie();

  return NextResponse.json({ ok: true });
}
