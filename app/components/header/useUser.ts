"use client";

import { useEffect, useState } from "react";

type User = {
  id: string;
  username: string;
  email: string;
  role: string;
  avatarUrl?: string | null;
};

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/auth/me", { signal: controller.signal })
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        setUser(data?.user || null);
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  return { user, loading };
}