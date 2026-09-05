"use client";

import { FormEvent, useCallback, useRef, useState } from "react";
import { CourseHeader } from "./_components/CourseHeader";
import { CourseTabs, type CourseTab } from "./_components/CourseTabs";
import { CourseInfoTab } from "./_components/CourseInfoTab";
import { ModulesTab } from "./_components/ModulesTab";
import { TestsTab } from "./_components/TestsTab";
import { ModuleModal } from "./_components/ModuleModal";
import { TestModal } from "./_components/TestModal";
import { Course, LearningLanguage, Module, Test, TestForm, initialTestForm } from "./types";
import { readJsonResponse } from "@/lib/http-response";
import { getCourseManagementLabels } from "@/lib/language-display";

type CourseDetailClientProps = {
  courseId: string;
  initialData: {
    course: Course & { modules: Module[]; tests: Test[] };
    languages: LearningLanguage[];
    viewerRole: string;
  };
};

export default function CourseDetailClient({
  courseId,
  initialData,
}: CourseDetailClientProps) {
  const [course, setCourse] = useState<Course>(initialData.course);
  const [modules, setModules] = useState<Module[]>(initialData.course.modules);
  const [tests, setTests] = useState<Test[]>(initialData.course.tests);
  const [languages, setLanguages] = useState<LearningLanguage[]>(initialData.languages);
  const [activeTab, setActiveTab] = useState<CourseTab>("modules");
  const [isResubmitting, setIsResubmitting] = useState(false);
  const [approvalMessage, setApprovalMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [showModuleModal, setShowModuleModal] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [moduleName, setModuleName] = useState("");
  const [isSavingModule, setIsSavingModule] = useState(false);
  const savingModuleRef = useRef(false);

  const [showTestModal, setShowTestModal] = useState(false);
  const [testForm, setTestForm] = useState<TestForm>(initialTestForm);
  const [isCreatingTest, setIsCreatingTest] = useState(false);
  const creatingTestRef = useRef(false);
  const [deletingTestId, setDeletingTestId] = useState<string | null>(null);

  const fetchCourseData = useCallback(async () => {
    try {
      const res = await fetch(`/api/teacher/courses/${courseId}`);
      if (res.ok) {
        const data = await res.json();
        setCourse(data.course);
        setLanguages(data.languages || []);
        setModules(data.course.modules || []);
        setTests(data.course.tests || []);
      }
    } catch (error) {
      console.error("Error fetching course:", error);
    }
  }, [courseId]);

  const handleSaveModule = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (savingModuleRef.current) return;

    const trimmedName = moduleName.trim();
    if (!trimmedName) {
      alert("Vui lòng nhập tên chương.");
      return;
    }

    savingModuleRef.current = true;
    setIsSavingModule(true);

    try {
      const url = editingModule
        ? `/api/teacher/courses/${courseId}/modules/${editingModule.id}`
        : `/api/teacher/courses/${courseId}/modules`;
      const res = await fetch(url, {
        method: editingModule ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName }),
      });
      const data = await readJsonResponse(res).catch(() => ({}));
      if (res.ok) {
        setShowModuleModal(false);
        setEditingModule(null);
        setModuleName("");
        await fetchCourseData();
      } else {
        alert(
          data?.error ||
            (editingModule ? "Không thể cập nhật chương." : "Không thể tạo chương."),
        );
      }
    } catch (error) {
      console.error("Error saving module:", error);
      alert(editingModule ? "Lỗi khi cập nhật chương." : "Lỗi khi tạo chương.");
    } finally {
      savingModuleRef.current = false;
      setIsSavingModule(false);
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa chương này?")) return;
    try {
      const res = await fetch(`/api/teacher/courses/${courseId}/modules/${moduleId}`, { method: "DELETE" });
      const data = await readJsonResponse(res).catch(() => ({}));
      if (res.ok) {
        await fetchCourseData();
      } else {
        alert(data?.error || "Không thể xóa chương.");
      }
    } catch (error) {
      console.error("Error deleting module:", error);
      alert("Lỗi khi xóa chương.");
    }
  };

  const handleCreateTest = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (creatingTestRef.current) return;

    creatingTestRef.current = true;
    setIsCreatingTest(true);

    try {
      const res = await fetch("/api/teacher/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...testForm,
          courseId,
          passingScore: parseFloat(testForm.passingScore),
          timeLimit: testForm.timeLimit ? parseInt(testForm.timeLimit) : null,
        }),
      });

      const data = await readJsonResponse(res).catch(() => ({}));
      if (res.ok) {
        setShowTestModal(false);
        setTestForm(initialTestForm);
        await fetchCourseData();
      } else {
        const message = data?.details ? `${data.error || "Không thể tạo bài test"}: ${data.details}` : data?.error || "Không thể tạo bài test";
        alert(message);
      }
    } catch (error) {
      console.error("Error creating test:", error);
      alert("Lỗi khi tạo bài test.");
    } finally {
      creatingTestRef.current = false;
      setIsCreatingTest(false);
    }
  };

  const handleDeleteTest = async (testId: string) => {
    if (deletingTestId) return;
    if (!confirm("Bạn có chắc chắn muốn xóa bài test này?")) return;
    setDeletingTestId(testId);
    try {
      const res = await fetch(`/api/teacher/tests/${testId}`, { method: "DELETE" });
      const data = await readJsonResponse(res).catch(() => ({}));
      if (res.ok) {
        await fetchCourseData();
      } else {
        alert(data?.error || "Không thể xóa bài test.");
      }
    } catch (error) {
      console.error("Error deleting test:", error);
      alert("Lỗi khi xóa bài test.");
    } finally {
      setDeletingTestId(null);
    }
  };

  const handleResubmitForApproval = async () => {
    if (isResubmitting || course.status !== "REJECTED") return;
    setIsResubmitting(true);
    setApprovalMessage(null);

    try {
      const response = await fetch(`/api/teacher/courses/${courseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submitForApproval" }),
      });
      const data = await readJsonResponse(response).catch(() => ({}));
      if (!response.ok) {
        setApprovalMessage({ type: "error", text: data?.error || labels.approval.error });
        return;
      }

      setCourse((current) => ({ ...current, ...data.course }));
      setApprovalMessage({
        type: "success",
        text: data?.autoApproved ? labels.approval.autoApproved : labels.approval.submitted,
      });
    } catch (error) {
      console.error("Error resubmitting course for approval:", error);
      setApprovalMessage({ type: "error", text: labels.approval.error });
    } finally {
      setIsResubmitting(false);
    }
  };

  const openModuleCreateModal = () => {
    setEditingModule(null);
    setModuleName("");
    setIsSavingModule(false);
    savingModuleRef.current = false;
    setShowModuleModal(true);
  };

  const openModuleEditModal = (module: Module) => {
    setEditingModule(module);
    setModuleName(module.name);
    setIsSavingModule(false);
    savingModuleRef.current = false;
    setShowModuleModal(true);
  };

  const closeModuleModal = () => {
    if (savingModuleRef.current) return;
    setShowModuleModal(false);
    setEditingModule(null);
    setModuleName("");
  };

  const openTestCreateModal = () => {
    setTestForm(initialTestForm);
    setIsCreatingTest(false);
    creatingTestRef.current = false;
    setShowTestModal(true);
  };

  const courseLanguageKey = course.language?.code || course.language?.name || "vi";
  const labels = getCourseManagementLabels(courseLanguageKey);

  return (
    <div className="min-h-dvh bg-slate-50 py-8">
      <div className="mx-auto max-w-7xl px-4">
        <CourseHeader
          course={course}
          viewerRole={initialData.viewerRole}
          isResubmitting={isResubmitting}
          approvalMessage={approvalMessage}
          onResubmit={() => void handleResubmitForApproval()}
        />
        <CourseTabs activeTab={activeTab} moduleCount={modules.length} testCount={tests.length} labels={labels.tabs} onTabChange={setActiveTab} />

        {activeTab === "information" && (
          <CourseInfoTab
            course={course}
            languages={languages}
            viewerRole={initialData.viewerRole}
            onUpdated={(updatedCourse) =>
              setCourse((current) => (current ? { ...current, ...updatedCourse } : current))
            }
          />
        )}

        {activeTab === "modules" && (
          <ModulesTab
            courseId={courseId}
            modules={modules}
            labels={labels.modulesTab}
            onOpenCreateModal={openModuleCreateModal}
            onEditModule={openModuleEditModal}
            onDeleteModule={handleDeleteModule}
          />
        )}

        {activeTab === "tests" && (
          <TestsTab tests={tests} modulesCount={modules.length} deletingTestId={deletingTestId} labels={labels.testsTab} onOpenCreateModal={openTestCreateModal} onDeleteTest={handleDeleteTest} />
        )}
      </div>

      <ModuleModal
        isOpen={showModuleModal}
        moduleName={moduleName}
        isEditing={Boolean(editingModule)}
        isSubmitting={isSavingModule}
        labels={labels.moduleModal}
        onChangeName={setModuleName}
        onClose={closeModuleModal}
        onSubmit={handleSaveModule}
      />

      <TestModal
        isOpen={showTestModal}
        form={testForm}
        isSubmitting={isCreatingTest}
        labels={labels.testModal}
        modules={modules}
        onChangeForm={setTestForm}
        onClose={() => {
          if (!creatingTestRef.current) setShowTestModal(false);
        }}
        onSubmit={handleCreateTest}
      />
    </div>
  );
}
