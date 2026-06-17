"use client";

import Link from "next/link";
import type { User } from "./useUser";
import ProfileMenu from "./ProfileMenu";

type AuthButtonsProps = {
  user: User | null;
  loading: boolean;
};

export default function AuthButtons({ user, loading }: AuthButtonsProps) {
  if (user) {
    return <ProfileMenu user={user} />;
  }

  return (
    <div className="flex items-center gap-2" aria-busy={loading}>
      <Link href="/auth/login" className="text-sm font-medium text-muted-foreground hover:text-foreground">
        Login
      </Link>
      <Link href="/auth/register" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90">
        Register
      </Link>
    </div>
  );
}
