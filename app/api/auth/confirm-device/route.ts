import { NextResponse } from "next/server";
import { ROLE_HOME, confirmLoginDevice } from "@/lib/auth";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { token?: unknown } | null;
  const token = typeof body?.token === "string" ? body.token.trim() : "";
  if (!token) {
    return NextResponse.json({ error: "Liên kết xác nhận không hợp lệ." }, { status: 400 });
  }

  const user = await confirmLoginDevice(token, request);
  if (!user) {
    return NextResponse.json(
      { error: "Liên kết xác nhận đã hết hạn hoặc đã được sử dụng." },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, redirectTo: ROLE_HOME[user.role] });
}
