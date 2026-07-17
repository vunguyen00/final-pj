import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      error:
        "Hệ thống không sử dụng ví nội bộ. Hoàn tiền được xử lý bên ngoài và chuyển vào tài khoản của người dùng.",
    },
    { status: 410 },
  );
}
