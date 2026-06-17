import Link from "next/link";
import { getAiPointsSummary } from "@/lib/ai-points";
import { requireRole } from "@/lib/auth";

type PointsSummary = Awaited<ReturnType<typeof getAiPointsSummary>>;

function formatBeans(value: number) {
  return `${Math.round(value).toLocaleString("vi-VN")} hạt đậu`;
}

export default async function RewardCenterPage() {
  const user = await requireRole("STUDENT", "TEACHER", "ADMIN");
  const summary = await getAiPointsSummary(user.id);
  const stats = buildStats(summary);

  return (
    <main className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-7xl space-y-6 px-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">Điểm đậu</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-950">Hạt đậu của tôi</h1>
              <p className="mt-2 max-w-2xl text-slate-600">
                FinnCenter chỉ dùng một loại điểm: điểm đậu. Mỗi đơn vị được gọi là một hạt đậu.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/student/wallet" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">
                Mua hạt đậu
              </Link>
              <Link href="/student/speaking-ai" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
                Speaking AI
              </Link>
              <Link href="/student/writing-ai" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
                Writing AI
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          {stats.map(([label, value]) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-sm text-slate-500">{label}</p>
              <p className="mt-2 text-3xl font-bold text-slate-950">{value}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-bold text-slate-950">Quy tắc dùng hạt đậu</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <Rule label="Mua bằng số dư ví" value={`+1 hạt = ${summary.pointPriceVnd.toLocaleString("vi-VN")}đ`} />
              <Rule label="Speaking AI" value="-7 hạt" />
              <Rule label="Writing AI" value="-3 hạt" />
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-bold text-slate-950">Tổng quan</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Metric label="Đã mua/cấp" value={formatBeans(summary.earned)} />
              <Metric label="Đã dùng" value={formatBeans(summary.spent)} />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-bold text-slate-950">Lịch sử điểm đậu</h2>
          <div className="mt-4 space-y-3">
            {summary.history.map((item) => (
              <article key={item.id} className="flex flex-col gap-2 rounded-lg border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-slate-950">{item.description}</p>
                  <p className="text-sm text-slate-500">
                    {new Date(item.createdAt).toLocaleString("vi-VN")} - {item.type}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className={`text-lg font-bold ${item.amount > 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {item.amount > 0 ? "+" : ""}
                    {formatBeans(item.amount)}
                  </p>
                  <p className="text-xs text-slate-500">Còn lại: {formatBeans(item.balanceAfter)}</p>
                </div>
              </article>
            ))}
            {summary.history.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                Chưa có giao dịch điểm đậu.
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}

function buildStats(summary: PointsSummary) {
  return [
    ["Điểm đậu hiện có", formatBeans(summary.available)],
    ["Đã mua/cấp", formatBeans(summary.earned)],
    ["Speaking AI", `${summary.speakingUses} lần`],
    ["Writing AI", `${summary.writingUses} lần`],
  ];
}

function Rule({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
      <span>{label}</span>
      <span className={value.startsWith("+") ? "font-bold text-emerald-600" : "font-bold text-red-600"}>{value}</span>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-950">{value}</p>
    </div>
  );
}
