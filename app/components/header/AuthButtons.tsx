"use client";

import Link from "next/link";
import { useUser } from "./useUser";
import ProfileMenu from "./ProfileMenu";

export default function AuthButtons() {
  const { user, loading } = useUser();

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-8 w-20 animate-pulse rounded-lg bg-slate-200" />
        <div className="h-8 w-16 animate-pulse rounded-lg bg-slate-200" />
      </div>
    );
  }

  if (user) {
    return <ProfileMenu user={user} />;
  }

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
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
      >
        Đăng ký
      </Link>
    </div>
  );
}