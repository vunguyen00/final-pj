"use client";

import { useEffect, useState } from "react";

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

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    let mounted = true;

    fetch("/api/auth/me", {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    })
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        if (mounted) {
          setUser(data?.user || null);
        }
      })
      .catch(() => {
        if (mounted) {
          setUser(null);
        }
      })
      .finally(() => {
        window.clearTimeout(timeout);

        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  return { user, loading };
}

export type { User };
