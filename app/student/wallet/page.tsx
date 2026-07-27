import { getAiPointsSummary } from "@/lib/ai-points";
import { requireUser } from "@/lib/auth";
import { isSafeLocalReturnPath } from "@/lib/ai-point-purchase-flow";
import WalletClient, { type WalletData } from "./WalletClient";

type PageProps = {
  searchParams: Promise<{
    payment?: string;
    code?: string;
    returnTo?: string;
    purchaseFlow?: string;
  }>;
};

const EMPTY_WALLET_DATA: WalletData = {
  aiPoints: { earned: 0, spent: 0, available: 0, pointPriceVnd: 1000 },
  transactions: [],
};

function paymentMessage(payment: string | null, code: string | null) {
  if (payment === "success") return "Mua điểm đậu thành công. Số điểm đã được cộng vào tài khoản.";
  if (payment === "failed") return `Thanh toán không thành công${code ? ` (mã: ${code})` : ""}.`;
  if (payment === "cancelled") return "Bạn đã hủy thanh toán mua điểm đậu.";
  if (payment === "pending") return "Thanh toán đã được ghi nhận và đang chờ VNPay xác nhận.";
  if (payment === "invalid_signature") return "Không thể xác thực chữ ký trả về từ VNPay.";
  return "";
}

export default async function StudentWalletPage({ searchParams }: PageProps) {
  const [params, user] = await Promise.all([searchParams, requireUser()]);
  const payment = params.payment ?? null;
  const notice = {
    message: paymentMessage(payment, params.code ?? null),
    isError: payment === "failed" || payment === "invalid_signature",
  };
  const returnTo = isSafeLocalReturnPath(params.returnTo) ? params.returnTo : "";
  const isPopupPurchase = params.purchaseFlow === "popup";

  if (user.role === "ADMIN") {
    return (
      <WalletClient
        initialData={EMPTY_WALLET_DATA}
        initialNotice={{
          message: notice.message || "Admin không cần mua điểm đậu.",
          isError: Boolean(notice.message),
        }}
        canBuy={false}
        returnTo={returnTo}
        isPopupPurchase={isPopupPurchase}
        payment={payment}
      />
    );
  }

  let walletData = EMPTY_WALLET_DATA;
  let walletNotice = notice;
  let canBuy = true;

  try {
    const aiPoints = await getAiPointsSummary(user.id);
    walletData = {
      aiPoints: {
        earned: aiPoints.earned,
        spent: aiPoints.spent,
        available: aiPoints.available,
        pointPriceVnd: aiPoints.pointPriceVnd,
      },
      transactions: aiPoints.history.map((item) => ({
        id: item.id,
        type: item.type,
        amount: item.amount,
        balanceAfter: item.balanceAfter,
        description: item.description,
        createdAt: item.createdAt.toISOString(),
      })),
    };
  } catch {
    walletNotice = {
      message: notice.message || "Không tải được điểm đậu.",
      isError: true,
    };
    canBuy = false;
  }

  return (
    <WalletClient
      initialData={walletData}
      initialNotice={walletNotice}
      canBuy={canBuy}
      returnTo={returnTo}
      isPopupPurchase={isPopupPurchase}
      payment={payment}
    />
  );
}
