import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createPendingTopUp, isValidTopUpAmount } from "@/lib/wallet";
import { createTxnRef, formatVnpDate, getVnpayConfig, normalizeIpAddr, signVnpParams } from "@/lib/vnpay";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    if (user.role === "ADMIN") {
      return NextResponse.json({ error: "Admin khong duoc nap vi." }, { status: 403 });
    }

    const body = await request.json();
    const amount = body?.amount;

    if (!isValidTopUpAmount(amount)) {
      return NextResponse.json(
        { error: "So tien nap khong hop le (toi thieu 10.000d)." },
        { status: 400 },
      );
    }

    const config = getVnpayConfig(request);
    let txnRef = "";
    let created = false;
    for (let attempt = 0; attempt < 5; attempt++) {
      txnRef = createTxnRef();
      try {
        await createPendingTopUp(user.id, amount, txnRef);
        created = true;
        break;
      } catch (e) {
        const code = (e as { code?: string })?.code;
        if (code !== "P2002") {
          throw e;
        }
      }
    }
    if (!created) {
      return NextResponse.json({ error: "Khong tao duoc ma giao dich duy nhat." }, { status: 500 });
    }

    const now = new Date();
    const ipAddr = normalizeIpAddr(request.headers.get("x-forwarded-for"));

    const amountInMinorUnit = Math.round(amount * 100);
    const vnpParams: Record<string, string | number> = {
      vnp_Version: "2.1.0",
      vnp_Command: "pay",
      vnp_TmnCode: config.tmnCode,
      vnp_Locale: "vn",
      vnp_CurrCode: "VND",
      vnp_TxnRef: txnRef,
      vnp_OrderInfo: `Nap vi cho user ${user.id} - ${txnRef}`,
      vnp_OrderType: "other",
      vnp_Amount: amountInMinorUnit,
      vnp_ReturnUrl: config.returnUrl,
      vnp_IpnUrl: config.ipnUrl,
      vnp_IpAddr: ipAddr,
      vnp_CreateDate: formatVnpDate(now),
      vnp_ExpireDate: formatVnpDate(new Date(now.getTime() + 15 * 60 * 1000)),
    };

    const { sorted, signature, signData } = signVnpParams(vnpParams, config.hashSecret);
    const paymentUrl = new URL(config.paymentUrl);
    for (const [key, value] of Object.entries(sorted)) {
      paymentUrl.searchParams.set(key, value);
    }
    paymentUrl.searchParams.set("vnp_SecureHash", signature);

    console.log("[VNPAY][TOPUP] config", {
      tmnCode: config.tmnCode,
      paymentUrl: config.paymentUrl,
      baseUrl: config.baseUrl,
      returnUrl: config.returnUrl,
      ipnUrl: config.ipnUrl,
    });
    console.log("[VNPAY][TOPUP] vnp_Params", vnpParams);
    console.log("[VNPAY][TOPUP] signData", signData);
    console.log("[VNPAY][TOPUP] secureHash", signature);
    console.log("[VNPAY][TOPUP] redirectUrl", paymentUrl.toString());

    return NextResponse.json({ ok: true, paymentUrl: paymentUrl.toString(), txnRef });
  } catch (error) {
    if (error instanceof Error && error.message === "VNPAY_CONFIG_MISSING") {
      return NextResponse.json(
        { error: "Thieu cau hinh VNPAY trong bien moi truong (.env)." },
        { status: 500 },
      );
    }

    if (error && typeof error === "object" && "digest" in error) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("[VNPAY][TOPUP] unexpected error", error);
    return NextResponse.json({ error: "Loi he thong." }, { status: 500 });
  }
}
