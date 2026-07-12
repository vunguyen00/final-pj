import { NextRequest, NextResponse } from "next/server";
import {
  COURSE_PAYMENT_STATUS,
  confirmCoursePaymentFromVnpay,
  getCoursePaymentStatusByTxnRef,
} from "@/lib/course-payment";
import { getVnpayConfig, verifyVnpParams } from "@/lib/vnpay";

function courseRedirect(baseUrl: string, courseId: string | null, payment: string, code?: string) {
  const url = new URL(courseId ? `/courses/${courseId}` : "/courses", baseUrl);
  url.searchParams.set("payment", payment);
  if (code) {
    url.searchParams.set("code", code);
  }
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  let redirectBaseUrl = request.nextUrl.origin;

  try {
    const config = getVnpayConfig(request);
    redirectBaseUrl = config.baseUrl;
    const query = Object.fromEntries(request.nextUrl.searchParams.entries());
    const txnRef = query.vnp_TxnRef;
    const responseCode = query.vnp_ResponseCode ?? "99";
    const transactionStatus = query.vnp_TransactionStatus ?? "99";
    const amountInMinorUnit = Number(query.vnp_Amount ?? NaN);

    if (!verifyVnpParams(query, config.hashSecret)) {
      return courseRedirect(redirectBaseUrl, null, "invalid_signature");
    }

    if (!txnRef) {
      return courseRedirect(redirectBaseUrl, null, "failed", "01");
    }

    const payment = await getCoursePaymentStatusByTxnRef(txnRef);
    if (!payment || !payment.courseId) {
      return courseRedirect(redirectBaseUrl, null, "failed", "01");
    }

    if (payment.amount * 100 !== amountInMinorUnit) {
      return courseRedirect(redirectBaseUrl, payment.courseId, "failed", "04");
    }

    if (payment.status === COURSE_PAYMENT_STATUS.PAID) {
      return courseRedirect(redirectBaseUrl, payment.courseId, "success");
    }

    if (payment.status === COURSE_PAYMENT_STATUS.PENDING) {
      const result = await confirmCoursePaymentFromVnpay({
        txnRef,
        responseCode,
        transactionStatus,
        bankCode: query.vnp_BankCode,
        payDate: query.vnp_PayDate,
        transactionNo: query.vnp_TransactionNo,
        rawResponse: query,
      });

      if (result.kind === "SUCCESS" || result.kind === "ALREADY_PAID") {
        return courseRedirect(redirectBaseUrl, payment.courseId, "success");
      }
    }

    if (responseCode === "24") {
      return courseRedirect(redirectBaseUrl, payment.courseId, "cancelled", responseCode);
    }

    return courseRedirect(redirectBaseUrl, payment.courseId, "failed", responseCode);
  } catch (error) {
    console.error("[VNPAY][COURSE_RETURN] unexpected error", error);
    return courseRedirect(redirectBaseUrl, null, "failed", "99");
  }
}
