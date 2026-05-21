"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import AdminMenu from "./header/AdminMenu";
import AuthButtons from "./header/AuthButtons";
import { useUser } from "./header/useUser";

const navItems = [
  { href: "/", label: "Marketplace", match: (path: string) => path === "/" },
  { href: "/courses", label: "Courses", match: (path: string) => path.startsWith("/courses") },
  { href: "/combos", label: "Combos", match: (path: string) => path.startsWith("/combos") },
  { href: "/teachers", label: "Teachers", match: (path: string) => path.startsWith("/teachers") },
];

export default function Header() {
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

  const hideHeader = pathname.startsWith("/auth") || pathname.startsWith("/admin");
  if (hideHeader) return null;

  const studentLinks =
    user?.role === "STUDENT"
      ? [
          { href: "/student", label: "Dashboard" },
          { href: "/student/lam-bai", label: "Practice" },
          { href: "/student/tests", label: "Tests" },
          { href: "/student/wallet", label: "Wallet" },
        ]
      : [];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      {globalError ? <div className="bg-red-50 py-2 text-center text-sm font-semibold text-red-700">{globalError}</div> : null}
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-950 text-sm font-bold text-white dark:bg-white dark:text-slate-950">
            LH
          </span>
          <span className="text-lg font-bold tracking-tight text-slate-950 dark:text-white">LearnHub</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {[...navItems, ...studentLinks].map((item) => {
            const active = "match" in item ? item.match(pathname) : pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-slate-100 text-slate-950 dark:bg-slate-800 dark:text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <AuthButtons />
          {(user?.role === "TEACHER" || user?.role === "ADMIN") && user ? <AdminMenu user={user} /> : null}
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 md:hidden dark:border-slate-700 dark:text-slate-200"
            aria-label="Open navigation"
          >
            <span className="text-lg">{open ? "x" : "="}</span>
          </button>
        </div>
      </div>

      {open ? (
        <nav className="border-t border-slate-200 bg-white px-4 py-3 md:hidden dark:border-slate-800 dark:bg-slate-950">
          {[...navItems, ...studentLinks].map((item) => (
            <Link key={item.href} href={item.href} className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">
              {item.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  );
}
