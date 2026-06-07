import { ReactNode } from "react";
import { cn } from "@/lib/cn";

type SectionBackground = "default" | "muted" | "primary";
type SectionPadding = "sm" | "md" | "lg";

const bgMap: Record<SectionBackground, string> = {
  default: "bg-background",
  muted: "bg-muted",
  primary: "bg-primary text-primary-foreground",
};

const padMap: Record<SectionPadding, string> = {
  sm: "py-10 md:py-12",
  md: "py-14 md:py-16",
  lg: "py-16 md:py-20 lg:py-24",
};

export function Section({
  children,
  className,
  background = "default",
  padding = "md",
}: {
  children: ReactNode;
  className?: string;
  background?: SectionBackground;
  padding?: SectionPadding;
}) {
  return (
    <section className={cn(bgMap[background], padMap[padding], className)}>
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">{children}</div>
    </section>
  );
}

export function SectionHeader({
  title,
  subtitle,
  centered,
  className,
}: {
  title: string;
  subtitle?: string;
  centered?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("mb-8 space-y-2 md:mb-10", centered && "text-center", className)}>
      <h2 className="text-balance font-serif text-3xl font-semibold text-foreground md:text-4xl">{title}</h2>
      {subtitle ? <p className="mx-auto max-w-3xl text-base text-muted-foreground md:text-lg">{subtitle}</p> : null}
    </div>
  );
}
