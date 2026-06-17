"use client";

import { useReducer } from "react";

type BeanPoints = {
  earned: number;
  spent: number;
  available: number;
  pointPriceVnd: number;
};

type WalletTx = {
  id: string;
  type: "TOP_UP" | "PURCHASE" | "AI_POINT_PURCHASE";
  amount: number;
  status: string;
  createdAt: string;
  courseName?: string;
  points?: number;
};

export type WalletData = {
  balance: number;
  aiPoints: BeanPoints;
  transactions: WalletTx[];
};

type Notice = {
  message: string;
  isError: boolean;
};

type Props = {
  initialData: WalletData;
  initialNotice: Notice;
  canTopUp?: boolean;
};

type WalletState = {
  walletData: WalletData;
  amount: string;
  beanAmount: string;
  loading: boolean;
  buyingBeans: boolean;
  noticeOverride: Notice | null;
};

type WalletAction =
  | { type: "SET_AMOUNT"; amount: string }
  | { type: "SET_BEAN_AMOUNT"; beanAmount: string }
  | { type: "SET_LOADING"; loading: boolean }
  | { type: "SET_BUYING_BEANS"; buyingBeans: boolean }
  | { type: "SET_NOTICE"; notice: Notice | null }
  | {
      type: "APPLY_BEAN_PURCHASE";
      boughtBeans: number;
      cost: number;
      walletBalance?: number;
      available?: number;
      pricePerPoint?: number;
    };

const QUICK_AMOUNTS = [10000, 50000, 100000, 200000];
const QUICK_BEAN_PACKS = [10, 30, 50, 100];
const MIN_TOP_UP_AMOUNT = 10000;

function createInitialState(initialData: WalletData): WalletState {
  return {
    walletData: initialData,
    amount: "50000",
    beanAmount: "30",
    loading: false,
    buyingBeans: false,
    noticeOverride: null,
  };
}

function walletReducer(state: WalletState, action: WalletAction): WalletState {
  switch (action.type) {
    case "SET_AMOUNT":
      return { ...state, amount: action.amount };
    case "SET_BEAN_AMOUNT":
      return { ...state, beanAmount: action.beanAmount };
    case "SET_LOADING":
      return { ...state, loading: action.loading };
    case "SET_BUYING_BEANS":
      return { ...state, buyingBeans: action.buyingBeans };
    case "SET_NOTICE":
      return { ...state, noticeOverride: action.notice };
    case "APPLY_BEAN_PURCHASE": {
      const { boughtBeans, cost, walletBalance, available, pricePerPoint } = action;
      return {
        ...state,
        walletData: {
          ...state.walletData,
          balance: Number(walletBalance ?? state.walletData.balance - cost),
          aiPoints: {
            ...state.walletData.aiPoints,
            earned: state.walletData.aiPoints.earned + boughtBeans,
            available: Number(available ?? state.walletData.aiPoints.available + boughtBeans),
            pointPriceVnd: Number(pricePerPoint ?? state.walletData.aiPoints.pointPriceVnd),
          },
          transactions: [
            {
              id: `bean-points-${Date.now()}`,
              type: "AI_POINT_PURCHASE",
              amount: cost,
              points: boughtBeans,
              status: "SUCCESS",
              createdAt: new Date().toISOString(),
            },
            ...state.walletData.transactions,
          ],
        },
      };
    }
    default:
      return state;
  }
}

function formatVnd(value: number) {
  return `${Math.round(value).toLocaleString("vi-VN")}đ`;
}

function formatBeans(value: number) {
  return `${Math.round(value).toLocaleString("vi-VN")} hạt đậu`;
}

function statusLabel(status: string) {
  if (status === "SUCCESS") return "Thành công";
  if (status === "PENDING") return "Đang chờ";
  if (status === "FAILED") return "Thất bại";
  return status;
}

function statusClass(status: string) {
  if (status === "SUCCESS") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "PENDING") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "FAILED") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function transactionLabel(tx: WalletTx) {
  if (tx.type === "TOP_UP") return "Nạp tiền";
  if (tx.type === "AI_POINT_PURCHASE") return `Mua ${formatBeans(tx.points ?? 0)}`;
  return `Mua khóa học${tx.courseName ? `: ${tx.courseName}` : ""}`;
}

export default function WalletClient({ initialData, initialNotice, canTopUp = true }: Props) {
  const [state, dispatch] = useReducer(walletReducer, initialData, createInitialState);
  const { walletData, amount, beanAmount, loading, buyingBeans, noticeOverride } = state;
  const { balance, aiPoints, transactions } = walletData;
  const notice = noticeOverride ?? initialNotice;
  const beanPrice = aiPoints.pointPriceVnd || 1000;
  const selectedBeans = Number(beanAmount) || 0;
  const beanCost = selectedBeans * beanPrice;

  async function handleTopUp() {
    if (!canTopUp) {
      dispatch({ type: "SET_NOTICE", notice: { message: "Tài khoản này không thể nạp ví.", isError: true } });
      return;
    }

    const topUpAmount = Number(amount);
    if (!Number.isFinite(topUpAmount) || !Number.isInteger(topUpAmount) || topUpAmount < MIN_TOP_UP_AMOUNT) {
      dispatch({ type: "SET_NOTICE", notice: { message: "Vui lòng nhập số tiền hợp lệ, tối thiểu 10.000đ.", isError: true } });
      return;
    }

    dispatch({ type: "SET_LOADING", loading: true });
    dispatch({ type: "SET_NOTICE", notice: { message: "", isError: false } });

    try {
      const res = await fetch("/api/wallet/top-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: topUpAmount }),
      });
      const data = await res.json();
      if (!res.ok) {
        dispatch({ type: "SET_NOTICE", notice: { message: data?.error || "Không tạo được giao dịch nạp tiền.", isError: true } });
        return;
      }

      if (!data?.paymentUrl) {
        dispatch({ type: "SET_NOTICE", notice: { message: "Không tạo được URL thanh toán.", isError: true } });
        return;
      }

      window.location.href = data.paymentUrl;
    } catch {
      dispatch({ type: "SET_NOTICE", notice: { message: "Lỗi mạng. Vui lòng thử lại.", isError: true } });
    } finally {
      dispatch({ type: "SET_LOADING", loading: false });
    }
  }

  async function handleBuyBeans() {
    if (!canTopUp) {
      dispatch({ type: "SET_NOTICE", notice: { message: "Tài khoản này không thể mua hạt đậu.", isError: true } });
      return;
    }

    const beans = Number(beanAmount);
    if (!Number.isFinite(beans) || !Number.isInteger(beans) || beans <= 0) {
      dispatch({ type: "SET_NOTICE", notice: { message: "Vui lòng nhập số hạt đậu hợp lệ.", isError: true } });
      return;
    }

    dispatch({ type: "SET_BUYING_BEANS", buyingBeans: true });
    dispatch({ type: "SET_NOTICE", notice: { message: "", isError: false } });

    try {
      const res = await fetch("/api/ai/points/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ points: beans, beans }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        dispatch({ type: "SET_NOTICE", notice: { message: data?.error || "Không mua được hạt đậu.", isError: true } });
        return;
      }

      const boughtBeans = Number(data.points ?? data.beans ?? beans);
      const cost = Number(data.cost ?? boughtBeans * beanPrice);
      dispatch({
        type: "APPLY_BEAN_PURCHASE",
        boughtBeans,
        cost,
        walletBalance: data.walletBalance,
        available: data.available,
        pricePerPoint: data.pricePerPoint,
      });
      dispatch({ type: "SET_NOTICE", notice: { message: `Đã mua ${formatBeans(boughtBeans)}.`, isError: false } });
    } catch {
      dispatch({ type: "SET_NOTICE", notice: { message: "Lỗi mạng. Vui lòng thử lại.", isError: true } });
    } finally {
      dispatch({ type: "SET_BUYING_BEANS", buyingBeans: false });
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Ví của tôi</h1>
          <p className="mt-1 text-sm text-slate-600">Quản lý số dư, điểm đậu và lịch sử giao dịch FinnCenter.</p>
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Số dư ví</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{formatVnd(balance)}</p>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm text-emerald-700">Điểm đậu hiện có</p>
            <p className="mt-2 text-2xl font-bold text-emerald-800">{formatBeans(aiPoints.available)}</p>
          </div>
          <div className="rounded-lg border border-rose-200 bg-white p-4">
            <p className="text-sm text-slate-500">Đã dùng</p>
            <p className="mt-2 text-2xl font-bold text-rose-700">{formatBeans(aiPoints.spent)}</p>
          </div>
        </section>

        {notice.message ? (
          <p
            className={`rounded-lg border px-3 py-2 text-sm ${
              notice.isError ? "border-rose-200 bg-rose-50 text-rose-700" : "border-blue-200 bg-blue-50 text-blue-700"
            }`}
          >
            {notice.message}
          </p>
        ) : null}

        <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-lg border border-emerald-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Mua hạt đậu</h2>
                <p className="text-sm text-slate-500">
                  Dùng số dư ví để mua điểm đậu. Tỷ lệ: {formatVnd(beanPrice)} / 1 hạt đậu.
                </p>
              </div>
              <p className="text-sm font-medium text-emerald-700">Bạn đang có {formatBeans(aiPoints.available)}</p>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
              <input
                type="number"
                min={1}
                step={1}
                value={beanAmount}
                onChange={(e) => dispatch({ type: "SET_BEAN_AMOUNT", beanAmount: e.target.value })}
                className="h-11 w-full rounded-lg border border-slate-300 px-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                placeholder="Nhập số hạt đậu"
                aria-label="Số hạt đậu cần mua"
              />
              <button
                type="button"
                onClick={handleBuyBeans}
                disabled={buyingBeans || !canTopUp}
                className="h-11 rounded-lg bg-emerald-600 px-6 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {buyingBeans ? "Đang mua..." : "Mua hạt đậu"}
              </button>
            </div>

            <p className="mt-2 text-sm font-medium text-slate-700">Tổng thanh toán: {formatVnd(beanCost)}</p>

            <div className="mt-3 flex flex-wrap gap-2">
              {QUICK_BEAN_PACKS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => dispatch({ type: "SET_BEAN_AMOUNT", beanAmount: String(value) })}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    Number(beanAmount) === value
                      ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {formatBeans(value)}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Nạp tiền qua VNPAY Sandbox</h2>
                <p className="text-sm text-slate-500">Nạp thêm khi số dư không đủ mua hạt đậu hoặc khóa học.</p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
              <input
                type="number"
                min={MIN_TOP_UP_AMOUNT}
                step={1000}
                value={amount}
                onChange={(e) => dispatch({ type: "SET_AMOUNT", amount: e.target.value })}
                className="h-11 w-full rounded-lg border border-slate-300 px-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="Nhập số tiền"
                aria-label="Số tiền nạp"
              />
              <button
                type="button"
                onClick={handleTopUp}
                disabled={loading || !canTopUp}
                className="h-11 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {loading ? "Đang tạo..." : "Nạp tiền"}
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {QUICK_AMOUNTS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => dispatch({ type: "SET_AMOUNT", amount: String(value) })}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    Number(amount) === value
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {formatVnd(value)}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-900">Lịch sử giao dịch</h2>
          <div className="mt-3 space-y-2">
            {transactions.length === 0 ? (
              <p className="text-sm text-slate-500">Chưa có giao dịch nào.</p>
            ) : (
              transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-slate-900">{transactionLabel(tx)}</p>
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${statusClass(tx.status)}`}>
                        {statusLabel(tx.status)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">{new Date(tx.createdAt).toLocaleString("vi-VN")}</p>
                  </div>
                  <p className={`shrink-0 font-semibold ${tx.type === "TOP_UP" ? "text-emerald-700" : "text-rose-700"}`}>
                    {tx.type === "TOP_UP" && tx.status === "SUCCESS" ? "+" : tx.type === "PURCHASE" || tx.type === "AI_POINT_PURCHASE" ? "-" : ""}
                    {formatVnd(tx.amount)}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
