import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getUserBalance } from "@/lib/wallet";

export async function GET() {
  try {
    const user = await requireRole("STUDENT");
    const balance = await getUserBalance(user.id);

    return NextResponse.json({ balance });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

