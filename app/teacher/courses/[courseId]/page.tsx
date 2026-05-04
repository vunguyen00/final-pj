"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

type Module = {
  id: string;
  name: string;
  order: number;
  lessons: { id: string; title: string }[];
};

type Test = {
  id: string;
  name: string;
  maxScore: number;
  passingScore: number;
  maxAttempts: number;
  timeLimit: number | null;
  _count: {
    questions: number;
    attempts: number;
  };
};

type Course = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string | null;
  duration: string | null;
  thumbnail: string | null;
  status: string;
  createdAt: string;
  _count: {
    enrollments: number;
    modules: number;
    tests: number;
    feedbacks: number;
  };
};

type User = {
  id: string;
  username: string;
  email: string;
  role: string;
};

export default function CourseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.courseId as string;

  const [user, setUser] = useState<User | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"modules" | "tests">("modules");

  // Module modal
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [moduleName, setModuleName] = useState("");

  // Test modal
  const [showTestModal, setShowTestModal] = useState(false);
  const [editingTest, setEditingTest] = useState<Test | null>(null);
  const [testForm, setTestForm] = useState({
    name: "",
    description: "",
    maxScore: "100",
    passingScore: "50",
    maxAttempts: "3",
    timeLimit: "",
    shuffleQuestions: false,
  });

  useEffect(() => {
    checkAuthAndFetchData();
  }, [courseId]);

  const checkAuthAndFetchData = async () => {
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
      fetchCourseData();
    } catch (error) {
      console.error("Auth check failed:", error);
      router.push("/auth/login");
    }
  };

  const fetchCourseData = async () => {
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
  };

  // Module handlers
  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/teacher/courses/${courseId}/modules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: moduleName }),
      });
      if (res.ok) {
        setShowModuleModal(false);
        setModuleName("");
        fetchCourseData();
      }
    } catch (error) {
      console.error("Error creating module:", error);
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!confirm("Báº¡n cÃ³ cháº¯c cháº¯n muá»‘n xÃ³a module nÃ y?")) return;
    try {
      const res = await fetch(`/api/teacher/courses/${courseId}/modules/${moduleId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchCourseData();
      }
    } catch (error) {
      console.error("Error deleting module:", error);
    }
  };

  // Test handlers
  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/teacher/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...testForm,
          courseId,
          maxScore: parseFloat(testForm.maxScore),
          passingScore: parseFloat(testForm.passingScore),
          maxAttempts: parseInt(testForm.maxAttempts),
          timeLimit: testForm.timeLimit ? parseInt(testForm.timeLimit) : null,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setShowTestModal(false);
        setTestForm({
          name: "",
          description: "",
          maxScore: "100",
          passingScore: "50",
          maxAttempts: "3",
          timeLimit: "",
          shuffleQuestions: false,
        });
        fetchCourseData();
      } else {
        const message = data?.details
          ? `${data.error || "Không thể tạo bài test"}: ${data.details}`
          : data?.error || "Không thể tạo bài test";
        alert(message);
      }
    } catch (error) {
      console.error("Error creating test:", error);
      alert("Lỗi khi tạo bài test");
    }
  };

  const handleDeleteTest = async (testId: string) => {
    if (!confirm("Báº¡n cÃ³ cháº¯c cháº¯n muá»‘n xÃ³a bÃ i test nÃ y?")) return;
    try {
      const res = await fetch(`/api/teacher/tests/${testId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchCourseData();
      }
    } catch (error) {
      console.error("Error deleting test:", error);
    }
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
        <p className="text-slate-600">KhÃ´ng tÃ¬m tháº¥y khÃ³a há»c</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-7xl px-4">
        {/* Back button */}
        <Link
          href="/teacher/courses"
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-4 w-4"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Quay láº¡i danh sÃ¡ch khÃ³a há»c
        </Link>

        {/* Course header */}
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{course.name}</h1>
              <p className="mt-2 text-slate-600">{course.description}</p>
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-500">
                <span className="flex items-center gap-1">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-4 w-4"
                  >
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  {course._count.enrollments} há»c viÃªn
                </span>
                <span className="flex items-center gap-1">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-4 w-4"
                  >
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  </svg>
                  {course._count.modules} modules
                </span>
                <span className="flex items-center gap-1">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-4 w-4"
                  >
                    <path d="M9 11l3 3L22 4" />
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                  </svg>
                  {course._count.tests} bÃ i test
                </span>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${
                    course.status === "ACTIVE"
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {course.status === "ACTIVE" ? "Hoáº¡t Ä‘á»™ng" : "ÄÃ£ khÃ³a"}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-slate-900">
                {course.price.toLocaleString("vi-VN")}Ä‘
              </p>
              <p className="text-sm text-slate-500">{course.category}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-6 border-b border-slate-200">
          <nav className="-mb-px flex gap-4">
            <button
              onClick={() => setActiveTab("modules")}
              className={`border-b-2 px-1 py-4 text-sm font-medium ${
                activeTab === "modules"
                  ? "border-slate-900 text-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              Quáº£n lÃ½ Module ({modules.length})
            </button>
            <button
              onClick={() => setActiveTab("tests")}
              className={`border-b-2 px-1 py-4 text-sm font-medium ${
                activeTab === "tests"
                  ? "border-slate-900 text-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              Quáº£n lÃ½ BÃ i Test ({tests.length})
            </button>
          </nav>
        </div>

        {/* Modules Tab */}
        {activeTab === "modules" && (
          <div className="mt-6">
            <div className="mb-4 flex justify-end">
              <button
                onClick={() => {
                  setEditingModule(null);
                  setModuleName("");
                  setShowModuleModal(true);
                }}
                className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-4 w-4"
                >
                  <line x1="12" x2="12" y1="5" y2="19" />
                  <line x1="5" x2="19" y1="12" y2="12" />
                </svg>
                ThÃªm Module
              </button>
            </div>

            {modules.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
                <p className="text-slate-600">ChÆ°a cÃ³ module nÃ o</p>
              </div>
            ) : (
              <div className="space-y-4">
                {modules.map((module, index) => (
                  <div
                    key={module.id}
                    className="rounded-xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm font-medium text-slate-600">
                          {index + 1}
                        </span>
                        <div>
                          <h3 className="font-medium text-slate-900">{module.name}</h3>
                          <p className="text-sm text-slate-500">
                            {module.lessons.length} bÃ i há»c
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Link
                          href={`/teacher/courses/${courseId}/modules/${module.id}`}
                          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
                          title="Quáº£n lÃ½ bÃ i há»c"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="h-4 w-4"
                          >
                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                          </svg>
                        </Link>
                        <button
                          onClick={() => handleDeleteModule(module.id)}
                          className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                          title="XÃ³a"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="h-4 w-4"
                          >
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
        )}

        {/* Tests Tab */}
        {activeTab === "tests" && (
          <div className="mt-6">
            <div className="mb-4 flex justify-end">
              <button
                onClick={() => {
                  setEditingTest(null);
                  setTestForm({
                    name: "",
                    description: "",
                    maxScore: "100",
                    passingScore: "50",
                    maxAttempts: "3",
                    timeLimit: "",
                    shuffleQuestions: false,
                  });
                  setShowTestModal(true);
                }}
                disabled={modules.length === 0 || tests.length > 0}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${
                  modules.length === 0 || tests.length > 0
                    ? "cursor-not-allowed bg-gray-300 text-gray-500"
                    : "bg-slate-900 text-white hover:bg-slate-800"
                }`}
                title={
                  tests.length > 0
                    ? "KhÃ³a há»c Ä‘Ã£ cÃ³ bÃ i test. Má»—i khÃ³a há»c chá»‰ Ä‘Æ°á»£c cÃ³ 1 bÃ i test cuá»‘i."
                    : modules.length === 0
                    ? "KhÃ³a há»c pháº£i cÃ³ Ã­t nháº¥t 1 module trÆ°á»›c khi táº¡o bÃ i test"
                    : ""
                }
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-4 w-4"
                >
                  <line x1="12" x2="12" y1="5" y2="19" />
                  <line x1="5" x2="19" y1="12" y2="12" />
                </svg>
                Táº¡o BÃ i Test
              </button>
            </div>

            {tests.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
                <p className="text-slate-600">ChÆ°a cÃ³ bÃ i test nÃ o</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {tests.map((test) => (
                  <div
                    key={test.id}
                    className="rounded-xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-slate-900">{test.name}</h3>
                        <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-500">
                          <span>Äiá»ƒm tá»‘i Ä‘a: {test.maxScore}</span>
                          <span>Äiá»ƒm Ä‘áº¡t: {test.passingScore}</span>
                          <span>Láº§n lÃ m: {test._count.attempts}/{test.maxAttempts}</span>
                          {test.timeLimit && <span>Thá»i gian: {test.timeLimit}p</span>}
                        </div>
                        <p className="mt-2 text-sm text-slate-500">
                          {test._count.questions} cÃ¢u há»i
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Link
                          href={`/teacher/tests/${test.id}/questions`}
                          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
                          title="Quáº£n lÃ½ cÃ¢u há»i"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="h-4 w-4"
                          >
                            <path d="M9 11l3 3L22 4" />
                            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                          </svg>
                        </Link>
                        <button
                          onClick={() => handleDeleteTest(test.id)}
                          className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                          title="XÃ³a"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="h-4 w-4"
                          >
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
        )}
      </div>

      {/* Module Modal */}
      {showModuleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6">
            <h2 className="text-xl font-bold text-slate-900">
              {editingModule ? "Chá»‰nh sá»­a Module" : "Táº¡o Module má»›i"}
            </h2>
            <form onSubmit={handleCreateModule} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-900">
                  TÃªn Module *
                </label>
                <input
                  type="text"
                  required
                  value={moduleName}
                  onChange={(e) => setModuleName(e.target.value)}
                  placeholder="VÃ­ dá»¥: Unit 1 - Introduction"
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModuleModal(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Há»§y
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                >
                  {editingModule ? "LÆ°u" : "Táº¡o"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Test Modal */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-lg rounded-xl bg-white p-6">
            <h2 className="text-xl font-bold text-slate-900">Táº¡o BÃ i Test má»›i</h2>
            <form onSubmit={handleCreateTest} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-900">
                  TÃªn bÃ i test *
                </label>
                <input
                  type="text"
                  required
                  value={testForm.name}
                  onChange={(e) => setTestForm({ ...testForm, name: e.target.value })}
                  placeholder="VÃ­ dá»¥: Test Unit 1"
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-900">
                  MÃ´ táº£
                </label>
                <textarea
                  rows={2}
                  value={testForm.description}
                  onChange={(e) => setTestForm({ ...testForm, description: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-900">
                    Äiá»ƒm tá»‘i Ä‘a *
                  </label>
                  <input
                    type="number"
                    required
                    value={testForm.maxScore}
                    onChange={(e) => setTestForm({ ...testForm, maxScore: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-900">
                    Äiá»ƒm Ä‘áº¡t *
                  </label>
                  <input
                    type="number"
                    required
                    value={testForm.passingScore}
                    onChange={(e) => setTestForm({ ...testForm, passingScore: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-900">
                    Sá»‘ láº§n lÃ m tá»‘i Ä‘a *
                  </label>
                  <input
                    type="number"
                    required
                    value={testForm.maxAttempts}
                    onChange={(e) => setTestForm({ ...testForm, maxAttempts: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-900">
                    Thá»i gian (phÃºt)
                  </label>
                  <input
                    type="number"
                    value={testForm.timeLimit}
                    onChange={(e) => setTestForm({ ...testForm, timeLimit: e.target.value })}
                    placeholder="Äá»ƒ trá»‘ng náº¿u khÃ´ng giá»›i háº¡n"
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="shuffleQuestions"
                  checked={testForm.shuffleQuestions}
                  onChange={(e) => setTestForm({ ...testForm, shuffleQuestions: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <label htmlFor="shuffleQuestions" className="text-sm text-slate-700">
                  XÃ¡o trá»™n cÃ¢u há»i khi lÃ m bÃ i
                </label>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowTestModal(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Há»§y
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                >
                  Táº¡o bÃ i test
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
