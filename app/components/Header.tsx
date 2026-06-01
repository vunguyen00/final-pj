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
  { href: "/", label: "Marketplace", match: (path: string) => path === "/" },
  { href: "/courses", label: "Courses", match: (path: string) => path.startsWith("/courses") },
  { href: "/teachers", label: "Teachers", match: (path: string) => path.startsWith("/teachers") },
] satisfies MatchedNavItem[];

export default function Header({ showOnAdmin = false }: { showOnAdmin?: boolean }) {
  const pathname = usePathname() || "";
  const { user } = useUser();
  const [globalError, setGlobalError] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handleGlobalError(e: Event) {
      const event = e as CustomEvent;
      setGlobalError(event.detail || "Something went wrong");
      setTimeout(() => setGlobalError(""), 5000);
    }
    window.addEventListener("app-global-error", handleGlobalError);
    return () => window.removeEventListener("app-global-error", handleGlobalError);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  const hideHeader = pathname.startsWith("/auth") || (pathname.startsWith("/admin") && !showOnAdmin);
  if (hideHeader) return null;

  const studentLinks =
    user?.role === "STUDENT" || user?.role === "TEACHER"
      ? [
          { href: "/student", label: "Dashboard" },
          { href: "/student/tests", label: "Tests" },
          { href: "/student/results", label: "Results" },
          { href: "/student/rewards", label: "Points" },
          { href: "/student/wallet", label: "Wallet" },
        ] satisfies BasicNavItem[]
      : [];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/90 backdrop-blur">
      {globalError ? <div className="bg-red-50 py-2 text-center text-sm font-semibold text-red-700">{globalError}</div> : null}
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
            LH
          </span>
          <span className="text-lg font-bold tracking-tight text-slate-950">LearnHub</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {[...navItems, ...studentLinks].map((item) => {
            const active = hasMatch(item) ? item.match(pathname) : pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-slate-100 text-slate-950"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <AuthButtons />
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 md:hidden"
            aria-label="Open navigation"
          >
            <span className="text-lg">{open ? "x" : "="}</span>
          </button>
        </div>
      </div>

      {open ? (
        <nav className="border-t border-slate-200 bg-white px-4 py-3 md:hidden">
          {[...navItems, ...studentLinks].map((item) => (
            <Link key={item.href} href={item.href} className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
              {item.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  );
}
