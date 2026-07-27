import Link from "next/link";
import { getAiFeedbackCost, getAiPointsSummary } from "@/lib/ai-points";
import { requireRole } from "@/lib/auth";

const aiCosts = [
  { title: "Writing AI", href: "/student/writing-ai", cost: getAiFeedbackCost("WRITING_AI") },
  { title: "Speaking AI", href: "/student/speaking-ai", cost: getAiFeedbackCost("SPEAKING_AI") },
  { title: "Nhận xét AI cho bài test", href: "/student/tests", cost: getAiFeedbackCost("TEST_AI_FEEDBACK") },
];

function formatBeans(value: number) {
  return `${Math.round(value).toLocaleString("vi-VN")} điểm đậu`;
}

export default async function RewardCenterPage() {
  const user = await requireRole("STUDENT", "TEACHER", "ADMIN");
  const summary = await getAiPointsSummary(user.id);

  return (
    <main className="min-h-dvh bg-slate-50 py-8">
      <div className="mx-auto max-w-7xl space-y-6 px-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">Trung tâm sử dụng điểm</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-950">Bảng giá nhận xét AI</h1>
              <p className="mt-2 max-w-2xl text-slate-600">
                Trang này giúp bạn so sánh chi phí và mở nhanh các tính năng AI. Mua điểm, xem số dư và lịch sử giao dịch tại trang quản lý điểm.
              </p>
            </div>
            <Link href="/student/wallet" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">
              Quản lý và mua điểm
            </Link>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <Metric label="Hiện có" value={formatBeans(summary.available)} />
          <Metric label="Đã mua/cấp" value={formatBeans(summary.earned)} />
          <Metric label="Đã dùng" value={formatBeans(summary.spent)} />
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {aiCosts.map((item) => (
            <article key={item.title} className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-bold text-slate-950">{item.title}</h2>
              <p className="mt-2 text-sm text-slate-600">Mỗi lần nhận xét AI sẽ trừ điểm đậu từ tài khoản.</p>
              <p className="mt-4 text-2xl font-bold text-slate-950">{formatBeans(item.cost)}/lần</p>
              <Link href={item.href} className="mt-4 inline-flex rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Mở tính năng
              </Link>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
    </div>
  );
}
