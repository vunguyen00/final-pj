import { NextRequest, NextResponse } from "next/server";
import {
  AI_POINT_PAYMENT_PURPOSE,
  AI_POINT_PAYMENT_STATUS,
  confirmAiPointPaymentFromVnpay,
  getAiPointPaymentStatusByTxnRef,
} from "@/lib/ai-points";
import { getVnpayConfig, verifyVnpParams } from "@/lib/vnpay";
import { isSafeLocalReturnPath } from "@/lib/ai-point-purchase-flow";

type PurchaseReturnContext = {
  returnTo: string;
  isPopupPurchase: boolean;
};

function beansRedirect(
  baseUrl: string,
  payment: string,
  context: PurchaseReturnContext,
  code?: string,
  txnRef?: string,
) {
  const url = new URL("/student/wallet", baseUrl);
  url.searchParams.set("payment", payment);
  if (context.returnTo) {
    url.searchParams.set("returnTo", context.returnTo);
  }
  if (context.isPopupPurchase) {
    url.searchParams.set("purchaseFlow", "popup");
  }
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
  const context: PurchaseReturnContext = {
    returnTo: isSafeLocalReturnPath(request.nextUrl.searchParams.get("returnTo"))
      ? request.nextUrl.searchParams.get("returnTo")!
      : "",
    isPopupPurchase: request.nextUrl.searchParams.get("purchaseFlow") === "popup",
  };

  try {
    const config = getVnpayConfig(request);
    redirectBaseUrl = config.baseUrl;
    const query = Object.fromEntries(request.nextUrl.searchParams.entries());
    const signedVnpQuery = Object.fromEntries(
      Object.entries(query).filter(([key]) => key.startsWith("vnp_")),
    );
    const txnRef = query.vnp_TxnRef;
    const responseCode = query.vnp_ResponseCode ?? "99";
    const transactionStatus = query.vnp_TransactionStatus ?? "99";
    const amountInMinorUnit = Number(query.vnp_Amount ?? NaN);

    if (!verifyVnpParams(signedVnpQuery, config.hashSecret)) {
      return beansRedirect(redirectBaseUrl, "invalid_signature", context);
    }

    if (!txnRef) {
      return beansRedirect(redirectBaseUrl, "failed", context, "01");
    }

    const payment = await getAiPointPaymentStatusByTxnRef(txnRef);
    if (!payment || payment.purpose !== AI_POINT_PAYMENT_PURPOSE) {
      return beansRedirect(redirectBaseUrl, "failed", context, "01");
    }

    if (payment.amount * 100 !== amountInMinorUnit) {
      return beansRedirect(redirectBaseUrl, "failed", context, "04", txnRef);
    }

    if (payment.status === AI_POINT_PAYMENT_STATUS.PAID || payment.status === AI_POINT_PAYMENT_STATUS.USED) {
      return beansRedirect(redirectBaseUrl, "success", context, undefined, txnRef);
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
        return beansRedirect(redirectBaseUrl, "success", context, undefined, txnRef);
      }
    }

    if (responseCode === "24") {
      return beansRedirect(redirectBaseUrl, "cancelled", context, responseCode, txnRef);
    }

    return beansRedirect(redirectBaseUrl, "failed", context, responseCode, txnRef);
  } catch (error) {
    console.error("[VNPAY][AI_POINTS_RETURN] unexpected error", error);
    return beansRedirect(redirectBaseUrl, "failed", context, "99");
  }
}
