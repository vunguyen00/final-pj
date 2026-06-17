"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import AuthButtons from "./header/AuthButtons";
import { useUser } from "./header/useUser";

type MatchedNavItem = {
  href: string;
  label: string;
  match: (path: string) => boolean;
};

type BasicNavItem = {
  href: string;
  label: string;
};

function hasMatch(item: MatchedNavItem | BasicNavItem): item is MatchedNavItem {
  return typeof (item as MatchedNavItem).match === "function";
}

const navItems = [
  { href: "/", label: "Khám phá", match: (path: string) => path === "/" },
  { href: "/courses", label: "Khóa học", match: (path: string) => path.startsWith("/courses") },
  { href: "/teachers", label: "Giảng viên", match: (path: string) => path.startsWith("/teachers") },
] satisfies MatchedNavItem[];

export default function Header({ showOnAdmin = false }: { showOnAdmin?: boolean }) {
  const pathname = usePathname() || "";
  const { user, loading } = useUser();
  const [globalError, setGlobalError] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handleGlobalError(event: Event) {
      const customEvent = event as CustomEvent;
      setGlobalError(customEvent.detail || "Đã xảy ra lỗi.");
      setTimeout(() => setGlobalError(""), 5000);
    }
    window.addEventListener("app-global-error", handleGlobalError);
    return () => window.removeEventListener("app-global-error", handleGlobalError);
  }, []);

  const hideHeader = pathname.startsWith("/auth") || (pathname.startsWith("/admin") && !showOnAdmin);
  if (hideHeader) return null;

  const studentLinks =
    user
      ? [
          { href: user.role === "ADMIN" ? "/admin" : "/student", label: "Tổng quan" },
          { href: "/student/tests", label: "Bài test" },
          { href: "/student/results", label: "Kết quả" },
          { href: "/student/speaking-ai", label: "Speaking AI" },
          { href: "/student/writing-ai", label: "Writing AI" },
          { href: "/student/rewards", label: "Điểm đậu" },
          ...(user.role === "ADMIN" ? [] : [{ href: "/student/wallet", label: "Ví tiền" }]),
        ] satisfies BasicNavItem[]
      : [];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/90 backdrop-blur">
      {globalError ? <div className="bg-destructive/10 py-2 text-center text-sm font-semibold text-destructive">{globalError}</div> : null}
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">FC</span>
          <span className="text-lg font-semibold tracking-tight text-foreground">FinnCenter</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {[...navItems, ...studentLinks].map((item) => {
            const active = hasMatch(item) ? item.match(pathname) : pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <AuthButtons user={user} loading={loading} />
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border text-foreground md:hidden"
            aria-label="Mở menu điều hướng"
          >
            <span className="text-lg">{open ? "x" : "="}</span>
          </button>
        </div>
      </div>

      {open ? (
        <nav className="border-t border-border bg-card px-4 py-3 md:hidden">
          {[...navItems, ...studentLinks].map((item) => (
            <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-muted">
              {item.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  );
}
