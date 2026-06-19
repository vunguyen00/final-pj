import Link from "next/link";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="relative flex min-h-screen items-center overflow-hidden bg-slate-950 px-4 py-8 sm:px-6">
      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-violet-500/20 blur-3xl" />
      <div className="relative mx-auto grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-white shadow-2xl lg:grid-cols-[.9fr_1.1fr]">
        <aside className="relative hidden overflow-hidden bg-gradient-to-br from-blue-700 via-indigo-700 to-violet-800 p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div>
            <Link href="/" className="inline-flex items-center gap-3 text-lg font-black tracking-tight">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/15 ring-1 ring-white/25">FC</span>
              FinnCenter
            </Link>
            <h2 className="mt-20 text-4xl font-black leading-tight">Học tập theo cách<br />của riêng bạn.</h2>
            <p className="mt-5 max-w-sm text-sm leading-7 text-blue-100">Khám phá khóa học, luyện tập cùng AI và theo dõi tiến bộ trong một không gian học tập liền mạch.</p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center text-xs font-semibold text-blue-100">
            <span className="rounded-xl bg-white/10 px-2 py-3">Khóa học</span>
            <span className="rounded-xl bg-white/10 px-2 py-3">Luyện thi</span>
            <span className="rounded-xl bg-white/10 px-2 py-3">AI hỗ trợ</span>
          </div>
        </aside>
        <div className="p-6 sm:p-10 lg:p-12">
          <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm font-bold text-blue-700 lg:hidden">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-600 text-white">FC</span> FinnCenter
          </Link>
          {children}
          <div className="mt-8 border-t border-slate-200 pt-5 text-center text-sm text-slate-500">
            <Link className="font-semibold text-slate-700 hover:text-blue-700" href="/">
              ← Về trang chủ
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
