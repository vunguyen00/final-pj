"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getCourseManagementLabels } from "@/lib/language-display";
import { ModalDialog } from "@/app/components/ModalDialog";

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
  language?: {
    name: string;
    code: string;
  } | null;
};

function useTeacherModulePage() {
  const params = useParams();
  const courseId = params.courseId as string;
  const moduleId = params.moduleId as string;
  
  const [module, setModule] = useState<Module | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [lessonForm, setLessonForm] = useState({
    title: "",
    content: "",
    videoUrl: "",
  });
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [isSavingLesson, setIsSavingLesson] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Lesson | null>(null);
  const [isDeletingLesson, setIsDeletingLesson] = useState(false);
  const savingLessonRef = useRef(false);

  const fetchModule = useCallback(async () => {
    try {
      const res = await fetch(`/api/teacher/courses/${courseId}/modules/${moduleId}`);
      if (res.ok) {
        const data = await res.json();
        setModule(data.module);
        // Fetch course info
        const courseRes = await fetch(`/api/teacher/courses/${courseId}`);
        if (courseRes.ok) {
          const courseData = await courseRes.json();
          setCourse(courseData.course);
        }
      }
    } catch (error) {
      console.error("Error fetching module:", error);
    } finally {
      setLoading(false);
    }
  }, [courseId, moduleId]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void fetchModule();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [fetchModule]);

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingLessonRef.current || uploadingVideo) return;

    savingLessonRef.current = true;
    setIsSavingLesson(true);

    try {
      const res = await fetch(`/api/teacher/courses/${courseId}/modules/${moduleId}/lessons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lessonForm),
      });
      if (res.ok) {
        setShowModal(false);
        setLessonForm({ title: "", content: "", videoUrl: "" });
        await fetchModule();
        setNotice({ tone: "success", message: "Đã thêm bài học." });
      } else {
        const data = await res.json().catch(() => ({}));
        setNotice({ tone: "error", message: data?.error || "Không thể thêm bài học." });
      }
    } catch (error) {
      console.error("Error creating lesson:", error);
      setNotice({ tone: "error", message: "Có lỗi khi thêm bài học. Vui lòng thử lại." });
    } finally {
      savingLessonRef.current = false;
      setIsSavingLesson(false);
    }
  };

  const handleUpdateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLesson) return;
    if (savingLessonRef.current || uploadingVideo) return;

    savingLessonRef.current = true;
    setIsSavingLesson(true);

    try {
      const res = await fetch(`/api/teacher/courses/${courseId}/modules/${moduleId}/lessons/${editingLesson.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lessonForm),
      });
      if (res.ok) {
        setShowModal(false);
        setEditingLesson(null);
        setLessonForm({ title: "", content: "", videoUrl: "" });
        await fetchModule();
        setNotice({ tone: "success", message: "Đã cập nhật bài học." });
      } else {
        const data = await res.json().catch(() => ({}));
        setNotice({ tone: "error", message: data?.error || "Không thể cập nhật bài học." });
      }
    } catch (error) {
      console.error("Error updating lesson:", error);
      setNotice({ tone: "error", message: "Có lỗi khi cập nhật bài học. Vui lòng thử lại." });
    } finally {
      savingLessonRef.current = false;
      setIsSavingLesson(false);
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    setIsDeletingLesson(true);
    try {
      const res = await fetch(`/api/teacher/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setDeleteTarget(null);
        await fetchModule();
        setNotice({ tone: "success", message: "Đã xóa bài học." });
      } else {
        const data = await res.json().catch(() => ({}));
        setNotice({ tone: "error", message: data?.error || "Không thể xóa bài học." });
      }
    } catch (error) {
      console.error("Error deleting lesson:", error);
      setNotice({ tone: "error", message: "Có lỗi khi xóa bài học. Vui lòng thử lại." });
    } finally {
      setIsDeletingLesson(false);
    }
  };

  const openCreateModal = () => {
    setNotice(null);
    setEditingLesson(null);
    setLessonForm({ title: "", content: "", videoUrl: "" });
    setIsSavingLesson(false);
    savingLessonRef.current = false;
    setShowModal(true);
  };

  const openEditModal = (lesson: Lesson) => {
    setNotice(null);
    setEditingLesson(lesson);
    setLessonForm({
      title: lesson.title,
      content: lesson.content,
      videoUrl: lesson.videoUrl || "",
    });
    setIsSavingLesson(false);
    savingLessonRef.current = false;
    setShowModal(true);
  };

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
    setShowModal,
    setEditingLesson,
    setLessonForm,
    setUploadingVideo,
    setNotice,
    setDeleteTarget,
    savingLessonRef,
    handleCreateLesson,
    handleUpdateLesson,
    handleDeleteLesson,
    openCreateModal,
    openEditModal,
  };
}

export default function TeacherModulePage() {
  const {
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
    setShowModal,
    setEditingLesson,
    setLessonForm,
    setUploadingVideo,
    setNotice,
    setDeleteTarget,
    savingLessonRef,
    handleCreateLesson,
    handleUpdateLesson,
    handleDeleteLesson,
    openCreateModal,
    openEditModal,
  } = useTeacherModulePage();

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
        {/* Back button */}
        <div className="mb-4 flex items-center justify-between">
          <Link
            href={`/teacher/courses/${courseId}`}
            className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            {labels.backToCourse}
          </Link>
        </div>

        {/* Module Header */}
        <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{module?.name}</h1>
              <p className="mt-1 text-sm text-slate-600">{labels.course}: {course?.name}</p>
            </div>
            <button
              type="button"
              onClick={openCreateModal}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                <line x1="12" x2="12" y1="5" y2="19" />
                <line x1="5" x2="19" y1="12" y2="12" />
              </svg>
              {labels.addLesson}
            </button>
          </div>
        </div>

        {notice ? (
          <div role="status" className={`fixed right-4 top-4 z-[70] max-w-md rounded-lg border p-3 text-sm shadow-lg ${notice.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
            {notice.message}
          </div>
        ) : null}

        {/* Lessons List */}
        {module?.lessons?.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
            <p className="text-slate-600">{labels.empty}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {module?.lessons?.map((lesson, index) => (
              <div
                key={lesson.id}
                className="rounded-xl border border-slate-200 bg-white p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-sm font-medium text-slate-700">
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{lesson.title}</h3>
                      <p className="mt-2 text-sm text-slate-600 line-clamp-2">{lesson.content}</p>
                      {lesson.videoUrl && (
                        <div className="mt-2 flex items-center gap-2 text-sm text-blue-600">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                            <polygon points="5 3 19 12 5 21 5 3" />
                          </svg>
                          <span>{labels.hasVideo}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(lesson)}
                      className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
                      aria-label={labels.editLesson}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNotice(null);
                        setDeleteTarget(lesson);
                      }}
                      className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                      aria-label={labels.deleteLesson}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lesson Modal */}
      {showModal && (
        <ModalDialog labelledBy="lesson-modal-title" onClose={() => { if (!savingLessonRef.current) setShowModal(false); }}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6">
            <h2 id="lesson-modal-title" className="text-xl font-bold text-slate-900">
              {editingLesson ? labels.editTitle : labels.createTitle}
            </h2>
            {notice?.tone === "error" ? <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{notice.message}</p> : null}
            <form onSubmit={editingLesson ? handleUpdateLesson : handleCreateLesson} className="mt-4 space-y-4">
              <div>
                <label htmlFor="lesson-title" className="block text-sm font-medium text-slate-700">{labels.title}</label>
                <input
                  id="lesson-title"
                  type="text"
                  required
                  value={lessonForm.title}
                  disabled={isSavingLesson}
                  onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-black placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                />
              </div>
              <div>
                <label htmlFor="lesson-content" className="block text-sm font-medium text-slate-700">{labels.content}</label>
                <textarea
                  id="lesson-content"
                  required
                  rows={5}
                  value={lessonForm.content}
                  disabled={isSavingLesson}
                  onChange={(e) => setLessonForm({ ...lessonForm, content: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-black placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                />
              </div>
              <div>
                <label htmlFor="lesson-video" className="block text-sm font-medium text-slate-700">{labels.video}</label>
                <div className="mt-1 space-y-2">
                  {lessonForm.videoUrl ? (
                    <div className="relative rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <video
                        src={lessonForm.videoUrl}
                        controls
                        aria-label={labels.previewVideo}
                        className="h-40 w-full rounded-lg object-contain"
                      />
                      <button
                        type="button"
                        disabled={isSavingLesson}
                        onClick={() => setLessonForm({ ...lessonForm, videoUrl: "" })}
                        className="absolute right-2 top-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                        aria-label={labels.removeVideo}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                          <line x1="18" x2="6" y1="6" y2="18" />
                          <line x1="6" x2="18" y1="6" y2="18" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 p-4 hover:border-slate-400 hover:bg-slate-50">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-8 w-8 text-slate-400">
                        <polygon points="23 7 16 12 23 17 23 7" />
                        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                      </svg>
                      <span className="mt-2 text-sm text-slate-600">{labels.uploadVideo}</span>
                      <span className="text-xs text-slate-400">{labels.videoHint}</span>
                      <input
                        id="lesson-video"
                        type="file"
                        accept="video/mp4,video/webm,video/quicktime"
                        className="hidden"
                        disabled={uploadingVideo || isSavingLesson}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setUploadingVideo(true);
                          try {
                            const formData = new FormData();
                            formData.append("file", file);
                            const res = await fetch("/api/teacher/upload", {
                              method: "POST",
                              body: formData,
                            });
                            const data = await res.json();
                            if (res.ok && data.url) {
                              setLessonForm({ ...lessonForm, videoUrl: data.url });
                            } else {
                              setNotice({ tone: "error", message: data.error || "Không thể tải video." });
                            }
                          } catch (error) {
                            console.error("Error uploading video:", error);
                            setNotice({ tone: "error", message: "Có lỗi khi tải video. Vui lòng thử lại." });
                          } finally {
                            setUploadingVideo(false);
                          }
                        }}
                      />
                    </label>
                  )}
                  {uploadingVideo && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900"></div>
                      <span>{labels.uploadingVideo}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  disabled={isSavingLesson}
                  onClick={() => {
                    if (savingLessonRef.current) return;
                    setShowModal(false);
                    setEditingLesson(null);
                  }}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {labels.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isSavingLesson || uploadingVideo}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingLesson
                    ? labels.saving
                    : editingLesson
                      ? labels.saveChanges
                      : labels.addLesson}
                </button>
              </div>
            </form>
          </div>
        </ModalDialog>
      )}

      {deleteTarget ? (
        <ModalDialog labelledBy="delete-lesson-title" onClose={() => { if (!isDeletingLesson) setDeleteTarget(null); }}>
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h2 id="delete-lesson-title" className="text-lg font-bold text-slate-950">Xóa bài học?</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Bài “{deleteTarget.title}” sẽ bị xóa khỏi mô-đun. Thao tác này không thể hoàn tác.
            </p>
            {notice?.tone === "error" ? <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{notice.message}</p> : null}
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" disabled={isDeletingLesson} onClick={() => setDeleteTarget(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">Hủy</button>
              <button type="button" disabled={isDeletingLesson} onClick={() => void handleDeleteLesson(deleteTarget.id)} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {isDeletingLesson ? "Đang xóa..." : "Xóa bài học"}
              </button>
            </div>
          </div>
        </ModalDialog>
      ) : null}
    </div>
  );
}
