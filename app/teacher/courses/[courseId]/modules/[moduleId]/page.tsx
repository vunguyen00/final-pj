"use client";

import { LessonDialogs } from "./LessonDialogs";
import { ModuleOverview } from "./ModuleOverview";
import { useTeacherModulePage } from "./useTeacherModulePage";

export default function TeacherModulePage() {
  const controller = useTeacherModulePage();

  if (controller.loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-slate-900" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-slate-50 py-8">
      <ModuleOverview
        courseId={controller.courseId}
        courseName={controller.course?.name}
        moduleName={controller.module?.name}
        lessons={controller.module?.lessons}
        labels={controller.labels}
        onCreateLesson={controller.openCreateModal}
        onEditLesson={controller.openEditModal}
        onDeleteLesson={controller.openDeleteDialog}
      />

      {controller.notice ? (
        <div
          role="status"
          className={`fixed right-4 top-4 z-[70] max-w-md rounded-lg border p-3 text-sm shadow-lg ${
            controller.notice.tone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {controller.notice.message}
        </div>
      ) : null}

      <LessonDialogs
        showLessonModal={controller.showModal}
        editingLesson={controller.editingLesson}
        lessonForm={controller.lessonForm}
        uploadingVideo={controller.uploadingVideo}
        isSavingLesson={controller.isSavingLesson}
        notice={controller.notice}
        deleteTarget={controller.deleteTarget}
        isDeletingLesson={controller.isDeletingLesson}
        labels={controller.labels}
        onLessonFormChange={controller.setLessonForm}
        onCreateLesson={controller.handleCreateLesson}
        onUpdateLesson={controller.handleUpdateLesson}
        onUploadVideo={controller.handleVideoUpload}
        onCloseLessonModal={controller.closeLessonModal}
        onCancelLessonModal={controller.cancelLessonModal}
        onCloseDeleteDialog={controller.closeDeleteDialog}
        onDeleteLesson={controller.handleDeleteLesson}
      />
    </div>
  );
}
