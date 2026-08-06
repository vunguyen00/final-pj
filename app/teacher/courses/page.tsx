"use client";

import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type Dispatch, type FormEvent, type SetStateAction } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isLikelyImageSearchUrl, normalizeCourseThumbnailUrl } from "@/lib/course-thumbnail";
import { readJsonResponse } from "@/lib/http-response";
import {
  COURSE_CATEGORIES,
  getCourseCategoryLabel,
  getCourseInfoLabels,
  getCourseLevelLabel,
  getCourseManagementLabels,
  getLanguageNativeLabel,
  type CourseInfoLabels,
} from "@/lib/language-display";

type CourseStatus = "ACTIVE" | "LOCKED" | "PENDING_APPROVAL" | "PENDING_DELETE" | "REJECTED";

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
  deleteRequestedFromStatus: CourseStatus | null;
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

type LearningLanguage = {
  id: string;
  name: string;
  code: string;
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
  languageId: "",
};

const levelOptions = [
  { value: "Beginner", label: "Mới bắt đầu" },
  { value: "Elementary", label: "Sơ cấp" },
  { value: "Intermediate", label: "Trung cấp" },
  { value: "Upper Intermediate", label: "Trung cấp cao" },
  { value: "Advanced", label: "Nâng cao" },
];

function getLevelLabel(level?: string | null, language?: string | null) {
  return level ? getCourseLevelLabel(level, language) : "Chưa chọn";
}

function getStatusUi(status: CourseStatus) {
  if (status === "ACTIVE") return { label: "Hoạt động", className: "bg-green-100 text-green-700" };
  if (status === "LOCKED") return { label: "Đã khóa", className: "bg-red-100 text-red-700" };
  if (status === "PENDING_APPROVAL") return { label: "Chờ duyệt", className: "bg-amber-100 text-amber-700" };
  if (status === "PENDING_DELETE") return { label: "Chờ duyệt xóa", className: "bg-orange-100 text-orange-700" };
  return { label: "Bị từ chối", className: "bg-rose-100 text-rose-700" };
}

function useTeacherCoursesPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [languages, setLanguages] = useState<LearningLanguage[]>([]);
  const [teacherLanguage, setTeacherLanguage] = useState<LearningLanguage | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [message, setMessage] = useState("");
  const [courseSearch, setCourseSearch] = useState("");
  const [formData, setFormData] = useState(defaultForm);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [thumbnailUploadError, setThumbnailUploadError] = useState("");
  const [thumbnailPreviewError, setThumbnailPreviewError] = useState("");

  const fetchCourses = useCallback(async () => {
    try {
      const res = await fetch("/api/teacher/courses");
      if (res.ok) {
        const data = await res.json();
        setCourses(data.courses || []);
        setLanguages(data.languages || []);
        setTeacherLanguage(data.teacherLanguage || null);
      }
    } catch (error) {
      console.error("Error fetching courses:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const checkAuthAndFetchCourses = useCallback(async () => {
    try {
      const coursesPromise = fetchCourses();
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
      await coursesPromise;
    } catch (error) {
      console.error("Auth check failed:", error);
      router.push("/auth/login");
    }
  }, [fetchCourses, router]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void checkAuthAndFetchCourses();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [checkAuthAndFetchCourses]);

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
      const data = await readJsonResponse(res).catch(() => ({}));

      if (!res.ok || !data?.url) {
        setThumbnailUploadError(data?.error || formLabels.uploadError);
        return;
      }

      setFormData((current) => ({ ...current, thumbnail: data.url }));
      setThumbnailPreviewError("");
    } catch (error) {
      console.error("Error uploading thumbnail:", error);
      setThumbnailUploadError(formLabels.uploadError);
    } finally {
      setUploadingThumbnail(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedThumbnail = normalizeCourseThumbnailUrl(formData.thumbnail);
    try {
      const url = editingCourse ? `/api/teacher/courses/${editingCourse.id}` : "/api/teacher/courses";
      const method = editingCourse ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          languageId: user?.role === "ADMIN" ? formData.languageId : undefined,
          thumbnail: normalizedThumbnail,
        }),
      });
      const data = await readJsonResponse(res).catch(() => ({}));

      if (!res.ok) {
        setMessage(data?.error || formLabels.saveError);
        return;
      }

      setShowModal(false);
      setEditingCourse(null);
      resetForm();

      if (data?.requiresApproval) {
        setMessage(formLabels.createdPending);
      } else if (data?.autoApproved) {
        setMessage(formLabels.autoApproved);
      } else {
        setMessage(editingCourse ? formLabels.saved : formLabels.created);
      }

      await fetchCourses();
    } catch (error) {
      console.error("Error saving course:", error);
      setMessage(formLabels.saveError);
    }
  };

  const handleEdit = (course: Course) => {
    setEditingCourse(course);
    setThumbnailUploadError("");
    setThumbnailPreviewError("");
    setFormData({
      name: course.name,
      description: course.description,
      price: course.price.toString(),
      category: course.category || "",
      level: course.level || "Beginner",
      duration: course.duration || "",
      thumbnail: course.thumbnail || "",
      status: course.status,
      languageId: course.language?.id || "",
    });
    setShowModal(true);
  };

  const handleDelete = async (courseId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa khóa học này?")) return;
    try {
      const res = await fetch(`/api/teacher/courses/${courseId}`, { method: "DELETE" });
      const data = await readJsonResponse(res).catch(() => ({}));
      if (res.ok) {
        setMessage(
          data?.requiresApproval
            ? "Yêu cầu xóa khóa học đã được gửi tới admin duyệt."
            : data?.archived
              ? "Khóa học đã có người học hoặc giao dịch nên được khóa để bảo toàn lịch sử, không thể xóa vĩnh viễn."
              : "Xóa khóa học thành công.",
        );
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
      const data = await readJsonResponse(res).catch(() => ({}));
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
    setFormData({
      ...defaultForm,
      languageId: user?.role === "TEACHER" ? teacherLanguage?.id || "" : "",
    });
    setThumbnailUploadError("");
    setThumbnailPreviewError("");
  };

  const openCreateModal = () => {
    setEditingCourse(null);
    resetForm();
    setShowModal(true);
  };

  const adminLanguageOptions =
    editingCourse?.language && !languages.some((language) => language.id === editingCourse.language?.id)
      ? [editingCourse.language, ...languages]
      : languages;
  const fixedTeacherLanguage = editingCourse?.language ?? teacherLanguage;
  const formLanguageOptions =
    user?.role === "ADMIN"
      ? adminLanguageOptions
      : fixedTeacherLanguage
        ? [fixedTeacherLanguage]
        : [];
  const selectedFormLanguage =
    formLanguageOptions.find((language) => language.id === formData.languageId) || teacherLanguage;
  const formLanguageKey =
    selectedFormLanguage?.code ||
    selectedFormLanguage?.name ||
    editingCourse?.language?.code ||
    editingCourse?.language?.name ||
    "vi";
  const formLabels = getCourseInfoLabels(formLanguageKey);
  const formManagementLabels = getCourseManagementLabels(formLanguageKey);
  const listLabels = getCourseManagementLabels("vi");
  const thumbnailPreviewUrl = normalizeCourseThumbnailUrl(formData.thumbnail);
  const filteredCourses = useMemo(() => {
    const keyword = courseSearch.trim().toLocaleLowerCase();
    if (!keyword) return courses;
    return courses.filter((course) =>
      course.name.toLocaleLowerCase().includes(keyword),
    );
  }, [courseSearch, courses]);

  return {
    user,
    courses,
    loading,
    showModal,
    editingCourse,
    message,
    courseSearch,
    formData,
    uploadingThumbnail,
    thumbnailUploadError,
    thumbnailPreviewError,
    formLanguageOptions,
    formLanguageKey,
    formLabels,
    formManagementLabels,
    listLabels,
    thumbnailPreviewUrl,
    filteredCourses,
    setShowModal,
    setEditingCourse,
    setCourseSearch,
    setFormData,
    setThumbnailUploadError,
    setThumbnailPreviewError,
    handleThumbnailUpload,
    handleSubmit,
    handleEdit,
    handleDelete,
    handleToggleLock,
    openCreateModal,
  };
}

export default function TeacherCoursesPage() {
  const controller = useTeacherCoursesPage();
  const {
    user,
    courses,
    loading,
    showModal,
    editingCourse,
    message,
    courseSearch,
    formData,
    uploadingThumbnail,
    thumbnailUploadError,
    thumbnailPreviewError,
    formLanguageOptions,
    formLanguageKey,
    formLabels,
    formManagementLabels,
    listLabels,
    thumbnailPreviewUrl,
    filteredCourses,
    setShowModal,
    setEditingCourse,
    setCourseSearch,
    setFormData,
    setThumbnailUploadError,
    setThumbnailPreviewError,
    handleThumbnailUpload,
    handleSubmit,
    handleEdit,
    handleDelete,
    handleToggleLock,
    openCreateModal,
  } = controller;

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <>
    <div className="min-h-dvh bg-slate-50 py-8">
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

        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
          <label htmlFor="course-search" className="block text-sm font-semibold text-slate-700">
            Tìm kiếm khóa học
          </label>
          <input
            id="course-search"
            type="search"
            value={courseSearch}
            onChange={(event) => setCourseSearch(event.target.value)}
            placeholder="Nhập tên khóa học..."
            className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {courses.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
            <h3 className="text-lg font-semibold text-slate-900">Chưa có khóa học nào</h3>
            <p className="mt-2 text-slate-600">Hãy tạo khóa học đầu tiên của bạn</p>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
            <h3 className="text-lg font-semibold text-slate-900">Không tìm thấy khóa học</h3>
            <p className="mt-2 text-slate-600">Thử nhập tên khóa học khác.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full min-w-[1180px] divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="w-[300px] px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Khóa học</th>
                  <th className="w-[150px] px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Ngôn ngữ</th>
                  <th className="w-[120px] px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Danh mục</th>
                  <th className="w-[120px] px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Trình độ</th>
                  <th className="w-[100px] px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Giá</th>
                  <th className="w-[80px] px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Học viên</th>
                  <th className="w-[130px] px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Trạng thái</th>
                  <th className="sticky right-0 w-[180px] bg-slate-50 px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500 shadow-[-12px_0_18px_-18px_rgba(15,23,42,0.7)]">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredCourses.map((course) => {
                  const courseLanguageKey = course.language?.code || course.language?.name || "vi";
                  const ui = { ...getStatusUi(course.status), label: listLabels.status[course.status] || getStatusUi(course.status).label };
                  const courseThumbnailUrl = normalizeCourseThumbnailUrl(course.thumbnail);
                  return (
                    <tr key={course.id} className="hover:bg-slate-50">
                      <td className="px-4 py-4">
                        <div className="flex items-center">
                          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                            {courseThumbnailUrl ? (
                              <Image src={courseThumbnailUrl} alt={course.name} fill sizes="48px" className="object-cover" unoptimized />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-slate-400">N/A</div>
                            )}
                          </div>
                          <div className="ml-4 min-w-0">
                            <div className="truncate text-sm font-medium text-slate-900">{course.name}</div>
                            <div className="text-sm text-slate-500">{listLabels.modules(course._count.modules)} - {listLabels.tests(course._count.tests)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <span className="inline-flex rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">{course.language ? getLanguageNativeLabel(courseLanguageKey) : "Chưa gán"}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{getCourseCategoryLabel(course.category, "vi") || "Chưa phân loại"}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <span className="inline-flex rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">{getLevelLabel(course.level, "vi")}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-900">{course.price.toLocaleString("vi-VN")}đ</td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-900">{course._count.enrollments}</td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${ui.className}`}>{ui.label}</span>
                      </td>
                      <td className="sticky right-0 whitespace-nowrap bg-white px-3 py-4 text-right text-sm font-medium shadow-[-12px_0_18px_-18px_rgba(15,23,42,0.7)]">
                        <div className="flex justify-end gap-1">
                          <Link href={`/teacher/courses/${course.id}`} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100" title="Quản lý chi tiết" aria-label="Quản lý chi tiết">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          </Link>
                          <button type="button" onClick={() => handleEdit(course)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100" title="Chỉnh sửa" aria-label="Chỉnh sửa khóa học">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                            </svg>
                          </button>
                          {user?.role === "ADMIN" && (course.status === "ACTIVE" || course.status === "LOCKED") ? (
                            <button
                              type="button"
                              onClick={() => void handleToggleLock(course.id, course.status)}
                              className={`inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-slate-100 ${course.status === "ACTIVE" ? "text-orange-700" : "text-green-700"}`}
                              title={course.status === "ACTIVE" ? "Khóa khóa học" : "Mở khóa khóa học"}
                              aria-label={course.status === "ACTIVE" ? "Khóa khóa học" : "Mở khóa khóa học"}
                            >
                              {course.status === "ACTIVE" ? (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                </svg>
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                                  <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                                </svg>
                              )}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => void handleDelete(course.id)}
                            disabled={course.status === "PENDING_DELETE"}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                            title={course.status === "PENDING_DELETE" ? "Đang chờ admin duyệt xóa" : "Xóa"}
                            aria-label={course.status === "PENDING_DELETE" ? "Đang chờ admin duyệt xóa" : "Xóa khóa học"}
                          >
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

    </div>
    {showModal ? (
      <CourseEditorDialog
        controller={{
          user,
          editingCourse,
          formData,
          uploadingThumbnail,
          thumbnailUploadError,
          thumbnailPreviewError,
          formLanguageOptions,
          formLanguageKey,
          formLabels,
          formManagementLabels,
          thumbnailPreviewUrl,
          setShowModal,
          setEditingCourse,
          setFormData,
          setThumbnailUploadError,
          setThumbnailPreviewError,
          handleThumbnailUpload,
          handleSubmit,
        }}
      />
    ) : null}
    </>
  );
}

type CourseEditorController = {
  user: User | null;
  editingCourse: Course | null;
  formData: typeof defaultForm;
  uploadingThumbnail: boolean;
  thumbnailUploadError: string;
  thumbnailPreviewError: string;
  formLanguageOptions: LearningLanguage[];
  formLanguageKey: string;
  formLabels: CourseInfoLabels;
  formManagementLabels: { status: Record<string, string> };
  thumbnailPreviewUrl: string;
  setShowModal: Dispatch<SetStateAction<boolean>>;
  setEditingCourse: Dispatch<SetStateAction<Course | null>>;
  setFormData: Dispatch<SetStateAction<typeof defaultForm>>;
  setThumbnailUploadError: Dispatch<SetStateAction<string>>;
  setThumbnailPreviewError: Dispatch<SetStateAction<string>>;
  handleThumbnailUpload: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleSubmit: (event: FormEvent) => Promise<void>;
};

function CourseEditorDialog({ controller }: { controller: CourseEditorController }) {
  const {
    user,
    editingCourse,
    formData,
    uploadingThumbnail,
    thumbnailUploadError,
    thumbnailPreviewError,
    formLanguageOptions,
    formLanguageKey,
    formLabels,
    formManagementLabels,
    thumbnailPreviewUrl,
    setShowModal,
    setEditingCourse,
    setFormData,
    setThumbnailUploadError,
    setThumbnailPreviewError,
    handleThumbnailUpload,
    handleSubmit,
  } = controller;

  return (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:items-center">
          <div className="w-full max-w-lg max-h-[calc(100vh-2rem)] overflow-y-auto rounded-xl bg-white p-6">
            <h2 className="text-xl font-bold text-slate-900">{editingCourse ? formLabels.heading : formLabels.createHeading}</h2>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label htmlFor="course-name" className="block text-sm font-medium text-slate-900">{formLabels.name} *</label>
                <input id="course-name" type="text" required value={formData.name} onChange={(event) => setFormData({ ...formData, name: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label htmlFor="course-description" className="block text-sm font-medium text-slate-900">{formLabels.courseDescription} *</label>
                <textarea id="course-description" required rows={3} value={formData.description} onChange={(event) => setFormData({ ...formData, description: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              {user?.role === "ADMIN" ? (
                <div>
                  <label htmlFor="course-language" className="block text-sm font-medium text-slate-900">{formLabels.language}</label>
                  <select
                    id="course-language"
                    value={formData.languageId}
                    onChange={(event) => setFormData({ ...formData, languageId: event.target.value, category: "" })}
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">{formLabels.languagePlaceholder}</option>
                    {formLanguageOptions.map((language) => (
                      <option key={language.id} value={language.id}>
                        {getLanguageNativeLabel(language.code || language.name)}
                      </option>
                    ))}
                  </select>
                </div>
              ) : formLanguageOptions.length > 0 ? (
                <div>
                  <label htmlFor="course-language" className="block text-sm font-medium text-slate-900">
                    {formLabels.language}
                  </label>
                  <input
                    id="course-language"
                    readOnly
                    value={getLanguageNativeLabel(
                      formLanguageOptions[0].code || formLanguageOptions[0].name,
                    )}
                    className="mt-1 block w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700"
                  />
                  <p className="mt-1.5 text-xs text-slate-500">
                    {formLabels.languageLockedHint}
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">
                  {formLabels.noApprovedLanguage}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="course-price" className="block text-sm font-medium text-slate-900">{formLabels.price} *</label>
                  <input id="course-price" type="number" required value={formData.price} onChange={(event) => setFormData({ ...formData, price: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label htmlFor="course-category" className="block text-sm font-medium text-slate-900">{formLabels.category}</label>
                  <select id="course-category" value={formData.category} onChange={(event) => setFormData({ ...formData, category: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                    <option value="">{formLabels.categoryPlaceholder}</option>
                    {COURSE_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {getCourseCategoryLabel(category, formLanguageKey)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="course-level" className="block text-sm font-medium text-slate-900">{formLabels.level}</label>
                  <select id="course-level" value={formData.level} onChange={(event) => setFormData({ ...formData, level: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                    {levelOptions.map((level) => (
                      <option key={level.value} value={level.value}>{getCourseLevelLabel(level.value, formLanguageKey)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="course-duration" className="block text-sm font-medium text-slate-900">{formLabels.duration}</label>
                  <input id="course-duration" type="text" placeholder={formLabels.durationPlaceholder} value={formData.duration} onChange={(event) => setFormData({ ...formData, duration: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {user?.role === "ADMIN" ? (
                  <div>
                    <label htmlFor="course-status" className="block text-sm font-medium text-slate-900">{formLabels.status}</label>
                    <select id="course-status" value={formData.status} onChange={(event) => setFormData({ ...formData, status: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                      <option value="ACTIVE">{formManagementLabels.status.ACTIVE}</option>
                      <option value="LOCKED">{formManagementLabels.status.LOCKED}</option>
                    </select>
                  </div>
                ) : (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                    {formLabels.approvalNotice}
                  </div>
                )}
              </div>
              <div>
                <label htmlFor="course-thumbnail" className="block text-sm font-medium text-slate-900">{formLabels.thumbnail}</label>
                <input
                  id="course-thumbnail"
                  type="text"
                  value={formData.thumbnail}
                  onChange={(event) => {
                    setFormData({ ...formData, thumbnail: event.target.value });
                    setThumbnailUploadError("");
                    setThumbnailPreviewError("");
                  }}
                  onBlur={() => {
                    const normalized = normalizeCourseThumbnailUrl(formData.thumbnail);
                    if (normalized && normalized !== formData.thumbnail.trim()) {
                      setFormData((current) => ({ ...current, thumbnail: normalized }));
                    }
                  }}
                  placeholder={formLabels.thumbnailPlaceholder}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                {isLikelyImageSearchUrl(formData.thumbnail) && normalizeCourseThumbnailUrl(formData.thumbnail) === formData.thumbnail.trim() ? (
                  <p className="mt-2 text-xs text-amber-700">
                    {formLabels.directImageWarning}
                  </p>
                ) : null}
                <div className="mt-2 flex items-center gap-3">
                  <label className={`inline-flex cursor-pointer items-center rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 ${uploadingThumbnail ? "pointer-events-none opacity-60" : ""}`}>
                    {uploadingThumbnail ? formLabels.uploadingImage : formLabels.uploadImage}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      disabled={uploadingThumbnail}
                      onChange={handleThumbnailUpload}
                      className="hidden"
                    />
                  </label>
                  <span className="text-xs text-slate-500">{formLabels.imageHint}</span>
                </div>
                {thumbnailUploadError ? <p className="mt-2 text-xs text-red-600">{thumbnailUploadError}</p> : null}
                {thumbnailPreviewError ? <p className="mt-2 text-xs text-red-600">{thumbnailPreviewError}</p> : null}
                {thumbnailPreviewUrl ? (
                  <div className="relative mt-3 h-32 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                    <Image
                      src={thumbnailPreviewUrl}
                      alt={formLabels.previewAlt}
                      fill
                      sizes="(min-width: 768px) 32rem, 100vw"
                      className="object-cover"
                      unoptimized
                      onLoad={() => setThumbnailPreviewError("")}
                      onError={() => setThumbnailPreviewError(formLabels.invalidImageError)}
                    />
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
                  {formLabels.cancel}
                </button>
                <button
                  type="submit"
                  disabled={
                    uploadingThumbnail ||
                    (user?.role === "TEACHER" && formLanguageOptions.length === 0)
                  }
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {uploadingThumbnail ? formLabels.uploadingImage : editingCourse ? formLabels.save : formLabels.create}
                </button>
              </div>
            </form>
          </div>
        </div>
  );
}
