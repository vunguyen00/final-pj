import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    const normalizedEmail =
      typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!normalizedEmail) {
      return NextResponse.json({ error: "Email là bắt buộc." }, { status: 400 });
    }

    // Luôn trả lời giống nhau để không làm lộ email tồn tại hoặc role tài khoản.
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Dữ liệu gửi lên không hợp lệ." }, { status: 400 });
  }
}
