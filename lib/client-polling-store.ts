"use client";

type Listener = () => void;

export type PollingStore<T> = {
  getSnapshot: () => T;
  refresh: () => Promise<void>;
  setValue: (updater: T | ((current: T) => T)) => void;
  subscribe: (listener: Listener) => () => void;
};

export function createPollingStore<T>({
  initialValue,
  intervalMs,
  load,
}: {
  initialValue: T;
  intervalMs: number;
  load: () => Promise<T>;
}): PollingStore<T> {
  let value = initialValue;
  let timer: ReturnType<typeof setInterval> | null = null;
  let inFlight = false;
  const listeners = new Set<Listener>();

  function emit() {
    listeners.forEach((listener) => listener());
  }

  async function refresh() {
    if (inFlight) return;
    inFlight = true;
    try {
      value = await load();
      emit();
    } catch {
      // Keep the last good snapshot; the next interval will retry.
    } finally {
      inFlight = false;
    }
  }

  return {
    getSnapshot: () => value,
    refresh,
    setValue: (updater) => {
      value = typeof updater === "function" ? (updater as (current: T) => T)(value) : updater;
      emit();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      if (listeners.size === 1 && typeof window !== "undefined") {
        void refresh();
        timer = setInterval(() => void refresh(), intervalMs);
      }

      return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && timer) {
          clearInterval(timer);
          timer = null;
        }
      };
    },
  };
}
