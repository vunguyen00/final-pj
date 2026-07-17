import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MIN_REASON_LENGTH = 10;
const MAX_REASON_LENGTH = 500;
const REFUND_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_REFUND_PROGRESS = 50;

export async function POST(request: Request) {
  const user = await requireRole("STUDENT", "TEACHER");
  const body = (await request.json().catch(() => null)) as { courseId?: unknown; reason?: unknown } | null;
  const courseId = typeof body?.courseId === "string" ? body.courseId.trim() : "";
  const reason = typeof body?.reason === "string" ? body.reason.trim().slice(0, MAX_REASON_LENGTH) : "";

  if (!courseId || reason.length < MIN_REASON_LENGTH) {
    return NextResponse.json(
      { error: "Vui lòng nhập lý do hoàn tiền tối thiểu 10 ký tự." },
      { status: 400 },
    );
  }

  try {
    const [enrollment, orderItem, completedFeedbacks] = await Promise.all([
      prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: user.id, courseId } },
        include: {
          course: {
            include: {
              modules: {
                include: {
                  lessons: { select: { id: true } },
                },
              },
            },
          },
        },
      }),
      prisma.orderItem.findFirst({
        where: {
          courseId,
          order: { userId: user.id },
        },
        include: {
          course: { select: { id: true, name: true } },
          refundRequest: { select: { id: true, status: true } },
        },
        orderBy: { order: { createdAt: "desc" } },
      }),
      prisma.feedback.findMany({
        where: {
          userId: user.id,
          courseId,
          content: { startsWith: "PROGRESS:" },
        },
        select: { content: true },
      }),
    ]);

    if (!enrollment) {
      return NextResponse.json({ error: "Bạn chưa đăng ký khóa học này." }, { status: 404 });
    }

    if (!orderItem) {
      return NextResponse.json({ error: "Không tìm thấy giao dịch mua khóa học." }, { status: 404 });
    }

    if (Date.now() - enrollment.createdAt.getTime() > REFUND_WINDOW_MS) {
      return NextResponse.json({ error: "Khóa học đã quá thời hạn 7 ngày để yêu cầu hoàn tiền." }, { status: 400 });
    }

    const lessons = enrollment.course.modules.flatMap((module) => module.lessons);
    const completedLessons = new Set(completedFeedbacks.map((item) => item.content.replace("PROGRESS:", ""))).size;
    const progress = lessons.length ? Math.round((completedLessons / lessons.length) * 100) : 0;

    if (progress > MAX_REFUND_PROGRESS) {
      return NextResponse.json({ error: "Khóa học đã học quá 50%, không thể yêu cầu hoàn tiền." }, { status: 400 });
    }

    if (Math.round(orderItem.price) <= 0) {
      return NextResponse.json({ error: "Khóa học miễn phí không cần hoàn tiền." }, { status: 400 });
    }

    if (orderItem.refundRequest) {
      return NextResponse.json(
        {
          error:
            orderItem.refundRequest.status === "PENDING"
              ? "Yêu cầu hoàn tiền của khóa học này đang chờ admin xử lý."
              : "Khóa học này đã có yêu cầu hoàn tiền trước đó.",
        },
        { status: 409 },
      );
    }

    const refund = await prisma.$transaction(async (tx) => {
      const [created, admins] = await Promise.all([
        tx.courseRefundRequest.create({
          data: {
            studentId: user.id,
            courseId,
            orderItemId: orderItem.id,
            amount: Math.round(orderItem.price),
            reason,
            refundMethod: "EXTERNAL_ACCOUNT",
          },
          include: {
            course: { select: { id: true, name: true } },
            student: { select: { id: true, username: true, email: true } },
          },
        }),
        tx.user.findMany({
          where: { role: "ADMIN" },
          select: { id: true },
        }),
      ]);

      if (admins.length > 0) {
        await tx.notification.createMany({
          data: admins.map((admin) => ({
            userId: admin.id,
            title: "Có yêu cầu hoàn tiền mới",
            body: `${user.username} yêu cầu hoàn tiền khóa học "${orderItem.course.name}".`,
          })),
        });
      }

      return created;
    });

    return NextResponse.json({
      refund: {
        id: refund.id,
        status: refund.status,
        amount: refund.amount,
        reason: refund.reason,
        createdAt: refund.createdAt.toISOString(),
        course: refund.course,
      },
    });
  } catch (error) {
    console.error("Create course refund request failed", error);
    return NextResponse.json({ error: "Không thể gửi yêu cầu hoàn tiền." }, { status: 500 });
  }
}
