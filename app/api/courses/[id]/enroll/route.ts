import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  COURSE_PAYMENT_EXPIRE_MINUTES,
  createPendingCoursePayment,
  normalizeCoursePrice,
} from "@/lib/course-payment";
import { prisma } from "@/lib/prisma";
import {
  buildVnpQuery,
  createTxnRef,
  formatVnpDate,
  getRequestIpAddr,
  getVnpayConfig,
  signVnpParams,
} from "@/lib/vnpay";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Ban chua dang nhap." }, { status: 401 });
    }
    if (user.role !== "STUDENT" && user.role !== "TEACHER" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Ban chua dang nhap." }, { status: 401 });
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
      return NextResponse.json({ error: "Khong tim thay khoa hoc." }, { status: 404 });
    }

    if (course.status !== "ACTIVE" && course.instructorId !== user.id) {
      return NextResponse.json({ error: "Khoa hoc chua duoc mo cong khai." }, { status: 400 });
    }

    if (existing) {
      return NextResponse.json({ ok: true, alreadyEnrolled: true, enrolled: true });
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

    const coursePrice = normalizeCoursePrice(course.price);
    if (coursePrice <= 0) {
      await prisma.enrollment.create({
        data: {
          userId: user.id,
          courseId,
        },
      });

      return NextResponse.json({ ok: true, enrolled: true, freeCourse: true });
    }

    const config = getVnpayConfig(request);
    let txnRef = "";
    let created = false;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      txnRef = createTxnRef();
      try {
        await createPendingCoursePayment({
          userId: user.id,
          courseId,
          amount: coursePrice,
          txnRef,
          orderInfo: `Mua khoa hoc ${course.name} ${txnRef}`,
        });
        created = true;
        break;
      } catch (error) {
        const code = (error as { code?: string })?.code;
        if (code !== "P2002") throw error;
      }
    }

    if (!created) {
      return NextResponse.json({ error: "Khong tao duoc ma giao dich duy nhat." }, { status: 500 });
    }

    const now = new Date();
    const returnUrl = new URL("/api/payments/vnpay-return", config.baseUrl).toString();
    const vnpParams: Record<string, string | number> = {
      vnp_Version: "2.1.0",
      vnp_Command: "pay",
      vnp_TmnCode: config.tmnCode,
      vnp_Locale: "vn",
      vnp_CurrCode: "VND",
      vnp_TxnRef: txnRef,
      vnp_OrderInfo: `Mua khoa hoc ${course.name} ${txnRef}`,
      vnp_OrderType: "other",
      vnp_Amount: coursePrice * 100,
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: getRequestIpAddr(request),
      vnp_CreateDate: formatVnpDate(now),
      vnp_ExpireDate: formatVnpDate(new Date(now.getTime() + COURSE_PAYMENT_EXPIRE_MINUTES * 60 * 1000)),
    };

    const { sorted, signature } = signVnpParams(vnpParams, config.hashSecret);
    const paymentQuery = buildVnpQuery({ ...sorted, vnp_SecureHash: signature });
    const paymentUrl = `${config.paymentUrl}${config.paymentUrl.includes("?") ? "&" : "?"}${paymentQuery}`;

    return NextResponse.json({ ok: true, paymentUrl, txnRef, amount: coursePrice });
  } catch (error) {
    if (error instanceof Error && error.message === "VNPAY_CONFIG_MISSING") {
      return NextResponse.json({ error: "Thieu cau hinh VNPAY trong bien moi truong." }, { status: 500 });
    }

    console.error("Create course payment failed", error);
    return NextResponse.json({ error: "Loi he thong." }, { status: 500 });
  }
}
