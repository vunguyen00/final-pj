import Link from "next/link";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {children}
        <div className="mt-6 border-t border-slate-200 pt-4 text-center text-sm text-slate-600">
          <Link className="font-semibold text-slate-900 hover:underline" href="/">
            Ve trang chu
          </Link>
        </div>
      </div>
    </div>
  );
}
