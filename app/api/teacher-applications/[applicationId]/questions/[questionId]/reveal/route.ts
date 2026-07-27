import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error: "QUESTION_NO_LONGER_AVAILABLE",
      message: "Câu hỏi chỉ được cung cấp qua phiên thi tuần tự hiện tại.",
    },
    { status: 410 },
  );
}
