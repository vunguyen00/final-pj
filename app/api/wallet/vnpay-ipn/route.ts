import { NextRequest, NextResponse } from "next/server";
import { confirmTopUpFromIpn, findTopUpByTxnRef, PAYMENT_STATUS } from "@/lib/wallet";
import { getVnpayConfig, verifyVnpParams } from "@/lib/vnpay";

export async function GET(request: NextRequest) {
  try {
    const config = getVnpayConfig(request);
    const query = Object.fromEntries(request.nextUrl.searchParams.entries());
    const txnRef = query.vnp_TxnRef;
    const responseCode = query.vnp_ResponseCode ?? "99";
    const transactionStatus = query.vnp_TransactionStatus ?? "99";
    const amountInMinorUnit = Number(query.vnp_Amount ?? NaN);

    console.log("[VNPAY][IPN] received", { txnRef, responseCode, transactionStatus });
    const isValid = verifyVnpParams(query, config.hashSecret);
    console.log("[VNPAY][IPN] checksum result", { txnRef, isValid });

    if (!isValid) {
      return NextResponse.json({ RspCode: "97", Message: "Checksum failed" });
    }

    if (!txnRef) {
      return NextResponse.json({ RspCode: "01", Message: "Order not found" });
    }

    const payment = await findTopUpByTxnRef(txnRef);
    if (!payment) {
      console.warn("[VNPAY][IPN] order not found", { txnRef });
      return NextResponse.json({ RspCode: "01", Message: "Order not found" });
    }

    const expectedMinorUnit = payment.amount * 100;
    const amountMatches = Number.isFinite(amountInMinorUnit) && expectedMinorUnit === amountInMinorUnit;
    console.log("[VNPAY][IPN] amount check", {
      txnRef,
      expected: expectedMinorUnit,
      received: amountInMinorUnit,
      amountMatches,
    });
    if (!amountMatches) {
      console.warn("[VNPAY][IPN] amount mismatch", { txnRef, expected: expectedMinorUnit, received: amountInMinorUnit });
      return NextResponse.json({ RspCode: "04", Message: "Invalid amount" });
    }

    if (payment.status === PAYMENT_STATUS.SUCCESS) {
      console.log("[VNPAY][IPN] already confirmed", { txnRef, status: payment.status });
      return NextResponse.json({ RspCode: "02", Message: "Order already confirmed" });
    }

    const result = await confirmTopUpFromIpn({
      txnRef,
      responseCode,
      transactionStatus,
      bankCode: query.vnp_BankCode,
      payDate: query.vnp_PayDate,
      transactionNo: query.vnp_TransactionNo,
      rawResponse: query,
    });

    if (result.kind === "NOT_FOUND") {
      console.warn("[VNPAY][IPN] order not found inside transaction", { txnRef });
      return NextResponse.json({ RspCode: "01", Message: "Order not found" });
    }

    console.log("[VNPAY][IPN] payment status before/after", {
      txnRef,
      before: result.statusBefore,
      after: result.statusAfter,
      kind: result.kind,
    });

    if ("walletBalanceAfter" in result) {
      console.log("[VNPAY][IPN] wallet balance updated", {
        txnRef,
        amount: result.amount,
        before: result.walletBalanceBefore,
        after: result.walletBalanceAfter,
      });
    }

    if (result.kind === "ALREADY_SUCCESS") {
      return NextResponse.json({ RspCode: "02", Message: "Order already confirmed" });
    }

    return NextResponse.json({ RspCode: "00", Message: "Confirm Success" });
  } catch (error) {
    console.error("[VNPAY][IPN] unexpected error", error);
    return NextResponse.json({ RspCode: "99", Message: "Unknown error" });
  }
}
