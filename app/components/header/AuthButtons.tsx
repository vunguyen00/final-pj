"use client";

import Link from "next/link";
import { useUser } from "./useUser";
import ProfileMenu from "./ProfileMenu";

export default function AuthButtons() {
  const { user, loading } = useUser();

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-8 w-20 animate-pulse rounded-lg bg-muted" />
        <div className="h-8 w-16 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (user) {
    return <ProfileMenu user={user} />;
  }

  return (
    <div className="flex items-center gap-2">
      <Link href="/auth/login" className="text-sm font-medium text-muted-foreground hover:text-foreground">
        Dang nhap
      </Link>
      <Link href="/auth/register" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90">
        Dang ky
      </Link>
    </div>
  );
}
