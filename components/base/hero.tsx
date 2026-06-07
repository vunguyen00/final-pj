import Link from "next/link";

export function Hero({
  title,
  subtitle,
  description,
  primaryAction,
  secondaryAction,
}: {
  title: string;
  subtitle?: string;
  description?: string;
  primaryAction?: { label: string; href: string };
  secondaryAction?: { label: string; href: string };
}) {
  return (
    <section className="border-b border-border bg-background py-14 md:py-20 lg:py-24">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:px-8">
        <div>
          {subtitle ? <p className="text-sm font-semibold uppercase tracking-wide text-primary">{subtitle}</p> : null}
          <h1 className="mt-3 text-pretty font-serif text-4xl font-semibold leading-tight text-foreground md:text-5xl">{title}</h1>
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
        <div className="rounded-2xl border border-border bg-muted p-6">
          <div className="grid grid-cols-2 gap-3">
            {[
              ["English", "EN"],
              ["Chinese", "ZH"],
              ["Japanese", "JP"],
              ["Korean", "KR"],
            ].map(([name, code]) => (
              <div key={name} className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{code}</p>
                <p className="mt-2 font-medium text-foreground">{name}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
