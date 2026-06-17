import { getAiPointsSummary } from "@/lib/ai-points";
import { requireUser } from "@/lib/auth";
import { getUserBalance, getWalletTransactions } from "@/lib/wallet";
import WalletClient, { type WalletData } from "./WalletClient";

type PageProps = {
  searchParams: Promise<{
    payment?: string;
    code?: string;
  }>;
};

const EMPTY_WALLET_DATA: WalletData = {
  balance: 0,
  aiPoints: { earned: 0, spent: 0, available: 0, pointPriceVnd: 1000 },
  transactions: [],
};

function paymentMessage(payment: string | null, code: string | null) {
  if (payment === "success") {
    return "Nạp tiền thành công. Số dư ví đã được cập nhật.";
  }
  if (payment === "failed") {
    return `Thanh toán không thành công${code ? ` (mã: ${code})` : ""}.`;
  }
  if (payment === "pending") {
    return "Thanh toán đã được ghi nhận và đang chờ VNPAY xác nhận.";
  }
  if (payment === "invalid_signature") {
    return "Không thể xác thực chữ ký trả về từ VNPAY. Giao dịch chưa được cộng vào ví.";
  }
  return "";
}

export default async function StudentWalletPage({ searchParams }: PageProps) {
  const [params, user] = await Promise.all([searchParams, requireUser()]);
  const payment = params.payment ?? null;
  const notice = {
    message: paymentMessage(payment, params.code ?? null),
    isError: payment === "failed" || payment === "invalid_signature",
  };

  if (user.role === "ADMIN") {
    return (
      <WalletClient
        initialData={EMPTY_WALLET_DATA}
        initialNotice={{
          message: notice.message || "Admin không sử dụng ví.",
          isError: true,
        }}
        canTopUp={false}
      />
    );
  }

  let walletData = EMPTY_WALLET_DATA;
  let canTopUp = false;
  let walletNotice = notice;

  try {
    const [balance, aiPoints, transactions] = await Promise.all([
      getUserBalance(user.id),
      getAiPointsSummary(user.id),
      getWalletTransactions(user.id),
    ]);

    walletData = {
      balance,
      aiPoints: {
        earned: aiPoints.earned,
        spent: aiPoints.spent,
        available: aiPoints.available,
        pointPriceVnd: aiPoints.pointPriceVnd,
      },
      transactions,
    };
    canTopUp = true;
  } catch {
    walletNotice = {
      message: notice.message || "Không tải được ví.",
      isError: true,
    };
  }

  return <WalletClient initialData={walletData} initialNotice={walletNotice} canTopUp={canTopUp} />;
}
