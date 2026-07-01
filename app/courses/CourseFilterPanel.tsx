"use client";

import { useState } from "react";
import Link from "next/link";
import {
  LANGUAGES,
  LEVELS,
  PRODUCT_TYPES,
  getLanguageLabel,
  getLevelLabel,
  getProductTypeLabel,
} from "@/app/components/learningMarketplace";

const tabs = [
  { key: "popular", label: "Phổ biến" },
  { key: "new", label: "Mới nhất" },
  { key: "combo", label: "Combo" },
  { key: "skill", label: "Theo kỹ năng" },
  { key: "cert", label: "Luyện thi chứng chỉ" },
];

function buildHref(params: Record<string, string | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value && value !== "all") query.set(key, value);
  });
  const qs = query.toString();
  return qs ? `/courses?${qs}` : "/courses";
}

export function CourseFilterPanel({
  params,
}: {
  params: Record<string, string | undefined>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const activeTab = params.tab || "popular";

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
      >
        Bộ lọc
      </button>

      {isOpen ? (
        <div className="mt-4">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {tabs.map((tab) => (
              <Link
                key={tab.key}
                href={buildHref({ ...params, tab: tab.key })}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeTab === tab.key ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:opacity-90"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Filter label="Ngôn ngữ" name="language" values={["all", ...LANGUAGES]} params={params} />
            <Filter label="Trình độ" name="level" values={["all", ...LEVELS]} params={params} />
            <Filter label="Loại khóa học" name="type" values={["all", ...PRODUCT_TYPES]} params={params} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Filter({
  label,
  name,
  values,
  params,
}: {
  label: string;
  name: string;
  values: readonly string[];
  params: Record<string, string | undefined>;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-2">
        {values.map((value) => (
          <Link
            key={value}
            href={buildHref({ ...params, [name]: value })}
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold ${
              (params[name] || "all") === value ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
            }`}
          >
            {value === "all"
              ? "Tất cả"
              : name === "language"
                ? getLanguageLabel(value)
                : name === "level"
                  ? getLevelLabel(value)
                  : getProductTypeLabel(value)}
          </Link>
        ))}
      </div>
    </div>
  );
}
