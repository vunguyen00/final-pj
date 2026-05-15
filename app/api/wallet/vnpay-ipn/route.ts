import { NextRequest, NextResponse } from "next/server";
import { findTopUpByTxnRef, markTopUpResultByTxnRef } from "@/lib/wallet";
import { getVnpayConfig, verifyVnpParams } from "@/lib/vnpay";

export async function GET(request: NextRequest) {
  try {
    const config = getVnpayConfig(request);
    const query = Object.fromEntries(request.nextUrl.searchParams.entries());
    console.log("[VNPAY][IPN] query", query);
    const isValid = verifyVnpParams(query, config.hashSecret);
    console.log("[VNPAY][IPN] signatureValid", isValid);

    if (!isValid) {
      return NextResponse.json({ RspCode: "97", Message: "Checksum failed" });
    }

    const txnRef = query.vnp_TxnRef;
    const responseCode = query.vnp_ResponseCode ?? "99";
    const amountInMinorUnit = Number(query.vnp_Amount ?? 0);

    if (!txnRef) {
      return NextResponse.json({ RspCode: "01", Message: "Order not found" });
    }

    const payment = await findTopUpByTxnRef(txnRef);
    if (!payment?.payment) {
      console.warn("[VNPAY][IPN] order not found", { txnRef });
      return NextResponse.json({ RspCode: "01", Message: "Order not found" });
    }

    const expectedMinorUnit = Math.round(payment.payment.amount * 100);
    if (!Number.isFinite(amountInMinorUnit) || expectedMinorUnit !== amountInMinorUnit) {
      console.warn("[VNPAY][IPN] amount mismatch", { txnRef, expected: expectedMinorUnit, received: amountInMinorUnit });
      return NextResponse.json({ RspCode: "04", Message: "Amount invalid" });
    }

    const result = await markTopUpResultByTxnRef({
      txnRef,
      responseCode,
    });

    if (!result.updated && result.reason === "ALREADY_FINAL") {
      console.log("[VNPAY][IPN] already finalized", { txnRef, status: payment.payment.status });
      return NextResponse.json({ RspCode: "02", Message: "This order has been updated to the payment status" });
    }

    console.log("[VNPAY][IPN] updated payment", { txnRef, responseCode });
    return NextResponse.json({ RspCode: "00", Message: "Success" });
  } catch (error) {
    console.error("[VNPAY][IPN] unexpected error", error);
    return NextResponse.json({ RspCode: "99", Message: "Unknown error" });
  }
}
