"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { CourseHeader } from "./_components/CourseHeader";
import { CourseTabs } from "./_components/CourseTabs";
import { ModulesTab } from "./_components/ModulesTab";
import { TestsTab } from "./_components/TestsTab";
import { ModuleModal } from "./_components/ModuleModal";
import { TestModal } from "./_components/TestModal";
import { Course, Module, Test, TestForm, initialTestForm } from "./types";

export default function CourseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.courseId as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"modules" | "tests">("modules");

  const [showModuleModal, setShowModuleModal] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [moduleName, setModuleName] = useState("");

  const [showTestModal, setShowTestModal] = useState(false);
  const [testForm, setTestForm] = useState<TestForm>(initialTestForm);

  async function checkAuthAndFetchData() {
    try {
      const res = await fetch("/api/auth/me");
      if (!res.ok) {
        router.push("/auth/login");
        return;
      }
      const data = await res.json();
      if (data.user.role !== "TEACHER" && data.user.role !== "ADMIN") {
        router.push("/");
        return;
      }
      void fetchCourseData();
    } catch (error) {
      console.error("Auth check failed:", error);
      router.push("/auth/login");
    }
  }

  async function fetchCourseData() {
    try {
      const res = await fetch(`/api/teacher/courses/${courseId}`);
      if (res.ok) {
        const data = await res.json();
        setCourse(data.course);
        setModules(data.course.modules || []);
        setTests(data.course.tests || []);
      }
    } catch (error) {
      console.error("Error fetching course:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void checkAuthAndFetchData();
  }, [courseId]);

  const handleCreateModule = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedName = moduleName.trim();
    if (!trimmedName) {
      alert("Vui long nhap ten module");
      return;
    }

    try {
      const res = await fetch(`/api/teacher/courses/${courseId}/modules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setShowModuleModal(false);
        setModuleName("");
        fetchCourseData();
      } else {
        alert(data?.error || "Khong the tao module");
      }
    } catch (error) {
      console.error("Error creating module:", error);
      alert("Loi khi tao module");
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!confirm("Ban co chac chan muon xoa module nay?")) return;
    try {
      const res = await fetch(`/api/teacher/courses/${courseId}/modules/${moduleId}`, { method: "DELETE" });
      if (res.ok) fetchCourseData();
    } catch (error) {
      console.error("Error deleting module:", error);
    }
  };

  const handleCreateTest = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/teacher/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...testForm,
          courseId,
          passingScore: parseFloat(testForm.passingScore),
          maxAttempts: parseInt(testForm.maxAttempts),
          timeLimit: testForm.timeLimit ? parseInt(testForm.timeLimit) : null,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setShowTestModal(false);
        setTestForm(initialTestForm);
        fetchCourseData();
      } else {
        const message = data?.details ? `${data.error || "Khong the tao bai test"}: ${data.details}` : data?.error || "Khong the tao bai test";
        alert(message);
      }
    } catch (error) {
      console.error("Error creating test:", error);
      alert("Loi khi tao bai test");
    }
  };

  const handleDeleteTest = async (testId: string) => {
    if (!confirm("Ban co chac chan muon xoa bai test nay?")) return;
    try {
      const res = await fetch(`/api/teacher/tests/${testId}`, { method: "DELETE" });
      if (res.ok) fetchCourseData();
    } catch (error) {
      console.error("Error deleting test:", error);
    }
  };

  const openModuleCreateModal = () => {
    setEditingModule(null);
    setModuleName("");
    setShowModuleModal(true);
  };

  const openTestCreateModal = () => {
    setTestForm(initialTestForm);
    setShowTestModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-600">Không tìm thấy khóa học</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-7xl px-4">
        <CourseHeader course={course} />
        <CourseTabs activeTab={activeTab} moduleCount={modules.length} testCount={tests.length} onTabChange={setActiveTab} />

        {activeTab === "modules" && (
          <ModulesTab courseId={courseId} modules={modules} onOpenCreateModal={openModuleCreateModal} onDeleteModule={handleDeleteModule} />
        )}

        {activeTab === "tests" && (
          <TestsTab tests={tests} modulesCount={modules.length} onOpenCreateModal={openTestCreateModal} onDeleteTest={handleDeleteTest} />
        )}
      </div>

      <ModuleModal
        isOpen={showModuleModal}
        moduleName={moduleName}
        isEditing={Boolean(editingModule)}
        onChangeName={setModuleName}
        onClose={() => setShowModuleModal(false)}
        onSubmit={handleCreateModule}
      />

      <TestModal
        isOpen={showTestModal}
        form={testForm}
        onChangeForm={setTestForm}
        onClose={() => setShowTestModal(false)}
        onSubmit={handleCreateTest}
      />
    </div>
  );
}
