"use client";

import Link from "next/link";
import type { ReactNode } from "react";
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
    const nextValue = value?.trim();
    if (nextValue && nextValue !== "all") query.set(key, nextValue);
  });
  const qs = query.toString();
  return qs ? `/courses?${qs}` : "/courses";
}

export function CourseFilterPanel({
  params,
  resultCount,
}: {
  params: Record<string, string | undefined>;
  resultCount: number;
}) {
  const activeTab = params.tab || "popular";
  const activeFilterCount = ["q", "language", "level", "type", "sort"].filter((key) => {
    const value = params[key]?.trim();
    return value && value !== "all";
  }).length;

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-base font-semibold text-foreground">Tìm khóa học phù hợp</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {resultCount.toLocaleString("vi-VN")} khóa học phù hợp
            {activeFilterCount ? ` · ${activeFilterCount} bộ lọc đang bật` : ""}
          </p>
        </div>

        <div className="overflow-x-auto pb-1">
          <div className="flex min-w-max gap-2">
            {tabs.map((tab) => (
              <Link
                key={tab.key}
                href={buildHref({ ...params, tab: tab.key })}
                className={`rounded-full px-3.5 py-2 text-sm font-semibold transition ${
                  activeTab === tab.key ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:opacity-90"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <form action="/courses" className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1.3fr)_1fr_1fr_1fr_1fr_auto_auto]">
        {activeTab !== "popular" ? <input type="hidden" name="tab" value={activeTab} /> : null}
        {params.skill ? <input type="hidden" name="skill" value={params.skill} /> : null}

        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tìm kiếm</span>
          <input
            type="search"
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Tên khóa học, giảng viên..."
            className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
        </label>

        <FilterSelect label="Ngôn ngữ" name="language" value={params.language ?? "all"}>
          <option value="all">Tất cả</option>
          {LANGUAGES.map((language) => (
            <option key={language} value={language}>
              {getLanguageLabel(language)}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect label="Trình độ" name="level" value={params.level ?? "all"}>
          <option value="all">Tất cả</option>
          {LEVELS.map((level) => (
            <option key={level} value={level}>
              {getLevelLabel(level)}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect label="Loại khóa" name="type" value={params.type ?? "all"}>
          <option value="all">Tất cả</option>
          {PRODUCT_TYPES.map((type) => (
            <option key={type} value={type}>
              {getProductTypeLabel(type)}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect label="Sắp xếp" name="sort" value={params.sort ?? ""}>
          <option value="">Mặc định</option>
          <option value="price-asc">Giá tăng dần</option>
          <option value="price-desc">Giá giảm dần</option>
          <option value="name">Tên A-Z</option>
        </FilterSelect>

        <button type="submit" className="h-10 self-end rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90">
          Áp dụng
        </button>
        <Link href="/courses" className="flex h-10 items-center justify-center self-end rounded-lg border border-border bg-white px-4 text-sm font-semibold text-foreground hover:bg-muted">
          Đặt lại
        </Link>
      </form>
    </div>
  );
}

function FilterSelect({
  label,
  name,
  value,
  children,
}: {
  label: string;
  name: string;
  value: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <select
        name={name}
        defaultValue={value}
        className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
      >
        {children}
      </select>
    </label>
  );
}
