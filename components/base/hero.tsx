import Link from "next/link";
import { ReactNode } from "react";

const languages = [
  { name: "English", code: "EN", label: "Tiếng Anh" },
  { name: "Chinese", code: "ZH", label: "Tiếng Trung" },
  { name: "Japanese", code: "JP", label: "Tiếng Nhật" },
  { name: "Korean", code: "KR", label: "Tiếng Hàn" },
];

export function Hero({
  title,
  subtitle,
  description,
  primaryAction,
  secondaryAction,
  rightSlot,
}: {
  title: string;
  subtitle?: string;
  description?: string;
  primaryAction?: { label: string; href: string };
  secondaryAction?: { label: string; href: string };
  rightSlot?: ReactNode;
}) {
  return (
    <section className="border-b border-border bg-background py-12 md:py-16 lg:py-20">
      <div className="mx-auto grid w-full max-w-7xl items-start gap-8 px-4 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-8">
        <div>
          {subtitle ? <p className="text-sm font-semibold uppercase tracking-wide text-primary">{subtitle}</p> : null}
          <h1 className="mt-3 text-pretty font-serif text-3xl font-semibold leading-tight text-foreground md:text-4xl lg:text-5xl">{title}</h1>
          {description ? <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground md:text-lg">{description}</p> : null}
          {primaryAction || secondaryAction ? (
            <div className="mt-7 flex flex-wrap gap-3">
              {primaryAction ? (
                <Link href={primaryAction.href} className="rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90">
                  {primaryAction.label}
                </Link>
              ) : null}
              {secondaryAction ? (
                <Link href={secondaryAction.href} className="rounded-lg border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-muted">
                  {secondaryAction.label}
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>
        {rightSlot ?? <LanguageShowcase />}
      </div>
    </section>
  );
}

function LanguageShowcase() {
  return (
    <div className="w-full self-start rounded-lg border border-border bg-muted p-4 sm:p-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {languages.map((language) => (
          <Link
            key={language.name}
            href={`/courses?language=${encodeURIComponent(language.name)}`}
            className="flex min-h-24 flex-col justify-center rounded-lg border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{language.code}</p>
            <p className="mt-2 font-medium text-foreground">{language.label}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
