import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { createTopUp, isValidTopUpAmount } from "@/lib/wallet";

export async function POST(request: Request) {
  try {
    const user = await requireRole("STUDENT");
    const body = await request.json();
    const amount = body?.amount;

    if (!isValidTopUpAmount(amount)) {
      return NextResponse.json(
        { error: "So tien nap khong hop le (toi thieu 10.000d)." },
        { status: 400 },
      );
    }

    await createTopUp(user.id, amount);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Loi he thong." }, { status: 500 });
  }
}

