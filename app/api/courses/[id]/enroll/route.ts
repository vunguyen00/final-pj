import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserBalance } from "@/lib/wallet";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    if (user.role !== "STUDENT" && user.role !== "TEACHER" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Bạn chưa đăng nhập." }, { status: 401 });
    }
    const { id: courseId } = await params;

    const [course, existing] = await Promise.all([
      prisma.course.findUnique({ where: { id: courseId } }),
      prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: user.id, courseId } },
      }),
    ]);

    if (!course) {
      return NextResponse.json({ error: "Không tìm thấy khóa học." }, { status: 404 });
    }

    if (course.status !== "ACTIVE" && course.instructorId !== user.id) {
      return NextResponse.json({ error: "Khóa học chưa được mở công khai." }, { status: 400 });
    }

    if (existing) {
      return NextResponse.json({ ok: true, alreadyEnrolled: true });
    }

    if (course.instructorId === user.id) {
      await prisma.enrollment.create({
        data: {
          userId: user.id,
          courseId,
        },
      });

      return NextResponse.json({ ok: true, enrolled: true, freeForInstructor: true });
    }

    const balance = await getUserBalance(user.id);
    if (balance < course.price) {
      return NextResponse.json(
        {
          error: "Số dư không đủ. Vui lòng nạp thêm tiền.",
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

    const updatedBalance = await getUserBalance(user.id);
    return NextResponse.json({ ok: true, enrolled: true, balance: updatedBalance });
  } catch {
    return NextResponse.json({ error: "Lỗi hệ thống." }, { status: 500 });
  }
}

