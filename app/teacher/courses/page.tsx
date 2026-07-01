"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type CourseStatus = "ACTIVE" | "LOCKED" | "PENDING_APPROVAL" | "REJECTED";

type Course = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string | null;
  level: string | null;
  duration: string | null;
  thumbnail: string | null;
  status: CourseStatus;
  createdAt: string;
  instructorId: string | null;
  language: {
    id: string;
    name: string;
    code: string;
  } | null;
  _count: {
    enrollments: number;
    tests: number;
    modules: number;
  };
};

type User = {
  id: string;
  username: string;
  email: string;
  role: string;
};

const defaultForm = {
  name: "",
  description: "",
  price: "",
  category: "",
  level: "Beginner",
  duration: "",
  thumbnail: "",
  status: "ACTIVE",
};

const levelOptions = [
  { value: "Beginner", label: "Mới bắt đầu" },
  { value: "Elementary", label: "Sơ cấp" },
  { value: "Intermediate", label: "Trung cấp" },
  { value: "Upper Intermediate", label: "Trung cấp cao" },
  { value: "Advanced", label: "Nâng cao" },
];

function getLevelLabel(level?: string | null) {
  return levelOptions.find((item) => item.value === level)?.label || "Chưa chọn";
}

function getStatusUi(status: CourseStatus) {
  if (status === "ACTIVE") return { label: "Hoạt động", className: "bg-green-100 text-green-700" };
  if (status === "LOCKED") return { label: "Đã khóa", className: "bg-red-100 text-red-700" };
  if (status === "PENDING_APPROVAL") return { label: "Chờ duyệt", className: "bg-amber-100 text-amber-700" };
  return { label: "Bị từ chối", className: "bg-rose-100 text-rose-700" };
}

export default function TeacherCoursesPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [message, setMessage] = useState("");
  const [formData, setFormData] = useState(defaultForm);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [thumbnailUploadError, setThumbnailUploadError] = useState("");

  useEffect(() => {
    void checkAuthAndFetchCourses();
  }, []);

  async function checkAuthAndFetchCourses() {
    try {
      const res = await fetch("/api/auth/me");
      if (!res.ok) {
        router.push("/auth/login");
        return;
      }
      const data = await res.json();
      setUser(data.user);
      if (data.user.role !== "TEACHER" && data.user.role !== "ADMIN") {
        router.push("/");
        return;
      }
      await fetchCourses();
    } catch (error) {
      console.error("Auth check failed:", error);
      router.push("/auth/login");
    }
  }

  async function fetchCourses() {
    try {
      const res = await fetch("/api/teacher/courses");
      if (res.ok) {
        const data = await res.json();
        setCourses(data.courses || []);
      }
    } catch (error) {
      console.error("Error fetching courses:", error);
    } finally {
      setLoading(false);
    }
  }

  const handleThumbnailUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploadingThumbnail(true);
    setThumbnailUploadError("");

    try {
      const uploadData = new FormData();
      uploadData.append("file", file);

      const res = await fetch("/api/teacher/upload-thumbnail", {
        method: "POST",
        body: uploadData,
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.url) {
        setThumbnailUploadError(data?.error || "Không thể tải ảnh lên.");
        return;
      }

      setFormData((current) => ({ ...current, thumbnail: data.url }));
    } catch (error) {
      console.error("Error uploading thumbnail:", error);
      setThumbnailUploadError("Lỗi khi tải ảnh lên.");
    } finally {
      setUploadingThumbnail(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const url = editingCourse ? `/api/teacher/courses/${editingCourse.id}` : "/api/teacher/courses";
      const method = editingCourse ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMessage(data?.error || "Không thể lưu khóa học.");
        return;
      }

      setShowModal(false);
      setEditingCourse(null);
      resetForm();

      if (data?.requiresApproval) {
        setMessage("Khóa học đã được gửi chờ admin duyệt.");
      } else if (data?.autoApproved) {
        setMessage("Khóa học đã được tự động duyệt.");
      } else {
        setMessage("Đã lưu khóa học.");
      }

      await fetchCourses();
    } catch (error) {
      console.error("Error saving course:", error);
      setMessage("Lỗi khi lưu khóa học.");
    }
  };

  const handleEdit = (course: Course) => {
    setEditingCourse(course);
    setThumbnailUploadError("");
    setFormData({
      name: course.name,
      description: course.description,
      price: course.price.toString(),
      category: course.category || "",
      level: course.level || "Beginner",
      duration: course.duration || "",
      thumbnail: course.thumbnail || "",
      status: course.status,
    });
    setShowModal(true);
  };

  const handleDelete = async (courseId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa khóa học này?")) return;
    try {
      const res = await fetch(`/api/teacher/courses/${courseId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMessage("Xóa khóa học thành công.");
        await fetchCourses();
      } else {
        setMessage(data?.error || "Không thể xóa khóa học.");
      }
    } catch (error) {
      console.error("Error deleting course:", error);
      setMessage("Lỗi khi xóa khóa học.");
    }
  };

  const handleToggleLock = async (courseId: string, currentStatus: CourseStatus) => {
    const action = currentStatus === "ACTIVE" ? "khóa" : "mở khóa";
    if (!confirm(`Bạn có chắc chắn muốn ${action} khóa học này?`)) return;
    try {
      const res = await fetch(`/api/teacher/courses/${courseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggleLock" }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMessage("Đã cập nhật trạng thái khóa học.");
        await fetchCourses();
      } else {
        setMessage(data?.error || "Không thể cập nhật trạng thái khóa học.");
      }
    } catch (error) {
      console.error("Error toggling course status:", error);
      setMessage("Lỗi khi cập nhật trạng thái.");
    }
  };

  const resetForm = () => {
    setFormData(defaultForm);
    setThumbnailUploadError("");
  };

  const openCreateModal = () => {
    setEditingCourse(null);
    resetForm();
    setShowModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-7xl px-4">
        {message ? <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">{message}</div> : null}

        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Quản lý khóa học</h1>
            <p className="mt-2 text-slate-600">Tạo và quản lý các khóa học của bạn</p>
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <line x1="12" x2="12" y1="5" y2="19" />
              <line x1="5" x2="19" y1="12" y2="12" />
            </svg>
            Tạo khóa học mới
          </button>
        </div>

        {courses.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
            <h3 className="text-lg font-semibold text-slate-900">Chưa có khóa học nào</h3>
            <p className="mt-2 text-slate-600">Hãy tạo khóa học đầu tiên của bạn</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Khóa học</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Ngôn ngữ</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Danh mục</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Trình độ</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Giá</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Học viên</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Trạng thái</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {courses.map((course) => {
                  const ui = getStatusUi(course.status);
                  return (
                    <tr key={course.id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center">
                          <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-slate-100">
                            {course.thumbnail ? (
                              <img src={course.thumbnail} alt={course.name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-slate-400">N/A</div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-slate-900">{course.name}</div>
                            <div className="text-sm text-slate-500">{course._count.modules} modules - {course._count.tests} tests</div>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className="inline-flex rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">{course.language?.name || "Chưa gán"}</span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{course.category || "Chưa phân loại"}</span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className="inline-flex rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">{getLevelLabel(course.level)}</span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-900">{course.price.toLocaleString("vi-VN")}đ</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-900">{course._count.enrollments}</td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${ui.className}`}>{ui.label}</span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <Link href={`/teacher/courses/${course.id}`} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100" title="Quản lý chi tiết">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          </Link>
                          <button type="button" onClick={() => handleEdit(course)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100" title="Chỉnh sửa" aria-label="Chỉnh sửa khóa học">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                            </svg>
                          </button>
                          {user?.role === "ADMIN" && (course.status === "ACTIVE" || course.status === "LOCKED") ? (
                            <button
                              type="button"
                              onClick={() => void handleToggleLock(course.id, course.status)}
                              className={`rounded-lg p-2 hover:bg-slate-100 ${course.status === "ACTIVE" ? "text-orange-600" : "text-green-600"}`}
                              title={course.status === "ACTIVE" ? "Khóa khóa học" : "Mở khóa khóa học"}
                              aria-label={course.status === "ACTIVE" ? "Khóa khóa học" : "Mở khóa khóa học"}
                            >
                              {course.status === "ACTIVE" ? "Khóa" : "Mở"}
                            </button>
                          ) : null}
                          <button type="button" onClick={() => void handleDelete(course.id)} className="rounded-lg p-2 text-red-600 hover:bg-red-50" title="Xóa" aria-label="Xóa khóa học">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:items-center">
          <div className="w-full max-w-lg max-h-[calc(100vh-2rem)] overflow-y-auto rounded-xl bg-white p-6">
            <h2 className="text-xl font-bold text-slate-900">{editingCourse ? "Chỉnh sửa khóa học" : "Tạo khóa học mới"}</h2>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-900">Tên khóa học *</label>
                <input type="text" required value={formData.name} onChange={(event) => setFormData({ ...formData, name: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-900">Mô tả *</label>
                <textarea required rows={3} value={formData.description} onChange={(event) => setFormData({ ...formData, description: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-900">Giá (VNĐ) *</label>
                  <input type="number" required value={formData.price} onChange={(event) => setFormData({ ...formData, price: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-900">Danh mục</label>
                  <select value={formData.category} onChange={(event) => setFormData({ ...formData, category: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                    <option value="">Chọn danh mục</option>
                    <option value="Speaking">Speaking</option>
                    <option value="Writing">Writing</option>
                    <option value="Reading">Reading</option>
                    <option value="Listening">Listening</option>
                    <option value="Grammar">Grammar</option>
                    <option value="Vocabulary">Vocabulary</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-900">Trình độ</label>
                  <select value={formData.level} onChange={(event) => setFormData({ ...formData, level: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                    {levelOptions.map((level) => (
                      <option key={level.value} value={level.value}>{level.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-900">Thời lượng</label>
                  <input type="text" placeholder="Ví dụ: 8 tuần" value={formData.duration} onChange={(event) => setFormData({ ...formData, duration: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {user?.role === "ADMIN" ? (
                  <div>
                    <label className="block text-sm font-medium text-slate-900">Trạng thái</label>
                    <select value={formData.status} onChange={(event) => setFormData({ ...formData, status: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                      <option value="ACTIVE">Hoạt động</option>
                      <option value="LOCKED">Khóa</option>
                    </select>
                  </div>
                ) : (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                    Khóa học sẽ cần admin duyệt trước khi hiển thị công khai nếu đang tắt tự động duyệt.
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-900">Ảnh thumbnail</label>
                <input
                  type="text"
                  value={formData.thumbnail}
                  onChange={(event) => {
                    setFormData({ ...formData, thumbnail: event.target.value });
                    setThumbnailUploadError("");
                  }}
                  placeholder="Nhập URL ảnh hoặc tải ảnh lên bên dưới"
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <div className="mt-2 flex items-center gap-3">
                  <label className={`inline-flex cursor-pointer items-center rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 ${uploadingThumbnail ? "pointer-events-none opacity-60" : ""}`}>
                    {uploadingThumbnail ? "Đang tải ảnh..." : "Chọn ảnh từ máy"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      disabled={uploadingThumbnail}
                      onChange={handleThumbnailUpload}
                      className="hidden"
                    />
                  </label>
                  <span className="text-xs text-slate-500">JPEG, PNG, WebP hoặc GIF, tối đa 5 MB</span>
                </div>
                {thumbnailUploadError ? <p className="mt-2 text-xs text-red-600">{thumbnailUploadError}</p> : null}
                {formData.thumbnail ? (
                  <div className="mt-3 h-32 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                    <img src={formData.thumbnail} alt="Xem trước thumbnail" className="h-full w-full object-cover" />
                  </div>
                ) : null}
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingCourse(null);
                  }}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={uploadingThumbnail}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {uploadingThumbnail ? "Đang tải ảnh..." : editingCourse ? "Lưu thay đổi" : "Tạo khóa học"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
