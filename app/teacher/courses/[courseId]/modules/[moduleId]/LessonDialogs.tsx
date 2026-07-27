import type { FormEventHandler } from "react";
import { ModalDialog } from "@/app/components/ModalDialog";
import type { CourseManagementLabels } from "@/lib/language-display";

type Lesson = {
  id: string;
  title: string;
};

type LessonForm = {
  title: string;
  content: string;
  videoUrl: string;
};

type Notice = { tone: "success" | "error"; message: string } | null;

type Props = {
  showLessonModal: boolean;
  editingLesson: Lesson | null;
  lessonForm: LessonForm;
  uploadingVideo: boolean;
  isSavingLesson: boolean;
  notice: Notice;
  deleteTarget: Lesson | null;
  isDeletingLesson: boolean;
  labels: CourseManagementLabels["lessonsPage"];
  onLessonFormChange: (form: LessonForm) => void;
  onCreateLesson: FormEventHandler<HTMLFormElement>;
  onUpdateLesson: FormEventHandler<HTMLFormElement>;
  onUploadVideo: (file: File) => Promise<void>;
  onCloseLessonModal: () => void;
  onCancelLessonModal: () => void;
  onCloseDeleteDialog: () => void;
  onDeleteLesson: (lessonId: string) => Promise<void>;
};

export function LessonDialogs({
  showLessonModal,
  editingLesson,
  lessonForm,
  uploadingVideo,
  isSavingLesson,
  notice,
  deleteTarget,
  isDeletingLesson,
  labels,
  onLessonFormChange,
  onCreateLesson,
  onUpdateLesson,
  onUploadVideo,
  onCloseLessonModal,
  onCancelLessonModal,
  onCloseDeleteDialog,
  onDeleteLesson,
}: Props) {
  return (
    <>
      {showLessonModal ? (
        <ModalDialog labelledBy="lesson-modal-title" onClose={onCloseLessonModal}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6">
            <h2 id="lesson-modal-title" className="text-xl font-bold text-slate-900">
              {editingLesson ? labels.editTitle : labels.createTitle}
            </h2>
            {notice?.tone === "error" ? (
              <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{notice.message}</p>
            ) : null}
            <form onSubmit={editingLesson ? onUpdateLesson : onCreateLesson} className="mt-4 space-y-4">
              <div>
                <label htmlFor="lesson-title" className="block text-sm font-medium text-slate-700">{labels.title}</label>
                <input
                  id="lesson-title"
                  type="text"
                  required
                  value={lessonForm.title}
                  disabled={isSavingLesson}
                  onChange={(event) => onLessonFormChange({ ...lessonForm, title: event.target.value })}
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
                  onChange={(event) => onLessonFormChange({ ...lessonForm, content: event.target.value })}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-black placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                />
              </div>
              <div>
                <label htmlFor="lesson-video" className="block text-sm font-medium text-slate-700">{labels.video}</label>
                <div className="mt-1 space-y-2">
                  <label htmlFor="lesson-video-url" className="block text-sm font-medium text-slate-600">
                    {labels.videoLink}
                    <input
                      id="lesson-video-url"
                      type="url"
                      value={lessonForm.videoUrl.startsWith("/videos/") ? "" : lessonForm.videoUrl}
                      disabled={uploadingVideo || isSavingLesson}
                      onChange={(event) => onLessonFormChange({ ...lessonForm, videoUrl: event.target.value })}
                      placeholder={labels.videoLinkPlaceholder}
                      className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-black placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 disabled:bg-slate-100"
                    />
                  </label>
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
                        onClick={() => onLessonFormChange({ ...lessonForm, videoUrl: "" })}
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
                      <span className="mt-2 text-sm text-slate-600">{labels.orUploadVideo}</span>
                      <span className="text-xs text-slate-400">{labels.videoHint}</span>
                      <input
                        id="lesson-video"
                        type="file"
                        accept="video/mp4,video/webm,video/quicktime"
                        className="hidden"
                        disabled={uploadingVideo || isSavingLesson}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) void onUploadVideo(file);
                        }}
                      />
                    </label>
                  )}
                  {uploadingVideo ? (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
                      <span>{labels.uploadingVideo}</span>
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  disabled={isSavingLesson}
                  onClick={onCancelLessonModal}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {labels.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isSavingLesson || uploadingVideo}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingLesson ? labels.saving : editingLesson ? labels.saveChanges : labels.addLesson}
                </button>
              </div>
            </form>
          </div>
        </ModalDialog>
      ) : null}

      {deleteTarget ? (
        <ModalDialog labelledBy="delete-lesson-title" onClose={onCloseDeleteDialog}>
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h2 id="delete-lesson-title" className="text-lg font-bold text-slate-950">Xóa bài học?</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Bài “{deleteTarget.title}” sẽ bị xóa khỏi mô-đun. Thao tác này không thể hoàn tác.
            </p>
            {notice?.tone === "error" ? (
              <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{notice.message}</p>
            ) : null}
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" disabled={isDeletingLesson} onClick={onCloseDeleteDialog} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">Hủy</button>
              <button type="button" disabled={isDeletingLesson} onClick={() => void onDeleteLesson(deleteTarget.id)} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {isDeletingLesson ? "Đang xóa..." : "Xóa bài học"}
              </button>
            </div>
          </div>
        </ModalDialog>
      ) : null}
    </>
  );
}
