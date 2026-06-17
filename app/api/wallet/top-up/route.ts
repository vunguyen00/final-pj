import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createPendingTopUp, normalizeTopUpAmount } from "@/lib/wallet";
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
    if (!user) {
      return NextResponse.json({ error: "Bạn cần đăng nhập trước khi nạp tiền." }, { status: 401 });
    }

    if (user.role === "ADMIN") {
      return NextResponse.json({ error: "Admin không được nạp ví." }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const amount = normalizeTopUpAmount(body?.amount);

    if (amount === null) {
      return NextResponse.json(
        { error: "Số tiền nạp không hợp lệ. Số tiền tối thiểu là 10.000đ." },
        { status: 400 },
      );
    }

    const config = getVnpayConfig(request);
    let txnRef = "";
    let created = false;
    for (let attempt = 0; attempt < 5; attempt++) {
      txnRef = createTxnRef();
      const orderInfo = `Nap vi FinnCenter ${amount} VND - ${txnRef}`;
      try {
        await createPendingTopUp({
          userId: user.id,
          amount,
          txnRef,
          orderInfo,
        });
        created = true;
        console.log("[VNPAY][TOPUP] created pending payment", {
          txnRef,
          userId: user.id,
          amount,
        });
        break;
      } catch (e) {
        const code = (e as { code?: string })?.code;
        if (code !== "P2002") {
          throw e;
        }
      }
    }
    if (!created) {
      return NextResponse.json({ error: "Không tạo được mã giao dịch duy nhất." }, { status: 500 });
    }

    const now = new Date();
    const ipAddr = getRequestIpAddr(request);

    const amountInMinorUnit = amount * 100;
    const vnpParams: Record<string, string | number> = {
      vnp_Version: "2.1.0",
      vnp_Command: "pay",
      vnp_TmnCode: config.tmnCode,
      vnp_Locale: "vn",
      vnp_CurrCode: "VND",
      vnp_TxnRef: txnRef,
      vnp_OrderInfo: `Nap vi FinnCenter ${amount} VND - ${txnRef}`,
      vnp_OrderType: "other",
      vnp_Amount: amountInMinorUnit,
      vnp_ReturnUrl: config.returnUrl,
      vnp_IpnUrl: config.ipnUrl,
      vnp_IpAddr: ipAddr,
      vnp_CreateDate: formatVnpDate(now),
      vnp_ExpireDate: formatVnpDate(new Date(now.getTime() + 15 * 60 * 1000)),
    };

    const { sorted, signature, signData } = signVnpParams(vnpParams, config.hashSecret);
    const paymentQuery = buildVnpQuery({ ...sorted, vnp_SecureHash: signature });
    const paymentUrl = `${config.paymentUrl}${config.paymentUrl.includes("?") ? "&" : "?"}${paymentQuery}`;

    console.log("[VNPAY][TOPUP] generated callback urls", {
      tmnCode: config.tmnCode,
      baseUrl: config.baseUrl,
      returnUrl: config.returnUrl,
      ipnUrl: config.ipnUrl,
    });
    console.log("[VNPAY][TOPUP] vnp_Params", vnpParams);
    console.log("[VNPAY][TOPUP] signData", signData);
    console.log("[VNPAY][TOPUP] redirectUrl", paymentUrl);

    return NextResponse.json({ ok: true, paymentUrl, txnRef });
  } catch (error) {
    if (error instanceof Error && error.message === "VNPAY_CONFIG_MISSING") {
      return NextResponse.json(
        { error: "Thiếu cấu hình VNPAY trong biến môi trường (.env)." },
        { status: 500 },
      );
    }

    console.error("[VNPAY][TOPUP] unexpected error", error);
    return NextResponse.json({ error: "Lỗi hệ thống." }, { status: 500 });
  }
}
