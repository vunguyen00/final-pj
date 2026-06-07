import { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Stats({
  stats,
  className,
}: {
  stats: Array<{ label: string; value: string; hint?: string; icon?: ReactNode }>;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4", className)}>
      {stats.map((item) => (
        <div key={item.label} className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">{item.label}</p>
            {item.icon ? <span className="text-muted-foreground">{item.icon}</span> : null}
          </div>
          <p className="mt-2 text-3xl font-semibold text-foreground">{item.value}</p>
          {item.hint ? <p className="mt-1 text-xs text-muted-foreground">{item.hint}</p> : null}
        </div>
      ))}
    </div>
  );
}

export function FeatureList({
  items,
}: {
  items: Array<{ title: string; description: string; icon?: ReactNode }>;
}) {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <article key={item.title} className="rounded-xl border border-border bg-card p-5">
          {item.icon ? <div className="mb-3 text-primary">{item.icon}</div> : null}
          <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
        </article>
      ))}
    </div>
  );
}
