"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import Image from "next/image";
import { isLikelyImageSearchUrl, normalizeCourseThumbnailUrl } from "@/lib/course-thumbnail";
import { readJsonResponse } from "@/lib/http-response";
import { COURSE_CATEGORIES, getCourseCategoryLabel, getCourseInfoLabels, getCourseLevelLabel, getLanguageNativeLabel } from "@/lib/language-display";
import type { Course, LearningLanguage } from "../types";

type CourseInfoTabProps = {
  course: Course;
  languages: LearningLanguage[];
  viewerRole: string;
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

export function CourseInfoTab({ course, languages, viewerRole, onUpdated }: CourseInfoTabProps) {
  const [form, setForm] = useState<CourseInfoForm>({
    name: course.name,
    description: course.description,
    price: String(course.price),
    category: course.category || "",
    level: course.level || "Beginner",
    duration: course.duration || "",
    thumbnail: course.thumbnail || "",
    languageId:
      course.language?.id ||
      (viewerRole === "TEACHER" ? languages[0]?.id || "" : ""),
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
      const data = await readJsonResponse(response).catch(() => ({}));

      if (!response.ok || !data?.url) {
        setError(data?.error || labels.uploadError);
        return;
      }

      setForm((current) => ({ ...current, thumbnail: data.url }));
    } catch (uploadError) {
      console.error("Error uploading course thumbnail:", uploadError);
      setError(labels.uploadError);
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
          ...(viewerRole === "ADMIN" && { languageId: form.languageId }),
        }),
      });
      const data = await readJsonResponse(response).catch(() => ({}));

      if (!response.ok) {
        setError(data?.error || labels.saveError);
        return;
      }

      onUpdated(data.course);
      setMessage(
        data?.requiresApproval
          ? labels.savedPending
          : labels.saved,
      );
    } catch (saveError) {
      console.error("Error updating course:", saveError);
      setError(labels.saveError);
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

        {viewerRole === "ADMIN" ? (
          <label className="block text-sm font-semibold text-slate-700">
            {labels.language}
            <select
              value={form.languageId}
              onChange={(event) => setForm({ ...form, languageId: event.target.value, category: "" })}
              className={inputClass}
            >
              <option value="">{labels.languagePlaceholder}</option>
              {languageOptions.map((language) => (
                <option key={language.id} value={language.id}>
                  {getLanguageNativeLabel(language.code || language.name)}
                </option>
              ))}
            </select>
          </label>
        ) : selectedLanguage ? (
          <div>
            <label htmlFor="locked-course-language" className="text-sm font-semibold text-slate-700">
              {labels.language}
            </label>
            <input
              id="locked-course-language"
              readOnly
              value={getLanguageNativeLabel(selectedLanguage.code || selectedLanguage.name)}
              className={`${inputClass} bg-slate-100 font-semibold`}
            />
            <p className="mt-1.5 text-xs text-slate-500">
              {labels.languageLockedHint}
            </p>
          </div>
        ) : (
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">
            {labels.noApprovedLanguage}
          </p>
        )}

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
              {labels.directImageWarning}
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
              <Image src={thumbnailPreviewUrl} alt={labels.previewAlt} fill sizes="(min-width: 768px) 36rem, 100vw" className="object-cover" unoptimized />
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
