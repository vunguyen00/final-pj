import { NextRequest, NextResponse } from "next/server";
import { getVnpayConfig, verifyVnpParams } from "@/lib/vnpay";
import { getTopUpStatusByTxnRef, PAYMENT_STATUS } from "@/lib/wallet";

function walletRedirect(request: NextRequest, payment: string, code?: string) {
  const url = new URL("/wallet", request.url);
  url.searchParams.set("payment", payment);
  if (code) {
    url.searchParams.set("code", code);
  }
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  try {
    const config = getVnpayConfig(request);
    const query = Object.fromEntries(request.nextUrl.searchParams.entries());
    const txnRef = query.vnp_TxnRef;
    const responseCode = query.vnp_ResponseCode ?? "99";
    const transactionStatus = query.vnp_TransactionStatus ?? "99";

    console.log("[VNPAY][RETURN] received", { txnRef, responseCode, transactionStatus });

    const isValid = verifyVnpParams(query, config.hashSecret);
    console.log("[VNPAY][RETURN] checksum result", { txnRef, isValid });
    if (!isValid) {
      return walletRedirect(request, "invalid_signature");
    }

    if (!txnRef) {
      return walletRedirect(request, "failed", "01");
    }

    const payment = await getTopUpStatusByTxnRef(txnRef);
    console.log("[VNPAY][RETURN] payment status", {
      txnRef,
      status: payment?.status ?? "NOT_FOUND",
      responseCode,
      transactionStatus,
    });

    if (!payment) {
      return walletRedirect(request, "failed", "01");
    }

    if (payment.status === PAYMENT_STATUS.SUCCESS) {
      return walletRedirect(request, "success");
    }

    if (payment.status === PAYMENT_STATUS.FAILED || responseCode !== "00" || transactionStatus !== "00") {
      return walletRedirect(request, "failed", responseCode);
    }

    return walletRedirect(request, "pending");
  } catch (error) {
    console.error("[VNPAY][RETURN] unexpected error", error);
    return walletRedirect(request, "failed", "99");
  }
}
