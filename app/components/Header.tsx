"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { readJsonResponse } from "@/lib/http-response";
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

type AppNotification = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
};

type NotificationStore = {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => AppNotification | null;
  dismiss: () => void;
};

function hasMatch(item: MatchedNavItem | BasicNavItem): item is MatchedNavItem {
  return typeof (item as MatchedNavItem).match === "function";
}

const navItems = [
  { href: "/", label: "Khám phá", match: (path: string) => path === "/" },
  { href: "/courses", label: "Khóa học", match: (path: string) => path.startsWith("/courses") },
  { href: "/teachers", label: "Giảng viên", match: (path: string) => path.startsWith("/teachers") },
] satisfies MatchedNavItem[];

const studentNavItems = [
  { href: "/", label: "Khám phá" },
  { href: "/courses", label: "Khóa học" },
  { href: "/student/tests", label: "Bài test" },
  { href: "/student/results", label: "Kết quả" },
  { href: "/student/wallet", label: "Điểm nhận xét" },
  { href: "/student", label: "Tổng quan" },
] satisfies BasicNavItem[];

const teacherNavItems = [
  { href: "/my-courses", label: "Khóa học của tôi" },
  { href: "/student/tests", label: "Bài test" },
  { href: "/teacher/students", label: "Học viên" },
  { href: "/student/wallet", label: "Điểm nhận xét" },
] satisfies BasicNavItem[];

const teacherOverviewNavItem = { href: "/teacher", label: "Tổng quan" } satisfies BasicNavItem;

const adminNavItems = [
  { href: "/", label: "Khám phá" },
  { href: "/courses", label: "Khóa học" },
  { href: "/my-courses", label: "Khóa học của tôi" },
  { href: "/student/tests", label: "Bài test" },
  { href: "/student/results", label: "Kết quả" },
  { href: "/student/wallet", label: "Điểm nhận xét" },
  { href: "/admin", label: "Tổng quan" },
] satisfies BasicNavItem[];

const guestNavItems = [
  { href: "/", label: "Khám phá" },
  { href: "/courses", label: "Khóa học" },
  { href: "/teachers", label: "Giảng viên" },
] satisfies BasicNavItem[];

const aiNavItems = [
  { href: "/student/speaking-ai", label: "Nói với AI" },
  { href: "/student/writing-ai", label: "Luyện viết với AI" },
] satisfies BasicNavItem[];

function getNavigationLabel(item: BasicNavItem | MatchedNavItem) {
  if (item.href === "/student/wallet") return "Điểm nhận xét";
  if (item.href === "/student/rewards") return "Điểm nhận xét";
  return item.label;
}

const dashboardPaths = new Set(["/admin", "/student", "/teacher"]);

function isNavigationItemActive(item: BasicNavItem | MatchedNavItem, pathname: string) {
  if (hasMatch(item)) return item.match(pathname);

  const itemPath = item.href.split("?")[0];
  if (dashboardPaths.has(itemPath)) return pathname === itemPath;
  return pathname === itemPath || (itemPath !== "/" && pathname.startsWith(`${itemPath}/`));
}

function markNotificationAsRead(notificationId: string) {
  return fetch("/api/notifications", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids: [notificationId] }),
  }).catch(() => undefined);
}

function startNotificationPolling({
  onShow,
  onHide,
}: {
  onShow: (notification: AppNotification) => void;
  onHide: (notificationId: string) => void;
}) {
  let cancelled = false;
  let loading = false;
  let activeNotificationId: string | null = null;
  const controllers = new Set<AbortController>();
  const timers = new Set<number>();

  async function loadNotifications() {
    if (cancelled || loading || activeNotificationId) return;
    loading = true;
    const controller = new AbortController();
    controllers.add(controller);
    try {
      const response = await fetch("/api/notifications?unread=1&take=1", { cache: "no-store", signal: controller.signal });
      const data = (await readJsonResponse(response).catch(() => ({}))) as { notifications?: AppNotification[] };
      if (!response.ok || !data.notifications?.length || cancelled) return;

      const nextToast = data.notifications[0];
      activeNotificationId = nextToast.id;
      onShow(nextToast);
      const timer = window.setTimeout(() => {
        timers.delete(timer);
        if (cancelled) return;
        void markNotificationAsRead(nextToast.id);
        onHide(nextToast.id);
        activeNotificationId = null;
        void loadNotifications();
      }, 8000);
      timers.add(timer);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      // Notification toast is best-effort; normal navigation should not be interrupted.
    } finally {
      controllers.delete(controller);
      loading = false;
    }
  }

  void loadNotifications();
  const interval = window.setInterval(loadNotifications, 5000);
  const refreshWhenVisible = () => {
    if (document.visibilityState === "visible") void loadNotifications();
  };
  window.addEventListener("focus", refreshWhenVisible);
  document.addEventListener("visibilitychange", refreshWhenVisible);

  return () => {
    cancelled = true;
    controllers.forEach((controller) => controller.abort());
    timers.forEach((timer) => window.clearTimeout(timer));
    window.clearInterval(interval);
    window.removeEventListener("focus", refreshWhenVisible);
    document.removeEventListener("visibilitychange", refreshWhenVisible);
  };
}

function createNotificationStore(): NotificationStore {
  let notification: AppNotification | null = null;
  let stopPolling: (() => void) | null = null;
  const listeners = new Set<() => void>();

  function emit() {
    listeners.forEach((listener) => listener());
  }

  function hide(notificationId: string) {
    if (notification?.id !== notificationId) return;
    notification = null;
    emit();
  }

  return {
    subscribe(listener) {
      listeners.add(listener);
      if (listeners.size === 1) {
        stopPolling = startNotificationPolling({
          onShow: (nextNotification) => {
            notification = nextNotification;
            emit();
          },
          onHide: hide,
        });
      }

      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          stopPolling?.();
          stopPolling = null;
        }
      };
    },
    getSnapshot() {
      return notification;
    },
    dismiss() {
      if (!notification) return;
      void markNotificationAsRead(notification.id);
      notification = null;
      emit();
    },
  };
}

const subscribeToEmptyNotificationStore = () => () => undefined;
const getEmptyNotificationSnapshot = () => null;
const subscribeToMountedStore = (listener: () => void) => {
  listener();
  return () => undefined;
};
const getMountedSnapshot = () => true;
const getServerMountedSnapshot = () => false;

export default function Header({ showOnAdmin = false }: { showOnAdmin?: boolean }) {
  const pathname = usePathname() || "";
  const { user, loading } = useUser();
  const userId = user?.id;
  const hideHeader = pathname.startsWith("/auth") || (pathname.startsWith("/admin") && !showOnAdmin);
  const [globalError, setGlobalError] = useState("");
  const [open, setOpen] = useState(false);
  const [aiMenuOpen, setAiMenuOpen] = useState(false);
  const mounted = useSyncExternalStore(
    subscribeToMountedStore,
    getMountedSnapshot,
    getServerMountedSnapshot,
  );
  const notificationStore = useMemo(() => (userId && !hideHeader ? createNotificationStore() : null), [hideHeader, userId]);
  const toast = useSyncExternalStore(
    notificationStore?.subscribe ?? subscribeToEmptyNotificationStore,
    notificationStore?.getSnapshot ?? getEmptyNotificationSnapshot,
    getEmptyNotificationSnapshot,
  );

  useEffect(() => {
    function handleGlobalError(event: Event) {
      const customEvent = event as CustomEvent;
      setGlobalError(customEvent.detail || "Đã xảy ra lỗi.");
    }
    window.addEventListener("app-global-error", handleGlobalError);
    return () => window.removeEventListener("app-global-error", handleGlobalError);
  }, []);

  useEffect(() => {
    if (!globalError) return;
    const clearErrorTimer = setTimeout(() => setGlobalError(""), 5000);
    return () => clearTimeout(clearErrorTimer);
  }, [globalError]);

  if (hideHeader) return null;

  const baseLinks = user?.role === "TEACHER" ? navItems.filter((item) => item.href !== "/teachers") : [];
  const roleLinks = !user
    ? guestNavItems
    : user.role === "ADMIN"
      ? adminNavItems
      : user.role === "TEACHER"
        ? teacherNavItems
        : studentNavItems;
  const navigationLinks = mounted ? [...baseLinks, ...roleLinks] : [];
  const postAiNavigationLinks = mounted && user?.role === "TEACHER" ? [teacherOverviewNavItem] : [];
  const showAiMenu = mounted && Boolean(user);
  const aiActive = aiNavItems.some((item) => pathname === item.href);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/90 backdrop-blur">
      {globalError ? <div className="bg-destructive/10 py-2 text-center text-sm font-semibold text-destructive">{globalError}</div> : null}
      {toast ? (
        <div className="fixed right-4 top-20 z-[90] w-[min(calc(100vw-2rem),24rem)] rounded-xl border border-blue-200 bg-white p-4 shadow-2xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-slate-950">{toast.title}</p>
              <p className="mt-1 text-sm leading-5 text-slate-600">{toast.body}</p>
            </div>
            <button type="button" onClick={() => notificationStore?.dismiss()} className="rounded-md px-2 py-1 text-sm font-bold text-slate-500 hover:bg-slate-100" aria-label="Đóng thông báo">
              x
            </button>
          </div>
        </div>
      ) : null}
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">FC</span>
          <span className="text-lg font-semibold tracking-tight text-foreground">FinnCenter</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navigationLinks.map((item) => {
            const active = isNavigationItemActive(item, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {getNavigationLabel(item)}
              </Link>
            );
          })}
          {showAiMenu ? (
            <div className="group relative" onMouseLeave={() => setAiMenuOpen(false)}>
              <button
                type="button"
                onClick={() => setAiMenuOpen((value) => !value)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  aiActive ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
                aria-haspopup="menu"
                aria-expanded={aiMenuOpen}
              >
                AI luyện tập
              </button>
              <div
                className={`absolute right-0 top-full z-50 mt-2 min-w-44 rounded-lg border border-border bg-card p-2 shadow-lg transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 ${
                  aiMenuOpen ? "visible opacity-100" : "invisible opacity-0"
                }`}
              >
                {aiNavItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setAiMenuOpen(false)}
                    className={`block rounded-md px-3 py-2 text-sm font-medium ${
                      pathname === item.href ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
          {postAiNavigationLinks.map((item) => {
            const active = isNavigationItemActive(item, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {getNavigationLabel(item)}
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
          {navigationLinks.map((item) => (
            <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-muted">
              {getNavigationLabel(item)}
            </Link>
          ))}
          {showAiMenu ? (
            <div className="mt-2 border-t border-border pt-2">
              <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">AI luyện tập</p>
              {aiNavItems.map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-muted">
                  {item.label}
                </Link>
              ))}
            </div>
          ) : null}
          {postAiNavigationLinks.map((item) => (
            <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-muted">
              {getNavigationLabel(item)}
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  );
}
