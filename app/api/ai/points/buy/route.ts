import { NextResponse } from "next/server";
import {
  AI_POINT_PAYMENT_EXPIRE_MINUTES,
  AI_POINT_PRICE_VND,
  createPendingAiPointPayment,
  getAiPointPurchaseCost,
  normalizeAiPointAmount,
} from "@/lib/ai-points";
import { getCurrentUser } from "@/lib/auth";
import {
  buildVnpQuery,
  createTxnRef,
  formatVnpDate,
  getRequestIpAddr,
  getVnpayConfig,
  signVnpParams,
} from "@/lib/vnpay";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "STUDENT" && user.role !== "TEACHER" && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Ban chua dang nhap." }, { status: 401 });
    }
    if (user.role === "ADMIN") {
      return NextResponse.json({ error: "Admin khong can mua hat dau." }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const points = normalizeAiPointAmount(body?.beans ?? body?.points);
    if (points === null) {
      return NextResponse.json({ error: "So hat dau khong hop le." }, { status: 400 });
    }

    const amount = getAiPointPurchaseCost(points);
    const config = getVnpayConfig(request);
    let txnRef = "";
    let created = false;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      txnRef = createTxnRef();
      try {
        await createPendingAiPointPayment({
          userId: user.id,
          points,
          txnRef,
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
    const returnUrl = new URL("/api/ai/points/vnpay-return", config.baseUrl).toString();
    const vnpParams: Record<string, string | number> = {
      vnp_Version: "2.1.0",
      vnp_Command: "pay",
      vnp_TmnCode: config.tmnCode,
      vnp_Locale: "vn",
      vnp_CurrCode: "VND",
      vnp_TxnRef: txnRef,
      vnp_OrderInfo: `Mua ${points} hat dau ${txnRef}`,
      vnp_OrderType: "other",
      vnp_Amount: amount * 100,
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: getRequestIpAddr(request),
      vnp_CreateDate: formatVnpDate(now),
      vnp_ExpireDate: formatVnpDate(new Date(now.getTime() + AI_POINT_PAYMENT_EXPIRE_MINUTES * 60 * 1000)),
    };

    const { sorted, signature } = signVnpParams(vnpParams, config.hashSecret);
    const paymentQuery = buildVnpQuery({ ...sorted, vnp_SecureHash: signature });
    const paymentUrl = `${config.paymentUrl}${config.paymentUrl.includes("?") ? "&" : "?"}${paymentQuery}`;

    return NextResponse.json({
      ok: true,
      paymentUrl,
      txnRef,
      points,
      beans: points,
      amount,
      cost: amount,
      pricePerPoint: AI_POINT_PRICE_VND,
      beanPriceVnd: AI_POINT_PRICE_VND,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "VNPAY_CONFIG_MISSING") {
      return NextResponse.json({ error: "Thieu cau hinh VNPAY trong bien moi truong." }, { status: 500 });
    }

    console.error("[AI_POINTS][BUY] unexpected error", error);
    return NextResponse.json({ error: "Loi he thong." }, { status: 500 });
  }
}
