"use client";

import Link from "next/link";

export default function AuthButtons() {
  return (
    <div className="flex items-center gap-2">
      <Link
        href="/auth/login"
        className="text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        Đăng nhập
      </Link>
      <Link
        href="/auth/register"
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
      >
        Đăng ký
      </Link>
    </div>
  );
}