import { NextRequest, NextResponse } from "next/server";
import { getVnpayConfig, verifyVnpParams } from "@/lib/vnpay";
import { confirmTopUpFromIpn, getTopUpStatusByTxnRef, PAYMENT_STATUS } from "@/lib/wallet";

function walletRedirect(baseUrl: string, payment: string, code?: string) {
  const url = new URL("/wallet", baseUrl);
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

    console.log("[VNPAY][RETURN] received", { txnRef, responseCode, transactionStatus });

    const isValid = verifyVnpParams(query, config.hashSecret);
    console.log("[VNPAY][RETURN] checksum result", { txnRef, isValid });
    if (!isValid) {
      return walletRedirect(redirectBaseUrl, "invalid_signature");
    }

    if (!txnRef) {
      return walletRedirect(redirectBaseUrl, "failed", "01");
    }

    const payment = await getTopUpStatusByTxnRef(txnRef);
    console.log("[VNPAY][RETURN] payment status", {
      txnRef,
      status: payment?.status ?? "NOT_FOUND",
      responseCode,
      transactionStatus,
    });

    if (!payment) {
      return walletRedirect(redirectBaseUrl, "failed", "01");
    }

    if (payment.status === PAYMENT_STATUS.SUCCESS) {
      return walletRedirect(redirectBaseUrl, "success");
    }

    const expectedMinorUnit = payment.amount * 100;
    const amountMatches = Number.isFinite(amountInMinorUnit) && expectedMinorUnit === amountInMinorUnit;
    if (!amountMatches) {
      console.warn("[VNPAY][RETURN] amount mismatch", {
        txnRef,
        expected: expectedMinorUnit,
        received: amountInMinorUnit,
      });
      return walletRedirect(redirectBaseUrl, "failed", "04");
    }

    if (payment.status === PAYMENT_STATUS.PENDING) {
      const result = await confirmTopUpFromIpn({
        txnRef,
        responseCode,
        transactionStatus,
        bankCode: query.vnp_BankCode,
        payDate: query.vnp_PayDate,
        transactionNo: query.vnp_TransactionNo,
        rawResponse: query,
      });

      console.log("[VNPAY][RETURN] payment confirmed from return", {
        txnRef,
        responseCode,
        transactionStatus,
        kind: result.kind,
        statusAfter: "statusAfter" in result ? result.statusAfter : "NOT_FOUND",
      });

      if (result.kind === "SUCCESS" || result.kind === "ALREADY_SUCCESS") {
        return walletRedirect(redirectBaseUrl, "success");
      }
    }

    if (payment.status === PAYMENT_STATUS.FAILED || responseCode !== "00" || transactionStatus !== "00") {
      return walletRedirect(redirectBaseUrl, "failed", responseCode);
    }

    return walletRedirect(redirectBaseUrl, "pending");
  } catch (error) {
    console.error("[VNPAY][RETURN] unexpected error", error);
    return walletRedirect(redirectBaseUrl, "failed", "99");
  }
}
