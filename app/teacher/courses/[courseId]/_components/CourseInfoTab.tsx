"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import Image from "next/image";
import { isLikelyImageSearchUrl, normalizeCourseThumbnailUrl } from "@/lib/course-thumbnail";
import { COURSE_CATEGORIES, getCourseCategoryLabel, getCourseInfoLabels, getCourseLevelLabel, getLanguageDisplayLabel } from "@/lib/language-display";
import type { Course, LearningLanguage } from "../types";

type CourseInfoTabProps = {
  course: Course;
  languages: LearningLanguage[];
  onUpdated: (course: Partial<Course>) => void;
};

type CourseInfoForm = {
  name: string;
  description: string;
  price: string;
  category: string;
  level: string;
  duration: string;
  thumbnail: string;
  languageId: string;
};

const levelOptions = [
  { value: "Beginner", label: "Mới bắt đầu" },
  { value: "Elementary", label: "Sơ cấp" },
  { value: "Intermediate", label: "Trung cấp" },
  { value: "Upper Intermediate", label: "Trung cấp cao" },
  { value: "Advanced", label: "Nâng cao" },
];

export function CourseInfoTab({ course, languages, onUpdated }: CourseInfoTabProps) {
  const [form, setForm] = useState<CourseInfoForm>({
    name: course.name,
    description: course.description,
    price: String(course.price),
    category: course.category || "",
    level: course.level || "Beginner",
    duration: course.duration || "",
    thumbnail: course.thumbnail || "",
    languageId: course.language?.id || "",
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const thumbnailPreviewUrl = normalizeCourseThumbnailUrl(form.thumbnail);
  const languageOptions =
    course.language && !languages.some((language) => language.id === course.language?.id)
      ? [course.language, ...languages]
      : languages;
  const selectedLanguage = languageOptions.find((language) => language.id === form.languageId) || course.language || null;
  const courseLanguageKey = selectedLanguage?.code || selectedLanguage?.name || "vi";
  const labels = getCourseInfoLabels(courseLanguageKey);

  const inputClass =
    "mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  async function handleThumbnailUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploading(true);
    setError("");

    try {
      const uploadData = new FormData();
      uploadData.append("file", file);

      const response = await fetch("/api/teacher/upload-thumbnail", {
        method: "POST",
        body: uploadData,
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data?.url) {
        setError(data?.error || "Không thể tải ảnh khóa học lên.");
        return;
      }

      setForm((current) => ({ ...current, thumbnail: data.url }));
    } catch (uploadError) {
      console.error("Error uploading course thumbnail:", uploadError);
      setError("Không thể tải ảnh khóa học lên.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(`/api/teacher/courses/${course.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim(),
          price: Number(form.price),
          category: form.category,
          level: form.level,
          duration: form.duration.trim(),
          thumbnail: normalizeCourseThumbnailUrl(form.thumbnail),
          languageId: form.languageId,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data?.error || "Không thể cập nhật thông tin khóa học.");
        return;
      }

      onUpdated(data.course);
      setMessage(
        data?.requiresApproval
          ? "Đã lưu thay đổi và gửi khóa học chờ quản trị viên duyệt."
          : "Đã cập nhật thông tin khóa học.",
      );
    } catch (saveError) {
      console.error("Error updating course:", saveError);
      setError("Không thể cập nhật thông tin khóa học.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-xl font-bold text-slate-950">{labels.heading}</h2>
        <p className="mt-1 text-sm text-slate-500">
          {labels.description}
        </p>
      </div>

      {message ? (
        <p className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <label className="block text-sm font-semibold text-slate-700">
          {labels.name}
          <input
            required
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            className={inputClass}
          />
        </label>

        <label className="block text-sm font-semibold text-slate-700">
          {labels.courseDescription}
          <textarea
            required
            rows={5}
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            className={inputClass}
          />
        </label>

        <label className="block text-sm font-semibold text-slate-700">
          Ngôn ngữ khóa học
          <select
            value={form.languageId}
            onChange={(event) => setForm({ ...form, languageId: event.target.value, category: "" })}
            className={inputClass}
          >
            <option value="">Chọn ngôn ngữ</option>
            {languageOptions.map((language) => (
              <option key={language.id} value={language.id}>
                {getLanguageDisplayLabel(language.code || language.name)}
              </option>
            ))}
          </select>
          {languages.length === 0 ? (
            <span className="mt-2 block text-xs font-normal text-amber-700">
              Tài khoản giáo viên chưa có ngôn ngữ giảng dạy được duyệt nên chưa thể đổi ngôn ngữ khóa học.
            </span>
          ) : null}
        </label>

        <div className="grid gap-5 md:grid-cols-4">
          <label className="block text-sm font-semibold text-slate-700">
            {labels.price}
            <input
              type="number"
              min={0}
              required
              value={form.price}
              onChange={(event) => setForm({ ...form, price: event.target.value })}
              className={inputClass}
            />
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            {labels.category}
            <select
              value={form.category}
              onChange={(event) => setForm({ ...form, category: event.target.value })}
              className={inputClass}
            >
              <option value="">{labels.categoryPlaceholder}</option>
              {COURSE_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {getCourseCategoryLabel(category, courseLanguageKey)}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            {labels.level}
            <select
              value={form.level}
              onChange={(event) => setForm({ ...form, level: event.target.value })}
              className={inputClass}
            >
              {levelOptions.map((level) => (
                <option key={level.value} value={level.value}>{getCourseLevelLabel(level.value, courseLanguageKey)}</option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            {labels.duration}
            <input
              value={form.duration}
              onChange={(event) => setForm({ ...form, duration: event.target.value })}
              placeholder={labels.durationPlaceholder}
              className={inputClass}
            />
          </label>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700">
            {labels.thumbnail}
            <input
              value={form.thumbnail}
              onChange={(event) => setForm({ ...form, thumbnail: event.target.value })}
              onBlur={() => {
                const normalized = normalizeCourseThumbnailUrl(form.thumbnail);
                if (normalized && normalized !== form.thumbnail.trim()) {
                  setForm((current) => ({ ...current, thumbnail: normalized }));
                }
              }}
              placeholder={labels.thumbnailPlaceholder}
              className={inputClass}
            />
          </label>
          {isLikelyImageSearchUrl(form.thumbnail) && normalizeCourseThumbnailUrl(form.thumbnail) === form.thumbnail.trim() ? (
            <p className="mt-2 text-xs text-amber-700">
              Link này là trang tìm kiếm, không phải ảnh trực tiếp. Hãy mở ảnh rồi sao chép địa chỉ ảnh hoặc tải ảnh từ máy.
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label
              className={`inline-flex cursor-pointer items-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 ${
                uploading ? "pointer-events-none opacity-60" : ""
              }`}
            >
              {uploading ? labels.uploadingImage : labels.uploadImage}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                disabled={uploading}
                onChange={handleThumbnailUpload}
                className="hidden"
              />
            </label>
            <span className="text-xs text-slate-500">{labels.imageHint}</span>
          </div>

          {thumbnailPreviewUrl ? (
            <div className="relative mt-4 h-48 max-w-xl overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
              <Image src={thumbnailPreviewUrl} alt="Xem trước ảnh khóa học" fill sizes="(min-width: 768px) 36rem, 100vw" className="object-cover" unoptimized />
            </div>
          ) : null}
        </div>

        <div className="flex justify-end border-t border-slate-100 pt-5">
          <button
            type="submit"
            disabled={saving || uploading}
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? labels.saving : labels.save}
          </button>
        </div>
      </form>
    </section>
  );
}
