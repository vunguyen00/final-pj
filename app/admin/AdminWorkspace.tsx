"use client";

import { ReactNode, useState } from "react";

export type AdminWorkspaceItem<T extends string> = {
  id: T;
  label: string;
  description?: string;
};

export default function AdminWorkspace<T extends string>({
  items,
  initialActiveId,
  ariaLabel,
  sidebarWidth = 400,
  renderContent,
}: {
  items: AdminWorkspaceItem<T>[];
  initialActiveId: T;
  ariaLabel: string;
  sidebarWidth?: number;
  renderContent: (activeId: T, select: (id: T) => void) => ReactNode;
}) {
  const [activeId, setActiveId] = useState<T>(initialActiveId);

  return (
    <div className="overflow-x-auto">
      <div style={{ display: "flex", alignItems: "stretch", minWidth: 1000 }}>
        <aside className="p-4" style={{ flex: `0 0 ${sidebarWidth}px`, width: sidebarWidth }}>
          <nav className="space-y-1.5" aria-label={ariaLabel}>
          {items.map((item) => {
            const active = item.id === activeId;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveId(item.id)}
                aria-current={active ? "page" : undefined}
                className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-transparent text-foreground hover:bg-muted"
                }`}
              >
                <span className="block text-sm font-bold">{item.label}</span>
                {item.description ? (
                  <span className={`mt-1 block text-xs leading-5 ${active ? "text-primary-foreground/75" : "text-muted-foreground"}`}>
                    {item.description}
                  </span>
                ) : null}
              </button>
            );
          })}
          </nav>
        </aside>
        <div className="p-4" style={{ flex: "1 1 0%", minWidth: 0 }}>
          {renderContent(activeId, setActiveId)}
        </div>
      </div>
    </div>
  );
}
