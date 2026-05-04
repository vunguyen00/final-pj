import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserBalance } from "@/lib/wallet";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireRole("STUDENT");
    const { id: courseId } = await params;

    const [course, existing] = await Promise.all([
      prisma.course.findUnique({ where: { id: courseId } }),
      prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: user.id, courseId } },
      }),
    ]);

    if (!course) {
      return NextResponse.json({ error: "Khong tim thay khoa hoc." }, { status: 404 });
    }

    if (existing) {
      return NextResponse.json({ ok: true, alreadyEnrolled: true });
    }

    const balance = await getUserBalance(user.id);
    if (balance < course.price) {
      return NextResponse.json(
        {
          error: "So du khong du. Vui long nap them tien.",
          requiresTopUp: true,
          balance,
          price: course.price,
        },
        { status: 400 },
      );
    }

    await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          userId: user.id,
        },
      });

      await tx.orderItem.create({
        data: {
          orderId: order.id,
          courseId,
          price: course.price,
        },
      });

      await tx.enrollment.create({
        data: {
          userId: user.id,
          courseId,
        },
      });
    });

    return NextResponse.json({ ok: true, enrolled: true });
  } catch {
    return NextResponse.json({ error: "Loi he thong." }, { status: 500 });
  }
}

