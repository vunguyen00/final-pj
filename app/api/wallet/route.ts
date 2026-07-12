import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      error:
        "Chuc nang vi da duoc loai bo. Vui long mua diem dau truc tiep tai /student/wallet hoac thanh toan khoa hoc truc tiep theo tung khoa.",
    },
    { status: 410 },
  );
}
