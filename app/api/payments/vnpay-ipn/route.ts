import { NextRequest, NextResponse } from "next/server";
import {
  COURSE_PAYMENT_STATUS,
  confirmCoursePaymentFromVnpay,
  getCoursePaymentStatusByTxnRef,
} from "@/lib/course-payment";
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

    const payment = await getCoursePaymentStatusByTxnRef(txnRef);
    if (!payment || !payment.courseId) {
      return NextResponse.json({ RspCode: "01", Message: "Order not found" });
    }

    if (payment.amount * 100 !== amountInMinorUnit) {
      return NextResponse.json({ RspCode: "04", Message: "Invalid amount" });
    }

    if (payment.status === COURSE_PAYMENT_STATUS.PAID) {
      return NextResponse.json({ RspCode: "02", Message: "Order already confirmed" });
    }

    await confirmCoursePaymentFromVnpay({
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
    console.error("[VNPAY][COURSE_IPN] unexpected error", error);
    return NextResponse.json({ RspCode: "99", Message: "Unknown error" });
  }
}
