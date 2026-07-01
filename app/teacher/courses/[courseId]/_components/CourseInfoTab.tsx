"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import type { Course } from "../types";

type CourseInfoTabProps = {
  course: Course;
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
};

const levelOptions = [
  { value: "Beginner", label: "Mới bắt đầu" },
  { value: "Elementary", label: "Sơ cấp" },
  { value: "Intermediate", label: "Trung cấp" },
  { value: "Upper Intermediate", label: "Trung cấp cao" },
  { value: "Advanced", label: "Nâng cao" },
];

export function CourseInfoTab({ course, onUpdated }: CourseInfoTabProps) {
  const [form, setForm] = useState<CourseInfoForm>({
    name: course.name,
    description: course.description,
    price: String(course.price),
    category: course.category || "",
    level: course.level || "Beginner",
    duration: course.duration || "",
    thumbnail: course.thumbnail || "",
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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
          thumbnail: form.thumbnail.trim(),
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
        <h2 className="text-xl font-bold text-slate-950">Chỉnh sửa thông tin khóa học</h2>
        <p className="mt-1 text-sm text-slate-500">
          Cập nhật nội dung giới thiệu, học phí, danh mục và ảnh đại diện của khóa học.
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
          Tên khóa học
          <input
            required
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            className={inputClass}
          />
        </label>

        <label className="block text-sm font-semibold text-slate-700">
          Mô tả khóa học
          <textarea
            required
            rows={5}
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            className={inputClass}
          />
        </label>

        <div className="grid gap-5 md:grid-cols-4">
          <label className="block text-sm font-semibold text-slate-700">
            Học phí (VNĐ)
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
            Danh mục
            <select
              value={form.category}
              onChange={(event) => setForm({ ...form, category: event.target.value })}
              className={inputClass}
            >
              <option value="">Chọn danh mục</option>
              <option value="Speaking">Nói</option>
              <option value="Writing">Viết</option>
              <option value="Reading">Đọc</option>
              <option value="Listening">Nghe</option>
              <option value="Grammar">Ngữ pháp</option>
              <option value="Vocabulary">Từ vựng</option>
            </select>
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            Trình độ
            <select
              value={form.level}
              onChange={(event) => setForm({ ...form, level: event.target.value })}
              className={inputClass}
            >
              {levelOptions.map((level) => (
                <option key={level.value} value={level.value}>{level.label}</option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            Thời lượng
            <input
              value={form.duration}
              onChange={(event) => setForm({ ...form, duration: event.target.value })}
              placeholder="Ví dụ: 8 tuần"
              className={inputClass}
            />
          </label>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700">
            Ảnh đại diện khóa học
            <input
              value={form.thumbnail}
              onChange={(event) => setForm({ ...form, thumbnail: event.target.value })}
              placeholder="Nhập URL ảnh hoặc tải ảnh lên"
              className={inputClass}
            />
          </label>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label
              className={`inline-flex cursor-pointer items-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 ${
                uploading ? "pointer-events-none opacity-60" : ""
              }`}
            >
              {uploading ? "Đang tải ảnh..." : "Chọn ảnh từ máy"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                disabled={uploading}
                onChange={handleThumbnailUpload}
                className="hidden"
              />
            </label>
            <span className="text-xs text-slate-500">JPEG, PNG, WebP hoặc GIF, tối đa 5 MB</span>
          </div>

          {form.thumbnail ? (
            <div
              role="img"
              aria-label="Xem trước ảnh khóa học"
              className="mt-4 h-48 max-w-xl rounded-xl border border-slate-200 bg-slate-100 bg-cover bg-center"
              style={{ backgroundImage: `url(${JSON.stringify(form.thumbnail)})` }}
            />
          ) : null}
        </div>

        <div className="flex justify-end border-t border-slate-100 pt-5">
          <button
            type="submit"
            disabled={saving || uploading}
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </div>
      </form>
    </section>
  );
}
