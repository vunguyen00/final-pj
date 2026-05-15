"use client";

import { useEffect, useState } from "react";

type AiPoints = {
  earned: number;
  spent: number;
  available: number;
};

type WalletTx = {
  id: string;
  type: "TOP_UP" | "PURCHASE";
  amount: number;
  status: "SUCCESS";
  createdAt: string;
  courseName?: string;
};

export default function StudentWalletPage() {
  const [balance, setBalance] = useState(0);
  const [aiPoints, setAiPoints] = useState<AiPoints>({ earned: 0, spent: 0, available: 0 });
  const [transactions, setTransactions] = useState<WalletTx[]>([]);
  const [amount, setAmount] = useState("50000");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function loadWallet() {
    const res = await fetch("/api/wallet");
    const data = await res.json();
    if (!res.ok) {
      setMessage(data?.error || "Khong tai duoc vi.");
      return;
    }

    setBalance(data.balance || 0);
    setAiPoints(data.aiPoints || { earned: 0, spent: 0, available: 0 });
    setTransactions(Array.isArray(data.transactions) ? data.transactions : []);
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    const code = params.get("code");

    if (payment === "success") {
      setMessage("Nap tien thanh cong.");
    } else if (payment === "failed") {
      setMessage(`Nap tien that bai${code ? ` (ma: ${code})` : ""}.`);
    }

    loadWallet();
  }, []);

  async function handleTopUp() {
    setLoading(true);
    setMessage("");

    try {
      const topUpAmount = Number(amount);
      const res = await fetch("/api/wallet/top-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: topUpAmount }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data?.error || "Nap tien that bai.");
        return;
      }

      if (!data?.paymentUrl) {
        setMessage("Khong tao duoc URL thanh toan.");
        return;
      }

      window.location.href = data.paymentUrl;
    } catch {
      setMessage("Loi mang.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <h1 className="text-3xl font-bold text-slate-900">Vi cua toi</h1>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">So du</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{Math.round(balance).toLocaleString("vi-VN")}d</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Diem AI kha dung</p>
            <p className="mt-2 text-2xl font-bold text-blue-700">{aiPoints.available.toLocaleString("vi-VN")}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Tong diem da tich luy</p>
            <p className="mt-2 text-2xl font-bold text-emerald-700">{aiPoints.earned.toLocaleString("vi-VN")}</p>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-lg font-semibold text-slate-900">Nap tien qua VNPAY Sandbox</h2>
          <div className="mt-3 flex gap-3">
            <input
              type="number"
              min={10000}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-black"
            />
            <button
              onClick={handleTopUp}
              disabled={loading}
              className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:bg-slate-400"
            >
              {loading ? "Dang nap..." : "Nap tien"}
            </button>
          </div>
          {message ? <p className="mt-2 text-sm text-slate-700">{message}</p> : null}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-lg font-semibold text-slate-900">Lich su giao dich</h2>
          <div className="mt-3 space-y-2">
            {transactions.length === 0 ? (
              <p className="text-sm text-slate-500">Chua co giao dich nao.</p>
            ) : (
              transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                  <div>
                    <p className="font-medium text-slate-900">
                      {tx.type === "TOP_UP" ? "Nap tien" : `Mua khoa hoc${tx.courseName ? `: ${tx.courseName}` : ""}`}
                    </p>
                    <p className="text-xs text-slate-500">{new Date(tx.createdAt).toLocaleString("vi-VN")}</p>
                  </div>
                  <p className={`font-semibold ${tx.type === "TOP_UP" ? "text-emerald-700" : "text-rose-700"}`}>
                    {tx.type === "TOP_UP" ? "+" : "-"}
                    {Math.round(tx.amount).toLocaleString("vi-VN")}d
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
