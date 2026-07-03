"use client";

import { useRef } from "react";
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

export function CourseFilterPanel({ params }: { params: Record<string, string | undefined> }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const activeTab = params.tab || "popular";
  const activeFilterCount = ["language", "level", "type"].filter((key) => params[key] && params[key] !== "all").length;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Tìm khóa học phù hợp</p>
          <p className="mt-1 text-sm text-muted-foreground">Lọc nhanh theo ngôn ngữ, trình độ và loại khóa học.</p>
        </div>
        <button
          type="button"
          onClick={() => dialogRef.current?.showModal()}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
        >
          Bộ lọc{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
        </button>
      </div>

      <dialog
        ref={dialogRef}
        aria-label="Bộ lọc khóa học"
        className="w-[min(calc(100vw-2rem),64rem)] max-w-5xl overflow-hidden rounded-xl border border-border bg-card p-0 text-foreground shadow-2xl backdrop:bg-slate-950/50"
      >
          <div className="flex max-h-[90vh] w-full flex-col overflow-hidden">
            <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-foreground">Bộ lọc khóa học</h2>
                <p className="mt-1 text-sm text-muted-foreground">Chọn tiêu chí để thu hẹp danh sách khóa học.</p>
              </div>
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                className="rounded-lg border border-border px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted"
              >
                Đóng
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <div className="flex flex-wrap gap-2">
                {tabs.map((tab) => (
                  <Link
                    key={tab.key}
                    href={buildHref({ ...params, tab: tab.key })}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      activeTab === tab.key ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:opacity-90"
                    }`}
                  >
                    {tab.label}
                  </Link>
                ))}
              </div>

              <div className="mt-6 grid gap-6 lg:grid-cols-3">
                <Filter label="Ngôn ngữ" name="language" values={["all", ...LANGUAGES]} params={params} />
                <Filter label="Trình độ" name="level" values={["all", ...LEVELS]} params={params} />
                <Filter label="Loại khóa học" name="type" values={["all", ...PRODUCT_TYPES]} params={params} />
              </div>
            </div>
          </div>
      </dialog>
    </>
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
    <section>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-2">
        {values.map((value) => {
          const active = (params[name] || "all") === value;
          const labelText =
            value === "all"
              ? "Tất cả"
              : name === "language"
                ? getLanguageLabel(value)
                : name === "level"
                  ? getLevelLabel(value)
                  : getProductTypeLabel(value);

          return (
            <Link
              key={value}
              href={buildHref({ ...params, [name]: value })}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                active ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:opacity-90"
              }`}
            >
              {labelText}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
