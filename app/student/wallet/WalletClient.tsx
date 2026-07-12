"use client";

import { useReducer } from "react";

type BeanPoints = {
  earned: number;
  spent: number;
  available: number;
  pointPriceVnd: number;
};

export type BeanTransaction = {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
};

export type WalletData = {
  aiPoints: BeanPoints;
  transactions: BeanTransaction[];
};

type Notice = {
  message: string;
  isError: boolean;
};

type Props = {
  initialData: WalletData;
  initialNotice: Notice;
  canBuy?: boolean;
};

type WalletState = {
  beanAmount: string;
  buyingBeans: boolean;
  noticeOverride: Notice | null;
};

type WalletAction =
  | { type: "SET_BEAN_AMOUNT"; beanAmount: string }
  | { type: "SET_BUYING_BEANS"; buyingBeans: boolean }
  | { type: "SET_NOTICE"; notice: Notice | null };

const QUICK_BEAN_PACKS = [10, 30, 50, 100];

function walletReducer(state: WalletState, action: WalletAction): WalletState {
  switch (action.type) {
    case "SET_BEAN_AMOUNT":
      return { ...state, beanAmount: action.beanAmount };
    case "SET_BUYING_BEANS":
      return { ...state, buyingBeans: action.buyingBeans };
    case "SET_NOTICE":
      return { ...state, noticeOverride: action.notice };
    default:
      return state;
  }
}

function formatVnd(value: number) {
  return `${Math.round(value).toLocaleString("vi-VN")}đ`;
}

function formatBeans(value: number) {
  return `${Math.round(value).toLocaleString("vi-VN")} điểm đậu`;
}

function amountClass(amount: number) {
  if (amount > 0) return "text-emerald-700";
  if (amount < 0) return "text-rose-700";
  return "text-slate-700";
}

export default function WalletClient({ initialData, initialNotice, canBuy = true }: Props) {
  const [state, dispatch] = useReducer(walletReducer, {
    beanAmount: "100",
    buyingBeans: false,
    noticeOverride: null,
  });
  const { aiPoints, transactions } = initialData;
  const notice = state.noticeOverride ?? initialNotice;
  const beanPrice = aiPoints.pointPriceVnd || 1000;
  const selectedBeans = Number(state.beanAmount) || 0;
  const beanCost = selectedBeans * beanPrice;

  async function handleBuyBeans() {
    if (!canBuy) {
      dispatch({ type: "SET_NOTICE", notice: { message: "Tài khoản này không thể mua điểm đậu.", isError: true } });
      return;
    }

    const beans = Number(state.beanAmount);
    if (!Number.isFinite(beans) || !Number.isInteger(beans) || beans <= 0) {
      dispatch({ type: "SET_NOTICE", notice: { message: "Vui lòng nhập số điểm đậu hợp lệ.", isError: true } });
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
      if (!res.ok || !data?.paymentUrl) {
        dispatch({ type: "SET_NOTICE", notice: { message: data?.error || "Không tạo được giao dịch mua điểm đậu.", isError: true } });
        return;
      }

      window.location.href = data.paymentUrl;
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
          <h1 className="text-3xl font-bold text-slate-900">Điểm đậu</h1>
          <p className="mt-1 text-sm text-slate-600">Mua điểm đậu trực tiếp qua VNPay để dùng cho Writing AI, Speaking AI và nhận xét AI bài test.</p>
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm text-emerald-700">Điểm đậu hiện có</p>
            <p className="mt-2 text-2xl font-bold text-emerald-800">{formatBeans(aiPoints.available)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Đã mua/cấp</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{formatBeans(aiPoints.earned)}</p>
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

        <section className="rounded-lg border border-emerald-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Mua điểm đậu</h2>
              <p className="text-sm text-slate-500">Tỷ lệ: {formatVnd(beanPrice)} / 1 điểm đậu. Bạn có thể mua số lượng tùy ý, ví dụ 100 điểm.</p>
            </div>
            <p className="text-sm font-medium text-emerald-700">Bạn đang có {formatBeans(aiPoints.available)}</p>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
            <input
              type="number"
              min={1}
              step={1}
              value={state.beanAmount}
              onChange={(event) => dispatch({ type: "SET_BEAN_AMOUNT", beanAmount: event.target.value })}
              className="h-11 w-full rounded-lg border border-slate-300 px-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              placeholder="Nhập số điểm đậu"
              aria-label="Số điểm đậu cần mua"
            />
            <button
              type="button"
              onClick={handleBuyBeans}
              disabled={state.buyingBeans || !canBuy}
              className="h-11 rounded-lg bg-emerald-600 px-6 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {state.buyingBeans ? "Đang tạo..." : "Thanh toán VNPay"}
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
                  Number(state.beanAmount) === value
                    ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {formatBeans(value)}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-900">Lịch sử điểm đậu</h2>
          <div className="mt-3 space-y-2">
            {transactions.length === 0 ? (
              <p className="text-sm text-slate-500">Chưa có giao dịch điểm đậu nào.</p>
            ) : (
              transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">{tx.description}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(tx.createdAt).toLocaleString("vi-VN")} · Còn lại: {formatBeans(tx.balanceAfter)}
                    </p>
                  </div>
                  <p className={`shrink-0 font-semibold ${amountClass(tx.amount)}`}>
                    {tx.amount > 0 ? "+" : ""}
                    {formatBeans(tx.amount)}
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
