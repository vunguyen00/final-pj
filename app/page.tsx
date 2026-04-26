import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <main className="mx-auto mt-10 max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-slate-900">Trang chu</h1>
        <p className="mt-3 text-slate-600">
          Trang nay khong can dang nhap. Khi vao chuc nang hoc bai hoac lam bai he thong moi yeu cau authenticate.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/auth/register"
            className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-800"
          >
            Dang ky
          </Link>
          <Link
            href="/auth/login"
            className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-800 hover:bg-slate-100"
          >
            Dang nhap
          </Link>
          <Link
            href="/student/hoc-bai"
            className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-800 hover:bg-slate-100"
          >
            Hoc bai
          </Link>
          <Link
            href="/student/lam-bai"
            className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-800 hover:bg-slate-100"
          >
            Lam bai
          </Link>
        </div>
      </main>
    </div>
  );
}
