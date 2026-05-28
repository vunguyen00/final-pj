import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ applicationId: string }> },
) {
  try {
    const user = await requireUser();
    const { applicationId } = await params;
    const body = await request.json();

    const application = await prisma.teacherApplication.findUnique({
      where: { id: applicationId },
      select: { userId: true, status: true },
    });

    if (!application || application.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (application.status !== "DRAFT") {
      return NextResponse.json({ ok: true, ignored: true });
    }

    await prisma.teacherApplication.update({
      where: { id: applicationId },
      data: { answerState: body.answers ?? {} },
    });

    return NextResponse.json({ ok: true, savedAt: new Date().toISOString() });
  } catch {
    return NextResponse.json({ error: "Loi he thong." }, { status: 500 });
  }
}
