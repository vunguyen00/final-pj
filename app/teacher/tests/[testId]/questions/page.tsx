"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { QuestionCard } from "./components/QuestionCard";
import { QuestionModal } from "./components/QuestionModal";
import { createDefaultForm, inferKindFromQuestion, mapKindToPayload } from "./helpers";
import { Question, QuestionForm, QuestionKind, Test } from "./types";
import {
  FIXED_TEST_MAX_SCORE,
  getAssessmentModeLabel,
  getRemainingQuestionScore,
  isTestReady,
} from "@/lib/test-rules";

export default function TeacherTestQuestionsPage() {
  const params = useParams();
  const testId = params.testId as string;

  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [questionForm, setQuestionForm] = useState<QuestionForm>(createDefaultForm());
  const [pageError, setPageError] = useState<string | null>(null);

  const totalQuestionScore = useMemo(() => questions.reduce((sum, question) => sum + Number(question.score || 0), 0), [questions]);
  const remainingScore = getRemainingQuestionScore(totalQuestionScore);
  const fetchTestAndQuestions = useCallback(async () => {
    try {
      const [testRes, questionsRes] = await Promise.all([
        fetch(`/api/teacher/tests/${testId}`),
        fetch(`/api/teacher/tests/${testId}/questions`),
      ]);
      if (testRes.ok) {
        const data = await testRes.json();
        setTest(data.test);
        setPageError(null);
      } else {
        const data = await testRes.json().catch(() => ({}));
        setPageError(data?.error || "Không thể tải thông tin bài test.");
      }
      if (questionsRes.ok) {
        const data = await questionsRes.json();
        setQuestions(data.questions);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, [testId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchTestAndQuestions();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchTestAndQuestions]);

  const resetForm = () => setQuestionForm(createDefaultForm());

  const openCreateModal = () => {
    if (!test) {
      alert("Không tìm thấy bài test. Vui lòng thử lại.");
      return;
    }
    if (remainingScore <= 0) {
      alert("Tổng điểm câu hỏi đã đạt 100. Hãy sửa hoặc xóa câu hỏi trước khi thêm mới.");
      return;
    }
    setEditingQuestion(null);
    setQuestionForm(createDefaultForm());
    setShowModal(true);
  };

  const openEditModal = (question: Question) => {
    const kind = inferKindFromQuestion(question);
    setEditingQuestion(question);
    setQuestionForm({
      kind,
      type: question.type,
      content: question.content,
      audioUrl: question.audioUrl || "",
      hasListening: Boolean(question.audioUrl),
      score: String(question.score),
      explanation: question.explanation || "",
      hint: question.hint || "",
      answers: question.answers || [],
    });
    setShowModal(true);
  };

  const validateForm = (form: QuestionForm): string | null => {
    if (!form.kind) return "Vui lòng chọn dạng câu hỏi";
    if (!form.content.trim()) return "Vui lòng nhập nội dung câu hỏi";
    if (!form.score || Number(form.score) <= 0) return "Điểm số phải lớn hơn 0";
    if (form.kind === "LISTENING" && !form.audioUrl.trim()) return "Vui lòng nhập URL audio";

    if ((form.kind === "MULTIPLE_CHOICE" || form.kind === "TRUE_FALSE") && form.answers.some((a) => !a.content.trim())) {
      return "Vui lòng điền đủ nội dung cho tất cả đáp án";
    }
    if ((form.kind === "MULTIPLE_CHOICE" || form.kind === "TRUE_FALSE") && !form.answers.some((a) => a.isCorrect)) {
      return "Vui lòng chọn đáp án đúng";
    }
    if (form.kind === "FILL_IN_BLANK" && !form.answers[0]?.content?.trim()) return "Vui lòng nhập đáp án đúng";
    return null;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!test) {
      alert("Bài test không tồn tại hoặc bạn không có quyền truy cập.");
      return;
    }
    const validationError = validateForm(questionForm);
    if (validationError) {
      alert(validationError);
      return;
    }

    const kindPayload = mapKindToPayload(questionForm.kind as QuestionKind);
    const payload = {
      ...questionForm,
      ...kindPayload,
      audioUrl: kindPayload.hasListening ? questionForm.audioUrl : null,
      answers:
        questionForm.kind === "ESSAY" || questionForm.kind === "LISTENING" || questionForm.kind === "SPEAKING"
          ? []
          : questionForm.answers,
    };

    try {
      const url = editingQuestion ? `/api/teacher/tests/${testId}/questions/${editingQuestion.id}` : `/api/teacher/tests/${testId}/questions`;
      const method = editingQuestion ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errorMessage = data?.details
          ? `${data.error || "Không thể lưu câu hỏi"}: ${data.details}`
          : data?.error || "Không thể lưu câu hỏi. Vui lòng thử lại.";
        alert(errorMessage);
        return;
      }

      setShowModal(false);
      setEditingQuestion(null);
      resetForm();
      await fetchTestAndQuestions();
    } catch (error) {
      console.error("Error saving question:", error);
      alert("Lỗi khi lưu câu hỏi.");
    }
  };

  const handleDelete = async (questionId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa câu hỏi này?")) return;
    try {
      const res = await fetch(`/api/teacher/tests/${testId}/questions/${questionId}`, { method: "DELETE" });
      if (res.ok) await fetchTestAndQuestions();
    } catch (error) {
      console.error("Error deleting question:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-slate-900" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-4 flex items-center justify-between">
          {test?.course?.id ? (
            <Link href={`/teacher/courses/${test.course.id}`} className="text-sm text-slate-600 hover:text-slate-900">
              Quay lại khóa học
            </Link>
          ) : (
            <span className="text-sm text-slate-500">Đề test độc lập</span>
          )}
          <Link href="/teacher/courses" className="text-sm text-slate-600 hover:text-slate-900">
            Danh sách khóa học
          </Link>
        </div>

        <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{test?.name}</h1>
              <p className="mt-1 text-sm text-slate-600">
                {test?.course?.name ? `Khóa học: ${test.course.name}` : `Loại đề: ${getAssessmentModeLabel(test?.assessmentMode || "STANDARD")}`}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Ngôn ngữ: {test?.language?.name || test?.course?.language?.name || "Chưa gán"}
              </p>
            </div>
            <button onClick={openCreateModal} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white">
              Thêm câu hỏi
            </button>
          </div>

          <div className={`mt-4 rounded-lg border p-4 text-sm ${isTestReady(totalQuestionScore) ? "border-emerald-200 bg-emerald-50 text-emerald-700" : remainingScore > 0 ? "border-amber-200 bg-amber-50 text-amber-700" : "border-red-200 bg-red-50 text-red-700"}`}>
            Tổng điểm hiện tại: <strong>{totalQuestionScore}</strong> / {FIXED_TEST_MAX_SCORE}. {isTestReady(totalQuestionScore) ? "Đề đã hợp lệ để sử dụng." : remainingScore > 0 ? `Còn thiếu ${remainingScore} điểm.` : `Vượt ${Math.abs(remainingScore)} điểm, cần giảm xuống ${FIXED_TEST_MAX_SCORE}.`}
          </div>
        </div>

        {pageError ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {pageError}
          </div>
        ) : null}

        {questions.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-600">
            Chưa có câu hỏi nào
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((question, index) => (
              <QuestionCard key={question.id} question={question} index={index} onEdit={openEditModal} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>

      <QuestionModal
        show={showModal}
        isEditing={Boolean(editingQuestion)}
        form={questionForm}
        onClose={() => {
          setShowModal(false);
          setEditingQuestion(null);
        }}
        onSubmit={handleSubmit}
        setForm={(updater) => setQuestionForm((prev) => updater(prev))}
      />
    </div>
  );
}
