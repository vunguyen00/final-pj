import { NextRequest, NextResponse } from "next/server";
import { getVnpayConfig, verifyVnpParams } from "@/lib/vnpay";
import { markTopUpResultByTxnRef } from "@/lib/wallet";

export async function GET(request: NextRequest) {
  try {
    const config = getVnpayConfig(request);
    const query = Object.fromEntries(request.nextUrl.searchParams.entries());
    console.log("[VNPAY][RETURN] query", query);

    const isValid = verifyVnpParams(query, config.hashSecret);
    console.log("[VNPAY][RETURN] signatureValid", isValid);
    if (!isValid) {
      return NextResponse.redirect(new URL("/student/wallet?payment=failed&code=97", request.url));
    }

    const txnRef = query.vnp_TxnRef;
    const responseCode = query.vnp_ResponseCode ?? "99";

    if (!txnRef) {
      return NextResponse.redirect(new URL("/student/wallet?payment=failed&code=01", request.url));
    }

    await markTopUpResultByTxnRef({
      txnRef,
      responseCode,
    });
    console.log("[VNPAY][RETURN] updated payment", { txnRef, responseCode });

    if (responseCode === "00") {
      return NextResponse.redirect(new URL("/student/wallet?payment=success", request.url));
    }

    return NextResponse.redirect(new URL(`/student/wallet?payment=failed&code=${responseCode}`, request.url));
  } catch (error) {
    console.error("[VNPAY][RETURN] unexpected error", error);
    return NextResponse.redirect(new URL("/student/wallet?payment=failed&code=99", request.url));
  }
}
