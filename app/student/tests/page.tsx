"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Test = {
  id: string;
  name: string;
  description: string | null;
  courseId: string;
  courseName: string;
  maxScore: number;
  passingScore: number;
  maxAttempts: number;
  timeLimit: number | null;
  questionCount: number;
  userAttempts: number;
  lastAttempt: {
    id: string;
    score: number;
    isPassed: boolean;
    submittedAt: string;
  } | null;
  canAttempt: boolean;
};

export default function StudentTestsPage() {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "available" | "completed">("all");

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    try {
      const res = await fetch("/api/student/tests");
      if (res.ok) {
        const data = await res.json();
        setTests(data.tests);
      }
    } catch (error) {
      console.error("Error fetching tests:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTests = tests.filter(test => {
    if (filter === "available") return test.canAttempt;
    if (filter === "completed") return !test.canAttempt || (test.lastAttempt?.isPassed ?? false);
    return true;
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-emerald-50 py-8">
      <div className="mx-auto max-w-5xl px-4">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-emerald-900">Danh sách bài test</h1>
            <p className="mt-1 text-sm text-emerald-700">
              Các bài test của khóa học bạn đã đăng ký
            </p>
          </div>
          <Link
            href="/student"
            className="text-sm text-emerald-700 hover:text-emerald-900"
          >
            ← Quay lại
          </Link>
        </div>

        {/* Filter */}
        <div className="mb-4 flex gap-2">
          {(["all", "available", "completed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                filter === f
                  ? "bg-emerald-600 text-white"
                  : "bg-white text-emerald-700 hover:bg-emerald-100"
              }`}
            >
              {f === "all" ? "Tất cả" : f === "available" ? "Có thể làm" : "Đã hoàn thành"}
            </button>
          ))}
        </div>

        {/* Tests List */}
        {filteredTests.length === 0 ? (
          <div className="rounded-xl border border-emerald-200 bg-white p-12 text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="mx-auto h-12 w-12 text-emerald-400"
            >
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
            <h3 className="mt-4 text-lg font-semibold text-emerald-900">Chưa có bài test nào</h3>
            <p className="mt-2 text-sm text-emerald-700">
              Hãy đăng ký khóa học để có thể làm bài test
            </p>
            <Link
              href="/courses"
              className="mt-4 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Xem khóa học
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTests.map((test) => (
              <div
                key={test.id}
                className="rounded-xl border border-emerald-200 bg-white p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-emerald-900">{test.name}</h3>
                      {test.lastAttempt?.isPassed && (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          ✓ Đạt
                        </span>
                      )}
                      {!test.canAttempt && !test.lastAttempt?.isPassed && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                          ✗ Chưa đạt
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-emerald-600">Khóa học: {test.courseName}</p>
                    {test.description && (
                      <p className="mt-2 text-sm text-emerald-700">{test.description}</p>
                    )}
                    
                    <div className="mt-3 flex flex-wrap gap-4 text-sm text-emerald-600">
                      <span>📝 {test.questionCount} câu hỏi</span>
                      <span>⭐ {test.maxScore} điểm</span>
                      <span>📊 Đạt: {test.passingScore} điểm</span>
                      {test.timeLimit && (
                        <span>⏱️ {test.timeLimit} phút</span>
                      )}
                      <span>🔄 {test.userAttempts}/{test.maxAttempts} lần làm</span>
                    </div>

                    {test.lastAttempt && (
                      <div className="mt-3 rounded-lg bg-emerald-50 p-3">
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-emerald-700">
                            Lần làm gần nhất: {formatDate(test.lastAttempt.submittedAt)}
                          </span>
                          <span className="font-medium text-emerald-900">
                            Điểm: {test.lastAttempt.score.toFixed(1)}/{test.maxScore}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="ml-4 flex flex-col gap-2">
                    {test.canAttempt ? (
                      <Link
                        href={`/student/tests/${test.id}`}
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                      >
                        {test.userAttempts > 0 ? "Làm lại" : "Bắt đầu làm"}
                      </Link>
                    ) : (
                      <span className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-500">
                        Hết lần làm
                      </span>
                    )}
                    {test.lastAttempt && (
                      <Link
                        href={`/student/tests/${test.id}/result/${test.lastAttempt.id}`}
                        className="rounded-lg border border-emerald-300 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
                      >
                        Xem kết quả
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}