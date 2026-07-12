import { NextRequest, NextResponse } from "next/server";
import {
  AI_POINT_PAYMENT_PURPOSE,
  AI_POINT_PAYMENT_STATUS,
  confirmAiPointPaymentFromVnpay,
  getAiPointPaymentStatusByTxnRef,
} from "@/lib/ai-points";
import { getVnpayConfig, verifyVnpParams } from "@/lib/vnpay";

function beansRedirect(baseUrl: string, payment: string, code?: string, txnRef?: string) {
  const url = new URL("/student/wallet", baseUrl);
  url.searchParams.set("payment", payment);
  if (code) {
    url.searchParams.set("code", code);
  }
  if (txnRef) {
    url.searchParams.set("txnRef", txnRef);
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
      return beansRedirect(redirectBaseUrl, "invalid_signature");
    }

    if (!txnRef) {
      return beansRedirect(redirectBaseUrl, "failed", "01");
    }

    const payment = await getAiPointPaymentStatusByTxnRef(txnRef);
    if (!payment || payment.purpose !== AI_POINT_PAYMENT_PURPOSE) {
      return beansRedirect(redirectBaseUrl, "failed", "01");
    }

    if (payment.amount * 100 !== amountInMinorUnit) {
      return beansRedirect(redirectBaseUrl, "failed", "04", txnRef);
    }

    if (payment.status === AI_POINT_PAYMENT_STATUS.PAID || payment.status === AI_POINT_PAYMENT_STATUS.USED) {
      return beansRedirect(redirectBaseUrl, "success", undefined, txnRef);
    }

    if (payment.status === AI_POINT_PAYMENT_STATUS.PENDING) {
      const result = await confirmAiPointPaymentFromVnpay({
        txnRef,
        responseCode,
        transactionStatus,
        bankCode: query.vnp_BankCode,
        payDate: query.vnp_PayDate,
        transactionNo: query.vnp_TransactionNo,
        rawResponse: query,
      });

      if (result.kind === "SUCCESS" || result.kind === "ALREADY_PAID") {
        return beansRedirect(redirectBaseUrl, "success", undefined, txnRef);
      }
    }

    if (responseCode === "24") {
      return beansRedirect(redirectBaseUrl, "cancelled", responseCode, txnRef);
    }

    return beansRedirect(redirectBaseUrl, "failed", responseCode, txnRef);
  } catch (error) {
    console.error("[VNPAY][AI_POINTS_RETURN] unexpected error", error);
    return beansRedirect(redirectBaseUrl, "failed", "99");
  }
}
