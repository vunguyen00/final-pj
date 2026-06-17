import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateCourseRevenueSplit } from "@/lib/revenue";
import { debitWalletForPurchase, getUserBalance } from "@/lib/wallet";

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
      prisma.course.findUnique({
        where: { id: courseId },
        include: {
          instructor: { select: { role: true } },
        },
      }),
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

    const coursePrice = Math.round(course.price);
    const revenueSplit = calculateCourseRevenueSplit(coursePrice, course.instructor?.role);
    const balance = await getUserBalance(user.id);
    if (balance < coursePrice) {
      return NextResponse.json(
        {
          error: "Số dư không đủ. Vui lòng nạp thêm tiền.",
          requiresTopUp: true,
          balance,
          price: coursePrice,
        },
        { status: 400 },
      );
    }

    const updatedBalance = await prisma.$transaction(async (tx) => {
      const walletBalance = await debitWalletForPurchase({
        tx,
        userId: user.id,
        amount: coursePrice,
      });

      const order = await tx.order.create({
        data: {
          userId: user.id,
        },
      });

      await tx.orderItem.create({
        data: {
          orderId: order.id,
          courseId,
          price: coursePrice,
          adminRevenue: revenueSplit.adminRevenue,
          teacherRevenue: revenueSplit.teacherRevenue,
          revenueSplit: revenueSplit.revenueSplit,
        },
      });

      await tx.enrollment.create({
        data: {
          userId: user.id,
          courseId,
        },
      });

      return walletBalance;
    });

    return NextResponse.json({ ok: true, enrolled: true, balance: updatedBalance });
  } catch (error) {
    if (error instanceof Error && error.message === "INSUFFICIENT_BALANCE") {
      return NextResponse.json(
        { error: "Số dư không đủ. Vui lòng nạp thêm tiền.", requiresTopUp: true },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: "Lỗi hệ thống." }, { status: 500 });
  }
}

