import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getUserBalance, getWalletTransactions } from "@/lib/wallet";
import { getAiPointsSummary } from "@/lib/ai-points";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Bạn cần đăng nhập để xem ví." }, { status: 401 });
    }

    if (user.role === "ADMIN") {
      return NextResponse.json({ error: "Admin không sử dụng ví." }, { status: 403 });
    }

    const [balance, aiPoints, transactions] = await Promise.all([
      getUserBalance(user.id),
      getAiPointsSummary(user.id),
      getWalletTransactions(user.id),
    ]);

    return NextResponse.json({
      balance,
      aiPoints,
      transactions,
    });
  } catch {
    return NextResponse.json({ error: "Lỗi hệ thống." }, { status: 500 });
  }
}
