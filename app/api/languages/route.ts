import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveLanguages } from "@/lib/teacher-onboarding";

export async function GET() {
  const languages = await getActiveLanguages();
  return NextResponse.json({ languages });
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const code = typeof body.code === "string" ? body.code.trim().toLowerCase() : "";

    if (!name || !code) {
      return NextResponse.json({ error: "Vui long nhap ten va ma ngon ngu." }, { status: 400 });
    }

    const language = await prisma.learningLanguage.create({
      data: { name, code },
    });

    return NextResponse.json({ language }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Loi he thong.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
