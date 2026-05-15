import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getUserBalance, getWalletTransactions } from "@/lib/wallet";
import { getAiPointsSummary } from "@/lib/ai-points";

export async function GET() {
  try {
    const user = await requireUser();
    if (user.role === "ADMIN") {
      return NextResponse.json({ error: "Admin khong su dung vi." }, { status: 403 });
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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
