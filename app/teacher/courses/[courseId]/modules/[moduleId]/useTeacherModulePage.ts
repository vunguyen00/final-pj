import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { getCourseManagementLabels } from "@/lib/language-display";
import { readJsonResponse } from "@/lib/http-response";

type Lesson = {
  id: string;
  title: string;
  content: string;
  videoUrl: string | null;
};

type Module = {
  id: string;
  name: string;
  order: number;
  lessons: Lesson[];
};

type Course = {
  id: string;
  name: string;
  language?: { name: string; code: string } | null;
};

const EMPTY_LESSON_FORM = { title: "", content: "", videoUrl: "" };

export function useTeacherModulePage() {
  const params = useParams();
  const courseId = params.courseId as string;
  const moduleId = params.moduleId as string;

  const [module, setModule] = useState<Module | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [lessonForm, setLessonForm] = useState(EMPTY_LESSON_FORM);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [isSavingLesson, setIsSavingLesson] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Lesson | null>(null);
  const [isDeletingLesson, setIsDeletingLesson] = useState(false);
  const savingLessonRef = useRef(false);

  const fetchModule = useCallback(async () => {
    try {
      const response = await fetch(`/api/teacher/courses/${courseId}/modules/${moduleId}`);
      if (!response.ok) {
        const data = await readJsonResponse<{ error?: string }>(response).catch(
          (): { error?: string } => ({}),
        );
        setModule(null);
        setNotice({
          tone: "error",
          message: data.error || "Không thể tải chương. Vui lòng quay lại khóa học và thử lại.",
        });
        return;
      }

      const data = await response.json();
      setModule(data.module);
      const courseResponse = await fetch(`/api/teacher/courses/${courseId}`);
      if (courseResponse.ok) {
        const courseData = await courseResponse.json();
        setCourse(courseData.course);
      }
    } catch (error) {
      console.error("Error fetching module:", error);
    } finally {
      setLoading(false);
    }
  }, [courseId, moduleId]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void fetchModule(), 0);
    return () => window.clearTimeout(timeout);
  }, [fetchModule]);

  async function handleCreateLesson(event: React.FormEvent) {
    event.preventDefault();
    if (savingLessonRef.current || uploadingVideo) return;

    savingLessonRef.current = true;
    setIsSavingLesson(true);
    try {
      const response = await fetch(`/api/teacher/courses/${courseId}/modules/${moduleId}/lessons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lessonForm),
      });
      if (response.ok) {
        setShowModal(false);
        setLessonForm(EMPTY_LESSON_FORM);
        await fetchModule();
        setNotice({ tone: "success", message: "Đã thêm bài học." });
      } else {
        const data = await response.json().catch(() => ({}));
        setNotice({ tone: "error", message: data?.error || "Không thể thêm bài học." });
      }
    } catch (error) {
      console.error("Error creating lesson:", error);
      setNotice({ tone: "error", message: "Có lỗi khi thêm bài học. Vui lòng thử lại." });
    } finally {
      savingLessonRef.current = false;
      setIsSavingLesson(false);
    }
  }

  async function handleUpdateLesson(event: React.FormEvent) {
    event.preventDefault();
    if (!editingLesson || savingLessonRef.current || uploadingVideo) return;

    savingLessonRef.current = true;
    setIsSavingLesson(true);
    try {
      const response = await fetch(`/api/teacher/courses/${courseId}/modules/${moduleId}/lessons/${editingLesson.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lessonForm),
      });
      if (response.ok) {
        const data = await readJsonResponse<{ lesson: Lesson }>(response);
        setModule((current) => current
          ? {
              ...current,
              lessons: current.lessons.map((lesson) =>
                lesson.id === data.lesson.id ? data.lesson : lesson,
              ),
            }
          : current,
        );
        setShowModal(false);
        setEditingLesson(null);
        setLessonForm(EMPTY_LESSON_FORM);
        setNotice({ tone: "success", message: "Đã cập nhật bài học." });
      } else {
        const data = await response.json().catch(() => ({}));
        setNotice({ tone: "error", message: data?.error || "Không thể cập nhật bài học." });
      }
    } catch (error) {
      console.error("Error updating lesson:", error);
      setNotice({ tone: "error", message: "Có lỗi khi cập nhật bài học. Vui lòng thử lại." });
    } finally {
      savingLessonRef.current = false;
      setIsSavingLesson(false);
    }
  }

  async function handleDeleteLesson(lessonId: string) {
    setIsDeletingLesson(true);
    try {
      const response = await fetch(`/api/teacher/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}`, { method: "DELETE" });
      if (response.ok) {
        setModule((current) => current
          ? { ...current, lessons: current.lessons.filter((lesson) => lesson.id !== lessonId) }
          : current,
        );
        setDeleteTarget(null);
        setNotice({ tone: "success", message: "Đã xóa bài học." });
      } else {
        const data = await response.json().catch(() => ({}));
        setNotice({ tone: "error", message: data?.error || "Không thể xóa bài học." });
      }
    } catch (error) {
      console.error("Error deleting lesson:", error);
      setNotice({ tone: "error", message: "Có lỗi khi xóa bài học. Vui lòng thử lại." });
    } finally {
      setIsDeletingLesson(false);
    }
  }

  async function handleVideoUpload(file: File) {
    setUploadingVideo(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/teacher/upload", { method: "POST", body: formData });
      const data = await readJsonResponse(response);
      if (response.ok && data.url) {
        setLessonForm((current) => ({ ...current, videoUrl: data.url }));
      } else {
        setNotice({ tone: "error", message: data.error || "Không thể tải video." });
      }
    } catch (error) {
      console.error("Error uploading video:", error);
      setNotice({ tone: "error", message: "Có lỗi khi tải video. Vui lòng thử lại." });
    } finally {
      setUploadingVideo(false);
    }
  }

  function openCreateModal() {
    setNotice(null);
    if (!module) {
      setNotice({
        tone: "error",
        message: "Chương này không còn tồn tại. Vui lòng quay lại khóa học và tải lại trang.",
      });
      return;
    }
    setEditingLesson(null);
    setLessonForm(EMPTY_LESSON_FORM);
    setIsSavingLesson(false);
    savingLessonRef.current = false;
    setShowModal(true);
  }

  function openEditModal(lesson: Lesson) {
    setNotice(null);
    setEditingLesson(lesson);
    setLessonForm({ title: lesson.title, content: lesson.content, videoUrl: lesson.videoUrl || "" });
    setIsSavingLesson(false);
    savingLessonRef.current = false;
    setShowModal(true);
  }

  function openDeleteDialog(lesson: Lesson) {
    setNotice(null);
    setDeleteTarget(lesson);
  }

  function closeLessonModal() {
    if (!savingLessonRef.current) setShowModal(false);
  }

  function cancelLessonModal() {
    if (savingLessonRef.current) return;
    setShowModal(false);
    setEditingLesson(null);
  }

  function closeDeleteDialog() {
    if (!isDeletingLesson) setDeleteTarget(null);
  }

  const courseLanguageKey = course?.language?.code || course?.language?.name || "vi";
  const labels = getCourseManagementLabels(courseLanguageKey).lessonsPage;

  return {
    courseId,
    course,
    module,
    loading,
    showModal,
    editingLesson,
    lessonForm,
    uploadingVideo,
    isSavingLesson,
    notice,
    deleteTarget,
    isDeletingLesson,
    labels,
    setLessonForm,
    handleCreateLesson,
    handleUpdateLesson,
    handleDeleteLesson,
    handleVideoUpload,
    openCreateModal,
    openEditModal,
    openDeleteDialog,
    closeLessonModal,
    cancelLessonModal,
    closeDeleteDialog,
  };
}
