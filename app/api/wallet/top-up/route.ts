import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "Chuc nang nap vi da duoc loai bo. Vui long mua khoa hoc hoac hat dau truc tiep qua VNPay.",
    },
    { status: 410 },
  );
}
