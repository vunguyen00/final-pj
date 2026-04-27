import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth";

export async function GET() {
  try {
    const user = await authenticate();
    
    if (!user) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch {
    return NextResponse.json({ user: null });
  }
}