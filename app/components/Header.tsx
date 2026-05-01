"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import AdminMenu from "./header/AdminMenu";
import AuthButtons from "./header/AuthButtons";
import { useUser } from "./header/useUser";

export default function Header() {
  const pathname = usePathname();
  const { user } = useUser();
  const [globalError, setGlobalError] = useState<string>("");

  // Listen for global error events
  useEffect(() => {
    function handleGlobalError(e: Event) {
      const event = e as CustomEvent;
      setGlobalError(event.detail || "Có lỗi xảy ra");
      setTimeout(() => setGlobalError(""), 5000);
    }
    window.addEventListener("app-global-error", handleGlobalError);
    return () => window.removeEventListener("app-global-error", handleGlobalError);
  }, []);

  // Các trang không cần hiển thị header (trang auth)
  const hideHeader = pathname?.startsWith("/auth") || pathname?.startsWith("/admin");

  if (hideHeader) return null;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
      {globalError && (
        <div className="w-full bg-red-100 text-red-700 text-center py-2 font-semibold animate-pulse">{globalError}</div>
      )}
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
          </div>
          <span className="text-xl font-bold text-slate-900">LearnHub</span>
        </Link>

        {/* Navigation */}
        <nav className="hidden items-center gap-6 md:flex">
          <Link
            href="/"
            className={`text-sm font-medium transition-colors hover:text-slate-900 ${
              pathname === "/"
                ? "text-slate-900"
                : "text-slate-600"
            }`}
          >
            Trang chủ
          </Link>
          <Link
            href="/courses"
            className={`text-sm font-medium transition-colors hover:text-slate-900 ${
              pathname?.startsWith("/courses")
                ? "text-slate-900"
                : "text-slate-600"
            }`}
          >
            Khóa học
          </Link>
          <Link
            href="/teachers"
            className={`text-sm font-medium transition-colors hover:text-slate-900 ${
              pathname?.startsWith("/teachers")
                ? "text-slate-900"
                : "text-slate-600"
            }`}
          >
            Giảng viên
          </Link>
          <Link
            href="/about"
            className={`text-sm font-medium transition-colors hover:text-slate-900 ${
              pathname?.startsWith("/about")
                ? "text-slate-900"
                : "text-slate-600"
            }`}
          >
            Về chúng tôi
          </Link>
        </nav>

        {/* Auth Section */}
        <div className="flex items-center gap-3">
          <AuthButtons />
          {/* Hamburger Menu for Teacher/Admin */}
          {(user?.role === "TEACHER" || user?.role === "ADMIN") && user && (
            <AdminMenu user={user} />
          )}
        </div>
      </div>
    </header>
  );
}