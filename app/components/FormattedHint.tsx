export function FormattedHint({ hint }: { hint: string | null | undefined }) {
  const items = String(hint || "")
    .split(/\r?\n/)
    .map((line) =>
      line
        .trim()
        .replace(/^[-*•]\s*/, "")
        .replace(/^\d+[.)]\s*/, ""),
    )
    .filter(Boolean);

  if (items.length === 0) return null;

  return (
    <aside className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm font-bold text-amber-900">Gợi ý</p>
      <ul className="mt-2 space-y-1.5 text-sm leading-6 text-amber-950">
        {items.map((item, index) => (
          <li key={`${index}-${item}`} className="flex items-start gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
            <span className="whitespace-pre-wrap">{item}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
