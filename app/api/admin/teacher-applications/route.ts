import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const applications = await prisma.teacherApplication.findMany({
    include: {
      user: { select: { id: true, username: true, email: true, phoneNumber: true, role: true } },
      language: true,
      certificates: true,
      recruitmentRound: { select: { id: true, name: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({
    applications,
  });
}
