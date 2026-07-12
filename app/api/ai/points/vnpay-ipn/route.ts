import { NextRequest, NextResponse } from "next/server";
import {
  AI_POINT_PAYMENT_PURPOSE,
  AI_POINT_PAYMENT_STATUS,
  confirmAiPointPaymentFromVnpay,
  getAiPointPaymentStatusByTxnRef,
} from "@/lib/ai-points";
import { getVnpayConfig, verifyVnpParams } from "@/lib/vnpay";

export async function GET(request: NextRequest) {
  try {
    const config = getVnpayConfig(request);
    const query = Object.fromEntries(request.nextUrl.searchParams.entries());
    const txnRef = query.vnp_TxnRef;
    const responseCode = query.vnp_ResponseCode ?? "99";
    const transactionStatus = query.vnp_TransactionStatus ?? "99";
    const amountInMinorUnit = Number(query.vnp_Amount ?? NaN);

    if (!verifyVnpParams(query, config.hashSecret)) {
      return NextResponse.json({ RspCode: "97", Message: "Checksum failed" });
    }

    if (!txnRef) {
      return NextResponse.json({ RspCode: "01", Message: "Order not found" });
    }

    const payment = await getAiPointPaymentStatusByTxnRef(txnRef);
    if (!payment || payment.purpose !== AI_POINT_PAYMENT_PURPOSE) {
      return NextResponse.json({ RspCode: "01", Message: "Order not found" });
    }

    if (payment.amount * 100 !== amountInMinorUnit) {
      return NextResponse.json({ RspCode: "04", Message: "Invalid amount" });
    }

    if (payment.status === AI_POINT_PAYMENT_STATUS.PAID) {
      return NextResponse.json({ RspCode: "02", Message: "Order already confirmed" });
    }

    await confirmAiPointPaymentFromVnpay({
      txnRef,
      responseCode,
      transactionStatus,
      bankCode: query.vnp_BankCode,
      payDate: query.vnp_PayDate,
      transactionNo: query.vnp_TransactionNo,
      rawResponse: query,
    });

    return NextResponse.json({ RspCode: "00", Message: "Confirm Success" });
  } catch (error) {
    console.error("[VNPAY][AI_POINTS_IPN] unexpected error", error);
    return NextResponse.json({ RspCode: "99", Message: "Unknown error" });
  }
}
