"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

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
};

export default function TeacherModulePage() {
  const router = useRouter();
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

  useEffect(() => {
    fetchModule();
  }, [courseId, moduleId]);

  const fetchModule = async () => {
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
  };

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/teacher/courses/${courseId}/modules/${moduleId}/lessons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lessonForm),
      });
      if (res.ok) {
        setShowModal(false);
        setLessonForm({ title: "", content: "", videoUrl: "" });
        fetchModule();
      }
    } catch (error) {
      console.error("Error creating lesson:", error);
    }
  };

  const handleUpdateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLesson) return;
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
        fetchModule();
      }
    } catch (error) {
      console.error("Error updating lesson:", error);
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa bài học này?")) return;
    try {
      const res = await fetch(`/api/teacher/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchModule();
      }
    } catch (error) {
      console.error("Error deleting lesson:", error);
    }
  };

  const openCreateModal = () => {
    setEditingLesson(null);
    setLessonForm({ title: "", content: "", videoUrl: "" });
    setShowModal(true);
  };

  const openEditModal = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setLessonForm({
      title: lesson.title,
      content: lesson.content,
      videoUrl: lesson.videoUrl || "",
    });
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
        {/* Back button */}
        <div className="mb-4 flex items-center justify-between">
          <Link
            href={`/teacher/courses/${courseId}`}
            className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Quay lại khóa học
          </Link>
        </div>

        {/* Module Header */}
        <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{module?.name}</h1>
              <p className="mt-1 text-sm text-slate-600">Khóa học: {course?.name}</p>
            </div>
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                <line x1="12" x2="12" y1="5" y2="19" />
                <line x1="5" x2="19" y1="12" y2="12" />
              </svg>
              Thêm bài học
            </button>
          </div>
        </div>

        {/* Lessons List */}
        {module?.lessons?.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
            <p className="text-slate-600">Chưa có bài học nào. Hãy thêm bài học đầu tiên!</p>
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
                          <span>Có video</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(lesson)}
                      className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteLesson(lesson.id)}
                      className="rounded-lg p-2 text-red-600 hover:bg-red-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6">
            <h2 className="text-xl font-bold text-slate-900">
              {editingLesson ? "Chỉnh sửa bài học" : "Thêm bài học mới"}
            </h2>
            <form onSubmit={editingLesson ? handleUpdateLesson : handleCreateLesson} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Tiêu đề *</label>
                <input
                  type="text"
                  required
                  value={lessonForm.title}
                  onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-black placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Nội dung *</label>
                <textarea
                  required
                  rows={5}
                  value={lessonForm.content}
                  onChange={(e) => setLessonForm({ ...lessonForm, content: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-black placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Video</label>
                <div className="mt-1 space-y-2">
                  {lessonForm.videoUrl ? (
                    <div className="relative rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <video
                        src={lessonForm.videoUrl}
                        controls
                        className="h-40 w-full rounded-lg object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => setLessonForm({ ...lessonForm, videoUrl: "" })}
                        className="absolute right-2 top-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
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
                      <span className="mt-2 text-sm text-slate-600">Tải lên video</span>
                      <span className="text-xs text-slate-400">MP4, WebM, MOV (tối đa 500MB)</span>
                      <input
                        type="file"
                        accept="video/mp4,video/webm,video/quicktime"
                        className="hidden"
                        disabled={uploadingVideo}
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
                              alert(data.error || "Upload failed");
                            }
                          } catch (error) {
                            console.error("Error uploading video:", error);
                            alert("Lỗi khi tải video");
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
                      <span>Đang tải video...</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingLesson(null);
                  }}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                >
                  {editingLesson ? "Lưu thay đổi" : "Thêm bài học"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
