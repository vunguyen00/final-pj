import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth";
import { getUserBalance } from "@/lib/wallet";

export async function GET() {
  try {
    const user = await authenticate();

    if (!user) {
      return NextResponse.json({ user: null });
    }

    const balance = user.role === "STUDENT" ? await getUserBalance(user.id) : 0;

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        balance,
      },
    });
  } catch {
    return NextResponse.json({ user: null });
  }
}

