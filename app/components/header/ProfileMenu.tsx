"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";

type User = {
  id: string;
  username: string;
  email: string;
  role: string;
  avatarUrl?: string | null;
  balance?: number;
  aiPoints?: {
    available: number;
  };
  teacherRegistrationEnabled?: boolean;
};

interface ProfileMenuProps {
  user: User;
}

export default function ProfileMenu({ user }: ProfileMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const teacherRegistrationEnabled = user.role === "STUDENT" && Boolean(user.teacherRegistrationEnabled);
  const balance = user.role === "ADMIN" ? null : user.balance ?? null;
  const points = user.role === "ADMIN" ? null : user.aiPoints?.available ?? null;

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (!res.ok) {
        throw new Error("Đăng xuất thất bại.");
      }
      setMenuOpen(false);
      // Sử dụng window.location để force full reload,
      // đảm bảo useUser re-fetch và cập nhật UI
      window.location.href = "/";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setMenuOpen(!menuOpen)}
        className="flex items-center gap-2 rounded-full border border-slate-200 px-2 py-1.5 transition-colors hover:bg-slate-50"
      >
        {/* Avatar */}
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-medium text-white">
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.username}
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            user?.username?.charAt(0).toUpperCase()
          )}
        </div>
        <span className="hidden text-sm font-medium text-slate-900 sm:block">
          {user?.username}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`h-4 w-4 text-slate-500 transition-transform ${
            menuOpen ? "rotate-180" : ""
          }`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {menuOpen && (
        <div className="absolute right-0 mt-2 w-56 z-50 rounded-xl border border-slate-200 bg-white py-2 shadow-lg">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-medium text-slate-900">
              {user?.username}
            </p>
            <p className="text-xs text-slate-500">{user?.email}</p>
            {user.role !== "ADMIN" && (
              <div className="mt-2 flex items-center gap-3">
                <div>
                  <p className="text-xs text-slate-500">Số dư</p>
                  <p className="text-sm font-semibold text-slate-900">{balance !== null ? Math.round(balance).toLocaleString("vi-VN") + "đ" : "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Điểm</p>
                  <p className="text-sm font-semibold text-slate-900">{points !== null ? points.toLocaleString("vi-VN") : "-"}</p>
                </div>
              </div>
            )}
          </div>
          <div className="py-1">
            <Link
              href="/profile"
              onClick={() => setMenuOpen(false)}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Hồ sơ của tôi
            </Link>
            <Link
              href="/my-courses"
              onClick={() => setMenuOpen(false)}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
              </svg>
              Khóa học của tôi
            </Link>
            <Link
              href="/student/wallet"
              onClick={() => setMenuOpen(false)}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
              Nạp tiền
            </Link>
            {/* Teacher/Admin management links: show for TEACHER and ADMIN */}
            {(user.role === "TEACHER" || user.role === "ADMIN") && (
              <>
                <div className="my-1 border-t border-slate-100" />
                <Link
                  href="/teacher/courses"
                  onClick={() => setMenuOpen(false)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  Quản lý khóa học
                </Link>
                <Link
                  href="/teacher/students"
                  onClick={() => setMenuOpen(false)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  Quản lý học viên
                </Link>
                <Link
                  href="/teacher/tests"
                  onClick={() => setMenuOpen(false)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  Quản lý bài test
                </Link>
              </>
            )}
            {user.role === "ADMIN" && (
              <>
                <div className="my-1 border-t border-slate-100" />
                <Link
                  href="/admin"
                  onClick={() => setMenuOpen(false)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  Trang quản trị
                </Link>
              </>
            )}
            {teacherRegistrationEnabled ? (
              <Link
                href="/teacher-registration"
                onClick={() => setMenuOpen(false)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <path d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path d="M12 14l6.16-3.42A12 12 0 0 1 19 15.5V17" />
                  <path d="M4.84 10.58A12 12 0 0 0 4 15.5V17" />
                </svg>
                Đăng ký giảng viên
              </Link>
            ) : null}
          </div>
          <div className="border-t border-slate-100 py-1">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" x2="9" y1="12" y2="12" />
              </svg>
              Đăng xuất
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
