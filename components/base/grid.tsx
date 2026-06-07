import Link from "next/link";
import { ReactNode } from "react";
import { cn } from "@/lib/cn";

type GridCols = 1 | 2 | 3 | 4;
type GridGap = "sm" | "md" | "lg";

const colsMap: Record<GridCols, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 md:grid-cols-2",
  3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
};

const gapMap: Record<GridGap, string> = {
  sm: "gap-3",
  md: "gap-5",
  lg: "gap-6",
};

export function CardGrid({
  children,
  cols = 3,
  gap = "md",
  className,
}: {
  children: ReactNode;
  cols?: GridCols;
  gap?: GridGap;
  className?: string;
}) {
  return <div className={cn("grid", colsMap[cols], gapMap[gap], className)}>{children}</div>;
}

export function GridCard({
  title,
  description,
  icon,
  badge,
  href,
  className,
  footer,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  badge?: string;
  href?: string;
  className?: string;
  footer?: ReactNode;
}) {
  const body = (
    <article className={cn("h-full rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-foreground">{icon}</div>
        {badge ? <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground">{badge}</span> : null}
      </div>
      <h3 className="mt-4 text-lg font-semibold text-foreground">{title}</h3>
      {description ? <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p> : null}
      {footer ? <div className="mt-4">{footer}</div> : null}
    </article>
  );

  if (!href) return body;
  return (
    <Link href={href} className="block h-full">
      {body}
    </Link>
  );
}
